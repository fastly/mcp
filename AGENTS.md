## Workflow

- install: `bun install`
- test all: `bun test`
- test file: `bun test <test-file>`
- test case: `bun test <test-file> -t "<test-name>"`
- lint: `bun run lint`
- format: `bun run format`
- after every edit: `bun test && bun run lint`
- debug: `FASTLY_API_TOKEN=your-token bun run start`; `FASTLY_API_TOKEN=your-token bun run start:node`; `FASTLY_API_TOKEN=your-token bun run start:http`; `FASTLY_API_TOKEN=your-token FASTLY_MCP_HTTP_AUTH_TOKEN=dev-token bun run src/index.js --transport http`; `curl http://127.0.0.1:8231/healthz`

## Conventions

- Keep the public MCP surface to `search`, `inspect`, and `execute`; do not add one tool per Fastly API endpoint. The expected assistant flow is search first, inspect for call details, then execute focused JavaScript.
- `execute` snippets must use `return`; console output is captured separately and is not the result. Fastly client methods return values directly, not inside `.result`.
- Prefer sandbox globals like `serviceApi`, `statsApi`, `purgeApi`, and `tlsCertificatesApi` over `new Fastly.ServiceApi()` in examples and generated usage.
- `search` results stay compact: discovery fields only, with full `description`, `params`, `returnType`, and `example` reserved for `inspect`.
- `search` and `inspect` must work without `FASTLY_API_TOKEN`; real API calls through `execute` need it.
- Everything thrown inside the sandbox, on either side of the host bridge, goes through `describeThrown` in `src/errors.js`. The Fastly client rejects with a plain object rather than an `Error`, so `String(err)` or a bare `err.message` silently turns a 401 into `[object Object]`. Failures reach the model as `{error, status, statusText, body, hint}`.
- When secret encryption is enabled, decrypt input strings before handlers and re-encrypt text output before returning it.
- HTTP defaults are loopback `127.0.0.1`, port `8231`, path `/mcp`, and `auto` response framing; `--http-json` and `--http-sse` pin the framing and are mutually exclusive, and non-loopback/network binds require auth. Both flags reach the 2026 leg only — the 2025 fallback always answers with SSE.
- The server speaks the `2026-07-28` revision plus the 2025 family. There are no sessions in either era: `createMcpHandler` serves the modern path and falls back to per-request stateless serving for 2025 clients, both off the same `createMcpServer` factory.
- Modern requests must carry `Mcp-Method` (and `Mcp-Name` on `tools/call`); the server rejects a request whose headers and body disagree. Keep those two on the CORS allow-headers list.
- `docs/*Api.md` are generated inputs to the runtime index. Regenerate with `bun run update-docs` rather than hand-editing generated API docs.

## Commit & Pull Request Guidelines

Commit subjects are short, sentence-case, mostly imperative/present-tense, and unscoped; do not use Conventional Commit prefixes unless the repo changes style. Examples: `Add support for HTTP`, `Add --help and --version`, `Surface Fastly API error details instead of an empty object`.

No PR template is present. PR descriptions should briefly state the behavior change, note tests run such as `bun test && bun run lint`, link any relevant issue when one exists, and include examples only when CLI/MCP behavior or user-visible output changes.
