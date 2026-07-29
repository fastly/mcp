import { parseArgs as nodeParseArgs } from "node:util";

export const CLI_OPTIONS = {
  "encrypt-secrets": { type: "boolean" },
  "encrypt-key": { type: "string" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "V" },
  transport: { type: "string" },
  "http-host": { type: "string" },
  "http-port": { type: "string" },
  "http-path": { type: "string" },
  "http-allow-origin": { type: "string", multiple: true },
  "http-allow-host": { type: "string", multiple: true },
  "http-auth-token": { type: "string" },
  "http-json": { type: "boolean" },
  "http-sse": { type: "boolean" },
  "http-allow-network": { type: "boolean" },
};

const FLAG_NAMES = new Set([
  ...Object.keys(CLI_OPTIONS).map((k) => `--${k}`),
  "-h",
  "-V",
]);

function rejectFlagShapedValue(optionName, value) {
  if (typeof value !== "string") return;
  if (FLAG_NAMES.has(value)) {
    throw new Error(
      `--${optionName} expects a value but got "${value}", which is itself a flag. ` +
        `Use --${optionName}=<value> to pass a literal value that starts with a dash.`,
    );
  }
}

export function parseArgs(argv = process.argv) {
  const { values } = nodeParseArgs({
    args: argv.slice(2),
    options: CLI_OPTIONS,
    strict: true,
    allowPositionals: true,
  });
  for (const [name, def] of Object.entries(CLI_OPTIONS)) {
    if (def.type !== "string") continue;
    const v = values[name];
    if (def.multiple && Array.isArray(v)) {
      for (const item of v) rejectFlagShapedValue(name, item);
    } else {
      rejectFlagShapedValue(name, v);
    }
  }
  return {
    encryptSecrets: !!values["encrypt-secrets"],
    encryptKey: values["encrypt-key"],
    help: !!values.help,
    version: !!values.version,
    transport: values.transport,
    httpHost: values["http-host"],
    httpPort: values["http-port"],
    httpPath: values["http-path"],
    httpAllowOrigins: values["http-allow-origin"] ?? [],
    httpAllowHosts: values["http-allow-host"] ?? [],
    httpAuthToken: values["http-auth-token"],
    httpJson: !!values["http-json"],
    httpSse: !!values["http-sse"],
    httpAllowNetwork: !!values["http-allow-network"],
  };
}
