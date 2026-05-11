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
  "http-stateless": { type: "boolean" },
  "http-json": { type: "boolean" },
  "http-sse": { type: "boolean" },
  "http-allow-network": { type: "boolean" },
};

export function parseArgs(argv = process.argv) {
  const { values } = nodeParseArgs({
    args: argv.slice(2),
    options: CLI_OPTIONS,
    strict: false,
    allowPositionals: true,
  });
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
    httpStateless: !!values["http-stateless"],
    httpJson: !!values["http-json"],
    httpSse: !!values["http-sse"],
    httpAllowNetwork: !!values["http-allow-network"],
  };
}
