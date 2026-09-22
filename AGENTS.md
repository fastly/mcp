## Workflow

- install: `bun install --frozen-lockfile`
- test all: `bun test`
- test file: `bun test <test-file>`
- test case: `bun test --test-name-pattern '<test-name>' <test-file>`
- lint: `bun run lint`
- format: `bun run format`; lint and format fixes: `bun run lint:fix`
- after every edit: `bun test && bun run lint`
- debug: Use Bun and keep Node.js 24.12.0 or newer installed. `FASTLY_API_TOKEN=your-token bun run start`; `FASTLY_API_TOKEN=your-token bun run start:node`; `FASTLY_API_TOKEN=your-token bun run start:http`; `FASTLY_API_TOKEN=your-token FASTLY_MCP_HTTP_AUTH_TOKEN=dev-token bun run src/index.js --transport http`; `bun src/index.js --help`; `bun src/index.js --version`; `curl http://127.0.0.1:8231/healthz`. `FASTLY_MCP_TRANSPORT`, `FASTLY_MCP_HTTP_PORT`, `FASTLY_MCP_HTTP_ALLOW_ORIGIN`, `FASTLY_MCP_HTTP_AUTH_TOKEN`, `FASTLY_MCP_ENCRYPT_SECRETS`, `FASTLY_MCP_ENCRYPT_KEY`, and `FASTLY_MCP_ENCRYPT_TWEAK` configure the server; do not enable an Inspector for `--remote-http`, including through `NODE_OPTIONS` or Bun options.

## Conventions

- Keep the public MCP surface to `search`, `inspect`, and `execute`. The intended assistant flow is search, inspect only when full call details are needed, then focused JavaScript execution.
- `execute` snippets must use `return`; console output is separate from the result, and Fastly methods return values directly rather than through `.result`. Use pre-instantiated camel-case globals such as `serviceApi`, `statsApi`, `purgeApi`, and `tlsCertificatesApi` in project-facing examples and generated usage.
- Preserve result contracts: `search` and `inspect` return `{ ok: true, ... }` or `{ ok: false, error }`, while `execute` returns `{ result, ... }` or `{ error, outcome? }`. Omit inapplicable optional fields instead of using `null`, and never expose the internal `outcome` field through the MCP execute response.
- Keep discovery two-tiered: `search` returns a compact projection, including ready-to-run `usage`, while `inspect` supplies full descriptions, parameters, return types, constraints, and examples. A valid search with no matches still succeeds with an empty result and guidance.
- Local and remote HTTP modes are distinct security and capability models. Local mode uses the process `FASTLY_API_TOKEN`, permits sandbox `fetch`, and exposes the full index; `--remote-http` requires a caller `Fastly-Key`, derives mandatory per-caller secret protection, disallows fetch and file access, and must not be used to isolate mutually untrusted users.
- Keep remote policy consistent across discovery and execution by updating `src/method-policy.js`; a remotely denied operation must be hidden and refused. In remote mode, lower layers must not read `process.env.FASTLY_API_TOKEN`; pass validated request authority explicitly from `main.js`.
- Preserve composition-root authority and factory injection. System dependencies, credentials, clocks, timers, fetch implementations, sinks, and test overrides enter through `main.js` or factory options, never through caller-controlled flags, request data, or hidden global state.
- Every external-work path needs a bound and cleanup for success, failure, timeout, and cancellation. Preserve byte, size, deadline, concurrency, and queue limits, and release timers, abort listeners, permits, streams, child processes, and cached in-flight state on every path.
- HTTP defaults are loopback `127.0.0.1`, port `8231`, and `/mcp`; `--http-json` and `--http-sse` are mutually exclusive and affect only modern 2026-07-28 exchanges, while the 2025 fallback always uses SSE. Modern requests need `Mcp-Method` and `Mcp-Name` for `tools/call`; preserve the matching header/body validation and CORS allow-list entries.
- Remote tests inject fake Fastly endpoints and host checks through code-only `runCli({ overrides })` seams. Never add a CLI flag or environment variable that weakens those checks; macOS skips Linux hardening coverage, so execution-profile release qualification also needs Linux/Docker coverage.
- `docs/*Api.md` is generated input for the runtime index, not executable sandbox guidance. Do not copy upstream `apiInstance` promise examples; regenerate documentation with `bun run update-docs` rather than editing generated API docs by hand.

## Commit & Pull Request Guidelines

Commit subjects are short, single-line, mostly imperative phrases, generally capitalized and without terminal punctuation; scopes are optional rather than conventional. Use a narrow prefix only when it clarifies the area, as in `update-docs: better regex`; representative subjects are `Improve remote HTTP guide`, `Add remote HTTP mode`, and `Limit request rates and execution queues`.

No pull-request template exists. Describe the behavioral or security impact, list the validation actually run, link a relevant issue when one exists, and include a CLI, MCP, or output example when the user-visible interface changes.
