// Measures how long the secret shield takes, under Node or Bun, whichever runs this script.
// Each case runs in its own process and is stopped after five seconds, since a slow scan can't be interrupted from inside.
//
// Usage:
//   node scripts/bench-secrets.js
//   bun scripts/bench-secrets.js
//   node scripts/bench-secrets.js --guard 100000   (used by test/secrets-adversarial.test.js)
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { BUILTIN_PATTERNS, scan, TokenEncryptor } from "fast-cipher/tokens";
import { SecretShield, shieldJson } from "../src/secrets.js";
import { truncateOutsideSecrets } from "../src/truncate.js";

const DEADLINE_MS = 5000;
const API_TOKEN = "synthetic-benchmark-token";
// Fake tokens, built at run time so secret scanners ignore this file.
const AWS_KEY = `AKIA${"B".repeat(16)}`;
const TOKENS = {
  "AWS key, 20": AWS_KEY,
  "GitHub PAT, 40": `ghp_${"A1b2".repeat(9)}`,
  "SendGrid, 69": `SG.${"a".repeat(22)}.${"b".repeat(43)}`,
  "Anthropic, 93": `sk-ant-api03-${"c".repeat(80)}`,
  "OpenAI, 200": `sk-proj-${"d".repeat(192)}`,
  "OpenAI, 512": `sk-proj-${"e".repeat(504)}`,
};

const repeatTo = (unit, size) =>
  unit.repeat(Math.ceil(size / unit.length)).slice(0, size);

// Texts that used to make the scanner very slow.
const ADVERSARIAL = {
  AKIA: (n) => repeatTo("AKIA", n),
  "AWS keys": (n) => repeatTo(AWS_KEY, n),
  AIza: (n) => repeatTo("AIza", n),
  "pypi-": (n) => repeatTo("pypi-", n),
  glc_: (n) => repeatTo("glc_", n),
  "glpat-": (n) => repeatTo("glpat-", n),
  vercel_: (n) => repeatTo("vercel_", n),
  "sk-proj-": (n) => repeatTo("sk-proj-", n),
  "sk-ant-api03-": (n) => repeatTo("sk-ant-api03-", n),
  "Slack + AWS keys": (n) => `xoxb-1-1-${repeatTo(AWS_KEY, n - 9)}`,
  "Slack + whole AWS keys": (n) =>
    `xoxb-1-1-${AWS_KEY.repeat(Math.floor((n - 9) / 20))}`.padEnd(n, " "),
  "Slack + Twilio keys": (n) =>
    `xoxb-1-1-${repeatTo(`SK${"a".repeat(32)}`, n - 9)}`,
  "Slack + AIza": (n) => `xoxb-1-1-${repeatTo("AIza", n - 9)}`,
  "Slack user + glc_": (n) => `xoxp-1-1-1-${repeatTo("glc_", n - 11)}`,
  "SendGrid + AIza": (n) => `SG.${repeatTo("AIza", n - 3)}`,
  mixed: (n) =>
    repeatTo("AKIAglc_AIzasbp_pypi-hf_SKnpm_vercel_sk-proj-xoxb-1-1-", n),
};

const SHAPE_BYTES = 200_000;
const jsonBytes = (value) => Buffer.byteLength(JSON.stringify(value));

// Keeps a running size, since measuring the whole array after each push would be very slow.
function grow(make, out = []) {
  let bytes = jsonBytes(out);
  while (bytes < SHAPE_BYTES) {
    const item = make(out.length);
    bytes += jsonBytes(item) + (out.length > 0 ? 1 : 0);
    out.push(item);
  }
  return out;
}

// Values of the same size in JSON, from one long string to many tiny ones.
const SHAPES = {
  "one string": () => "x".repeat(SHAPE_BYTES - 2),
  "one-character strings": () => grow(() => "a"),
  "8-character strings": () => grow((i) => `v${String(i).padStart(7, "0")}`),
  "distinct keys": () => {
    const out = {};
    let bytes = 2;
    for (let i = 0; bytes < SHAPE_BYTES; i++) {
      out[`k${i}`] = 0;
      bytes += jsonBytes(`k${i}`) + (i > 0 ? 3 : 2);
    }
    return out;
  },
  "records repeating their keys": () =>
    grow((i) => ({ id: i, name: "svc", active: true })),
  "budget used up among tiny strings": () =>
    grow(
      () => "a",
      Array.from({ length: 5000 }, (_, i) => `AKIA${String(i).padStart(16, "0")}`),
    ),
};

function time(fn) {
  const start = performance.now();
  let outcome = "ok";
  try {
    fn();
  } catch (error) {
    outcome = error.message;
  }
  return { ms: performance.now() - start, outcome };
}

function median(fn, runs) {
  fn();
  const times = [];
  for (let i = 0; i < runs; i++) times.push(time(fn).ms);
  times.sort((a, b) => a - b);
  return times[Math.floor(runs / 2)];
}

function withCaller(fn) {
  const shield = SecretShield.forCaller(API_TOKEN);
  try {
    return fn(shield);
  } finally {
    shield.destroy();
  }
}

function wrapCosts() {
  const encryptor = new TokenEncryptor(new Uint8Array(16).fill(7));
  const options = { maxTokenLength: 512 };
  const rows = {};
  for (const [name, token] of Object.entries(TOKENS)) {
    const wrapped = encryptor.encryptWrapped(token, options);
    const runs = token.length > 300 ? 50 : 300;
    const wrapUs =
      (median(() => {
        for (let i = 0; i < 10; i++) encryptor.encryptWrapped(token, options);
      }, runs / 10) *
        1000) /
      10;
    const unwrapUs =
      (median(() => {
        for (let i = 0; i < 10; i++) encryptor.decryptWrapped(wrapped, options);
      }, runs / 10) *
        1000) /
      10;
    rows[name] = `wrap ${wrapUs.toFixed(0)} us, unwrap ${unwrapUs.toFixed(0)} us`;
  }
  encryptor.destroy();
  return rows;
}

function inputCase(name) {
  const longest = withCaller((shield) => shield.encrypt(TOKENS["OpenAI, 512"]));
  const aws = withCaller((shield) => shield.encrypt(AWS_KEY));
  const fill = (wrapper, budget) =>
    Array(Math.floor(budget / (wrapper.length + 1)))
      .fill(wrapper)
      .join(" ");
  const text = {
    "maximum-length wrappers up to the budget": fill(longest, 38_000),
    "AWS-key wrappers up to the budget": fill(aws, 38_000),
    "maximum-length wrappers over the budget": fill(longest, 80_000),
  }[name];
  return withCaller((shield) => time(() => shield.decrypt(text, "code")));
}

function runCase(id) {
  const [kind, name, size] = id.split("|");
  switch (kind) {
    case "wrap":
      return wrapCosts();
    case "scan": {
      const text = ADVERSARIAL[name](Number(size));
      return time(() => scan(text, BUILTIN_PATTERNS));
    }
    case "remote": {
      const value = { comment: ADVERSARIAL[name](Number(size)) };
      return withCaller((shield) => time(() => shieldJson(value, shield)));
    }
    case "shape": {
      const value = SHAPES[name]();
      const ms = median(
        () => withCaller((shield) => shieldJson(value, shield)),
        7,
      );
      return { ms, outcome: "ok" };
    }
    case "input":
      return inputCase(name);
    default:
      throw new Error(`Unknown case ${id}`);
  }
}

function guard(size) {
  for (const make of Object.values(ADVERSARIAL)) {
    scan(make(2000), BUILTIN_PATTERNS);
  }
  // A scan that throws must fail the run, not count as fast.
  const elapsed = (fn) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };
  for (const [name, make] of Object.entries(ADVERSARIAL)) {
    const text = make(size);
    const scanMs = elapsed(() => scan(text, BUILTIN_PATTERNS));
    const truncateMs = elapsed(() => truncateOutsideSecrets(text, 2000));
    // The shield may refuse a text; only its speed matters here.
    const encrypt = withCaller((shield) => time(() => shield.encrypt(text)));
    process.stdout.write(
      `${JSON.stringify({ name, scanMs, truncateMs, encryptMs: encrypt.ms })}\n`,
    );
  }
}

function inChild(id) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      fileURLToPath(import.meta.url),
      "--case",
      id,
    ]);
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), DEADLINE_MS);
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (signal) return resolve({ killed: true });
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({ failed: `exit ${code}` });
      }
    });
  });
}

const show = (result) => {
  if (result.killed) return `killed at ${DEADLINE_MS / 1000} s`;
  if (result.failed) return result.failed;
  const ms = `${result.ms.toFixed(1)} ms`;
  return result.outcome === "ok" ? ms : `${ms} (${result.outcome})`;
};

async function main() {
  const runtime =
    typeof Bun === "undefined" ? `Node ${process.version}` : `Bun ${Bun.version}`;
  console.log(`Secret shield benchmark under ${runtime}\n`);

  console.log("Wrap and unwrap, one encryptor, warm:");
  for (const [name, row] of Object.entries(await inChild("wrap"))) {
    console.log(`  ${name.padEnd(16)} ${row}`);
  }

  const sizes = [1024, 4096, 16384, 102400];
  console.log(`\nscan() on adversarial text, at ${sizes.map((s) => `${s / 1024} KB`).join(", ")}:`);
  for (const name of Object.keys(ADVERSARIAL)) {
    const cells = [];
    for (const size of sizes) {
      if (cells.at(-1)?.startsWith("killed")) {
        cells.push("skipped");
        continue;
      }
      cells.push(show(await inChild(`scan|${name}|${size}`)));
    }
    console.log(`  ${name.padEnd(24)} ${cells.map((c) => c.padStart(16)).join("")}`);
  }

  console.log("\nshieldJson() through SecretShield.forCaller() on a 100 KB adversarial result:");
  for (const name of Object.keys(ADVERSARIAL)) {
    console.log(`  ${name.padEnd(24)} ${show(await inChild(`remote|${name}|102400`))}`);
  }

  console.log(`\nshieldJson() through SecretShield.forCaller() on ${SHAPE_BYTES / 1000} KB values, median of 7:`);
  for (const name of Object.keys(SHAPES)) {
    console.log(`  ${name.padEnd(36)} ${show(await inChild(`shape|${name}`))}`);
  }

  console.log("\ndecrypt() through SecretShield.forCaller():");
  for (const name of [
    "maximum-length wrappers up to the budget",
    "AWS-key wrappers up to the budget",
    "maximum-length wrappers over the budget",
  ]) {
    console.log(`  ${name.padEnd(42)} ${show(await inChild(`input|${name}`))}`);
  }
}

const args = process.argv.slice(2);
if (args[0] === "--case") {
  process.stdout.write(JSON.stringify(runCase(args[1])));
} else if (args[0] === "--guard") {
  guard(Number(args[1]));
} else {
  await main();
}
