import { spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  accessSync,
  constants,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { connect } from "node:net";
import { disconnectSignal } from "./http.js";

const YAMA_PATH = "/proc/sys/kernel/yama/ptrace_scope";
const PRLIMIT_CANDIDATES = [
  "/usr/bin/prlimit",
  "/bin/prlimit",
  "/usr/sbin/prlimit",
  "/sbin/prlimit",
];
const OOM_SCORE_ADJ_MAX = "1000";

/**
 * Executions run as children of the process that holds every in-flight
 * Fastly token.
 * Without Yama, one of them could ptrace the parent or a sibling and read
 * its memory.
 * Changing the sysctl is up to the operator, never the service.
 */
export function requireYama({ readFile = readFileSync } = {}) {
  let text;
  try {
    text = String(readFile(YAMA_PATH, "utf8")).trim();
  } catch {
    throw new Error(
      `Remote mode needs the Yama ptrace restriction, but ${YAMA_PATH} cannot be read. ` +
        "Run on a Linux kernel with Yama enabled and set kernel.yama.ptrace_scope to 1 or higher.",
    );
  }
  if (!["1", "2", "3"].includes(text)) {
    throw new Error(
      `Remote mode needs kernel.yama.ptrace_scope to be 1, 2 or 3, but it is "${text}". ` +
        "Set it on the host with sysctl (containers share the host's value).",
    );
  }
  return Number(text);
}

// Anything that looks like an Inspector option is refused without parsing
// it, whichever runtime's variable it sits in and however it is quoted.
// A text check is also the only way to catch it under Bun, whose
// node:inspector reports no URL even while its Inspector is listening.
const INSPECTOR_OPTION = /(?:^|[\s"])--(?:inspect|debug)(?:$|[-=\s"])/;

// The parent's flags can make --eval run this as an ES module, where
// require does not exist, so it uses import instead.
const SIGUSR1_PROBE = `
  import("node:inspector").then((inspector) => {
    const started = Date.now();
    const finish = (answer) => { process.stdout.write(answer); process.exit(0); };
    const poll = () => {
      if (inspector.url()) return finish("open");
      if (Date.now() - started > 1000) return finish("closed");
      setTimeout(poll, 10);
    };
    process.kill(process.pid, "SIGUSR1");
    poll();
  });
`;

function activeInspectorUrl() {
  try {
    return createRequire(import.meta.url)("node:inspector").url();
  } catch {
    return undefined;
  }
}

// Asks a Node process started like this one whether SIGUSR1 opens its
// Inspector.
// Node works that out from the command line and NODE_OPTIONS with its own
// quoting, alias and precedence rules, so asking beats copying its parser.
function sigusr1OpensInspector({ executable, execArgv, env }) {
  const probe = spawnSync(
    executable,
    [...execArgv, "--inspect-port=0", "--eval", SIGUSR1_PROBE],
    { env, encoding: "utf8", timeout: 10_000, windowsHide: true },
  );
  const answer = probe.stdout?.trim();
  if (probe.status !== 0 || (answer !== "open" && answer !== "closed")) {
    throw new Error(
      `Remote mode could not check how ${executable} handles SIGUSR1${probe.stderr ? `: ${probe.stderr.trim().split("\n")[0]}` : ""}`,
    );
  }
  return answer === "open";
}

/**
 * Refuses to start with a debugger that an execution child could reach.
 *
 * Children run under the same user, so they can send SIGUSR1, which opens
 * Node's Inspector unless it started with --disable-sigusr1.
 * Bun has no such signal handler but reads debugger settings from the
 * environment.
 */
export function requireNoInspector({
  versions = process.versions,
  execArgv = process.execArgv,
  env = process.env,
  executable = process.execPath,
  platform = process.platform,
  inspectorUrl = activeInspectorUrl,
  sigusr1Opens = sigusr1OpensInspector,
} = {}) {
  if (inspectorUrl()) {
    throw new Error(
      "Remote mode cannot run with an Inspector already listening. Start the server without a debugger.",
    );
  }
  const configured = [
    ...execArgv,
    env.NODE_OPTIONS ?? "",
    env.BUN_OPTIONS ?? "",
  ]
    .join(" ")
    .replaceAll("_", "-");
  if (INSPECTOR_OPTION.test(configured)) {
    throw new Error(
      "Remote mode cannot run with an Inspector option. Remove --inspect flags from the command line, NODE_OPTIONS and BUN_OPTIONS.",
    );
  }
  for (const name of Object.keys(env)) {
    if (name.startsWith("BUN_INSPECT")) {
      throw new Error(`Remote mode cannot run with ${name} set. Unset it.`);
    }
  }
  // Windows has no SIGUSR1, so there is nothing to ask there.
  if (
    !versions.bun &&
    platform !== "win32" &&
    sigusr1Opens({ executable, execArgv, env })
  ) {
    throw new Error(
      "Remote mode under Node.js needs --disable-sigusr1, so that a signal cannot open the Inspector. " +
        "Start with `node --disable-sigusr1` or add it to NODE_OPTIONS.",
    );
  }
}

function parseLimit(report, label) {
  const line = report.split("\n").find((entry) => entry.startsWith(label));
  const [soft, hard] = (line ?? "").slice(label.length).trim().split(/\s+/);
  return { soft: Number(soft), hard: Number(hard) };
}

/**
 * Finds util-linux prlimit and checks that it applies the requested limits.
 *
 * Only fixed system paths are searched, never PATH.
 * Running a probe under the limits and reading them back catches a missing
 * binary, a BusyBox lookalike and a hard limit that is already lower.
 */
export function resolvePrlimit(
  { dataBytes, cpuSeconds },
  { candidates = PRLIMIT_CANDIDATES, run = spawnSync } = {},
) {
  let path;
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      path = realpathSync(candidate);
      break;
    } catch {}
  }
  if (!path) {
    throw new Error(
      "Remote mode needs util-linux prlimit to cap execution memory and CPU, but it was not found. " +
        "Install the util-linux package (it is not part of slim or Alpine base images).",
    );
  }

  const args = prlimitArgs({ dataBytes, cpuSeconds });
  const probe = run(path, [...args, "cat", "/proc/self/limits"], {
    encoding: "utf8",
    timeout: 5000,
    env: {},
  });
  const data = parseLimit(probe.stdout ?? "", "Max data size");
  const cpu = parseLimit(probe.stdout ?? "", "Max cpu time");
  if (
    probe.status !== 0 ||
    data.soft !== dataBytes ||
    data.hard !== dataBytes ||
    cpu.soft !== cpuSeconds ||
    cpu.hard !== cpuSeconds
  ) {
    throw new Error(
      `Remote mode cannot enforce execution limits with ${path}: the limits it applied do not match the configured ones.`,
    );
  }
  return Object.freeze({ dataBytes, cpuSeconds, path });
}

export function prlimitArgs({ dataBytes, cpuSeconds }) {
  return [
    `--data=${dataBytes}:${dataBytes}`,
    `--cpu=${cpuSeconds}:${cpuSeconds}`,
    "--",
  ];
}

/**
 * Marks a child as the kernel's preferred OOM victim and checks that it took.
 *
 * The parent writes it so the child needs no write access to /proc under
 * Node's permission model.
 * Raising the score needs no privilege, and it survives prlimit's exec into
 * the runtime.
 */
export function preferAsOomVictim(
  pid,
  { readFile = readFileSync, writeFile = writeFileSync } = {},
) {
  const path = `/proc/${pid}/oom_score_adj`;
  writeFile(path, OOM_SCORE_ADJ_MAX);
  if (String(readFile(path, "utf8")).trim() !== OOM_SCORE_ADJ_MAX) {
    throw new Error("The child's OOM score adjustment did not take effect");
  }
}

/**
 * Checks that this runtime's HTTP server notices when a client hangs up.
 *
 * Cancelling the execution of a caller who left depends on it, and Bun 1.3.11
 * never emits `close` on the response (Bun 1.4.2 does).
 * A loopback exchange tests the real behavior instead of trusting a version
 * number.
 */
export async function requireDisconnectDetection({ timeoutMs = 500 } = {}) {
  const server = createServer((_req, res) => {
    disconnectSignal(res).addEventListener("abort", () =>
      server.emit("hangup"),
    );
    client.destroy();
  });
  let client;
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    client = connect(server.address().port, "127.0.0.1", () => {
      client.write("GET / HTTP/1.1\r\nHost: localhost\r\n\r\n");
    });
    client.on("error", () => {});
    await once(server, "hangup", { signal: AbortSignal.timeout(timeoutMs) });
    return true;
  } catch {
    throw new Error(
      "Remote mode needs an HTTP server that notices client disconnects, so abandoned executions can be cancelled, and this runtime does not. " +
        "Upgrade Bun (1.4.2 is known to work) or run the server with Node.js.",
    );
  } finally {
    client?.destroy();
    server.closeAllConnections?.();
    server.close();
  }
}
