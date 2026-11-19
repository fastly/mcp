## Workflow

- install: `bun install --frozen-lockfile`
- test all: `bun test`
- test file: `bun test "./test/<file>.test.js"`
- test case: `bun test "./test/<file>.test.js" -t '<case name>'`
- lint: `bun run lint`
- format: `bun run format`
- after every edit: `bun run lint && bun test`
- debug: `bun run start`; `bun run start:node`; `bun run start:http` (`http://127.0.0.1:8231/mcp`); `bun run start:node --help`; `node --inspect=127.0.0.1:9229 src/index.js`; `node --inspect-brk=127.0.0.1:9229 src/index.js`. No checked-in launch config. Set `FASTLY_API_TOKEN` in the launch environment for live API calls; `search` and `inspect` need no token.

## Conventions

- Run workflow commands from the repo root on macOS with Bun and Node 24.12.0+ on `PATH`; a Bun server may launch a Node execution child, so shared and child code must not depend on Bun-only APIs. macOS skips Linux hardening tests.
- `bun run lint` checks formatting, lint, and import order without writing; use `bun run lint:fix` to apply Biome fixes. The server runs directly as ESM JavaScript, with no server build or standalone type-check.
- Keep `fastly` exactly pinned, sync `bun.lock` and `package-lock.json`, and run `bun run update-docs` on SDK bumps: generated Markdown drives runtime discovery. Check owned-class collisions in the index and execution child; Bun’s three-day dependency release-age rule applies to Biome.
- Register owned APIs in both `src/api-index.js` and `src/sandbox.js`, declare intentional SDK replacements, and use a single options object for arguments. Reuse `test/adapter-contract.js` for HTTP-backed adapters so discovery metadata matches callable behavior.
- Keep the wire shapes: `search` and `inspect` return `{ ok, ... }`; `execute` returns `result` or `error`; the server serializes these as MCP text and sets `isError`. Fastly methods called inside snippets return their values directly.
- Read local `FASTLY_API_TOKEN` through the injected environment in `src/main.js` and pass it explicitly. Remote mode uses the caller’s `Fastly-Key` instead, and execution children must not inherit the parent environment.
- For stable plugin updates, sync `plugins/fastly-mcp/plugin.json`, its `mcp.json` npm pin, and its README with the package version. Run `bun run package:plugin` separately; npm release CI doesn’t build the plugin ZIP.

## Commit & Pull Request Guidelines

Use short, imperative, plain-English subjects (roughly 20 characters at the median) without Conventional Commit prefixes, scopes, or issue IDs. Examples: `Update deps`, `Implement a compression advisor`, `Show request body fields and allowed values in inspect()`.

No PR template or documented PR format was found. Use a matching title, explain what changed and why, and report validation results; link related issues and include examples when they help reviewers, not as a requirement.
