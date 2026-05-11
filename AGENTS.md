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
- When secret encryption is enabled, decrypt input strings before handlers and re-encrypt text output before returning it.
- HTTP defaults are loopback `127.0.0.1`, port `8231`, path `/mcp`, stateful SSE; stateless implies JSON unless `--http-sse` is passed, and non-loopback/network binds require auth.
- `docs/*Api.md` are generated inputs to the runtime index. Regenerate with `bun run update-docs` rather than hand-editing generated API docs.

## Commit & Pull Request Guidelines

Commit subjects are short, sentence-case, mostly imperative/present-tense, and unscoped; do not use Conventional Commit prefixes unless the repo changes style. Examples: `Add support for HTTP`, `Add --help and --version`, `Surface Fastly API error details instead of an empty object`.

No PR template is present. PR descriptions should briefly state the behavior change, note tests run such as `bun test && bun run lint`, link any relevant issue when one exists, and include examples only when CLI/MCP behavior or user-visible output changes.
