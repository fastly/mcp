## Workflow

- install: `go mod download`
- install linter (one-time): `curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin`
- build: `make build`
- test all: `make test`
- test file: `go test -v ./<package-path>/`
- test case: `go test -v -run <TestName> ./<package-path>/`
- lint: `make lint`
- format: `make fmt`
- after every edit: `make fmt && make lint && make vet && make test`
- debug: `./bin/fastly-mcp list-commands`, `./bin/fastly-mcp describe service list`, `./bin/fastly-mcp execute '{"command":"version","args":[]}'`, `./bin/fastly-mcp --http :8080`

## Conventions

- Shared DTOs (`CommandRequest`, `CommandResponse`, `Flag`, etc.) live in `internal/types/` to break import cycles. Never add cross-package types to a domain package.
- Command execution returns `types.CommandResponse` structs, not `(result, error)`. Responses must include `Instructions`, `NextSteps`, and `Metadata` fields for AI agents.
- Use named error constructors (`ValidationError()`, `SetupError()`, `TimeoutError()`, `UserConfirmationError()`) from `internal/fastly/` instead of building `CommandResponse` ad hoc.
- Shared resources use `sync.Once` singletons with `Get<Thing>()` accessors (e.g., `cache.GetStore()`). Config is set via exported setters from `main.go`, not dependency injection.
- JSON struct tags use `snake_case` with `omitempty` on all optional fields.
- Tests use stdlib only (no testify), loop variable `tt`, `strings.Contains` for error matching, and `testing.Short()` to gate integration tests. All fixtures are inline.

## Commit & Pull Request Guidelines

Imperative mood, ≤60 chars, optional `package:` scope prefix. Examples: `cache: fix ResultStore.Get locking and reject negative offsets`, `Add suport for background streaming commands`, `Preserve default allowlist and restore MCP context extraction`.

No PR template. Branch from `main` as `feature/<name>`. PR description should clearly explain what changed and why. Run `make fmt && make lint && make vet && make test && make build` before submitting.
