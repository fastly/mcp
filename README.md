# Fastly MCP Server

The Fastly MCP server lets MCP clients work with the Fastly API.

Connect it to an assistant such as Claude Desktop, Claude Code, Gemini CLI, Opencode, Qwen Code, Cline, or Swival, give it a Fastly API token, and the assistant can look up services, inspect domains and TLS settings, check traffic and usage, manage dictionaries and ACLs, purge content, and make configuration changes when you ask it to.

This project is actively developed and has Tier 1 Fastly open-source support.

The support policy is described in Fastly's [open-source documentation](https://www.fastly.com/documentation/developers/community/open-source/#understanding-topics-and-support-levels).

Questions and feedback are welcome on the [Fastly developer tools community forum](https://community.fastly.com/c/developer-tools/25).

## How it works

Most MCP servers expose one tool for each operation.

Because Fastly's API is large, this server uses a smaller set of tools that an assistant can use together.

Start with `search` to find API methods by keyword, method name, API class, or HTTP path.

Then use `inspect` to get a method's documentation, including its parameters, return type, and an example.

Once you have the details, use `execute` to run a short JavaScript snippet with the `Fastly` client already set up with your API token.

This keeps the tool list small while still covering every method documented in the bundled Fastly client docs.

## Requirements

The examples use [Bun](https://bun.sh/) and `bunx`, which downloads and runs the package without a global install.

You can also use Node.js 24.12 or newer.

Use the full command, `bunx -p @fastly/mcp fastly-mcp`, because the package's command is named `fastly-mcp`.

This prevents `bunx` from picking up an unrelated `mcp` command on your `PATH`.

If you use `npx`, run `npx -p @fastly/mcp fastly-mcp` for the same reason.

You also need a [Fastly API token](https://docs.fastly.com/en/guides/using-api-tokens).

For everyday use, create the narrowest token that fits the work you expect the assistant to do.

Start with a read-only token for investigation and reporting.

Use a token with write access only when you actually want the assistant to make changes.

Keep the token in your MCP client configuration or shell environment as `FASTLY_API_TOKEN`.

Do not paste production tokens into prompts or commit them into a repository.

## Installation

Most MCP clients accept a JSON block that describes how to start a server.

For example, this configuration runs the server with `bunx` and passes the API token through the environment:

```json
{
  "mcpServers": {
    "fastly": {
      "command": "bunx",
      "args": ["-p", "@fastly/mcp", "fastly-mcp"],
      "env": {
        "FASTLY_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

If you already export `FASTLY_API_TOKEN` in the shell that starts your MCP client, you can generally omit the `env` block (some agents may still require it, though).

Keeping the token in the client configuration is often simpler for desktop apps, while shell environment variables are often cleaner for terminal tools.

### Claude Code

Run the server through `bunx`:

```sh
claude mcp add fastly -- bunx -p @fastly/mcp fastly-mcp
```

Then make sure `FASTLY_API_TOKEN` is available in the environment where Claude Code starts, or configure the token through your normal Claude Code MCP settings.

### Claude Desktop

Add the generic JSON block above to Claude Desktop's configuration file.

On macOS the file is usually `~/Library/Application Support/Claude/claude_desktop_config.json`.

On Windows it is usually `%APPDATA%\Claude\claude_desktop_config.json`.

On Linux it is usually `~/.config/Claude/claude_desktop_config.json`.

Restart Claude Desktop after changing the file.

### Gemini CLI

Add the generic JSON block to `~/.gemini/settings.json`.

If Gemini CLI is started from a shell that already exports `FASTLY_API_TOKEN`, you can leave the token out of the JSON.

### Opencode

Opencode uses a slightly different shape. Put this in `opencode.json` in your project, or in `~/.config/opencode/opencode.json` for a global server:

```json
{
  "mcp": {
    "fastly": {
      "type": "local",
      "command": ["bunx", "-p", "@fastly/mcp", "fastly-mcp"],
      "environment": {
        "FASTLY_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Qwen Code

Add the generic JSON block to `~/.qwen/settings.json`, or to `.qwen/settings.json` in a specific project.

### Cline

Open Cline MCP settings, choose the global or project MCP configuration, and paste the generic JSON block.

### Swival

Add this to `swival.toml` in your project:

```toml
[mcp_servers.fastly]
command = "bunx"
args = ["-p", "@fastly/mcp", "fastly-mcp"]
env = { FASTLY_API_TOKEN = "your-token-here" }
```

If `FASTLY_API_TOKEN` is already set in the environment where Swival runs, the `env` line is optional.

Swival can also read the generic JSON block from `.swival/mcp.json`.

## Running over HTTP

By default the server speaks MCP over stdio, which is what every desktop and CLI client expects.

To share one server across clients or reach it remotely, start it in HTTP mode:

```sh
bunx -p @fastly/mcp fastly-mcp --transport http
```

That listens on `http://127.0.0.1:8231/mcp`. Loopback-only by default, no auth.

Then configure your client with the server's URL:

```json
{
  "mcpServers": {
    "fastly": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:8231/mcp"
    }
  }
}
```

The exact shape varies by client; check your client's documentation for the streamable-http entry format.

Nothing is kept between requests, so the server sits behind a load balancer without any sticky-session configuration.

### Security notes

Code runs in Node when it's installed, even if Bun runs the server.

With Node, file access is limited to the server installation and certificate files.

Without Node, local use falls back to Bun with a warning.
But if Node is installed and is broken or unsupported, the server won't start.

Even when you run the server locally, malicious text in Fastly API responses can trick an assistant into running harmful code.

If that code escapes the sandbox, it could reach your files or other users' tokens, so only share a server with people you trust.

Bun 1.3.11 has known escapes, so planned remote execution will require Node.
See [SECURITY.md](SECURITY.md#execution-trust-boundary) for details.

Whoever runs a remote server can also read and use any Fastly token you send it.

The HTTP server also has a few safeguards:

- The server binds to `127.0.0.1` unless you say otherwise.

  Any non-loopback bind (a specific LAN address, `0.0.0.0`, or `--http-allow-network`) refuses to start without an auth token.

- Set the auth token through `FASTLY_MCP_HTTP_AUTH_TOKEN` rather than `--http-auth-token`.

  The CLI flag works, but it lands in shell history and shows up in `ps`.

  With the token set, every request except `OPTIONS` preflights and `GET /healthz` must carry `Authorization: Bearer <token>`.

- Requests with an `Origin` header that is not on the allowlist (set with `--http-allow-origin`, repeatable, or `FASTLY_MCP_HTTP_ALLOW_ORIGIN` as a comma-separated list) get `403`.

  Browser-based clients have to opt in. Native clients and `curl` do not send `Origin` and pass through.

- The `Host` header is also validated.

  Off-loopback binds will reject requests whose `Host` does not match the bound interface, which is a small but useful guard against DNS rebinding.

- There is no built-in TLS. Run the server behind a reverse proxy (or an ssh tunnel) when you want HTTPS.

### `Authorization: Bearer` on the loopback

You can set `FASTLY_MCP_HTTP_AUTH_TOKEN` even on a loopback bind.

There is no security harm in doing so, and it makes the configuration portable to a non-loopback deploy later.

### Run `--help` for the full flag list

Every flag described above shows up in `bunx -p @fastly/mcp fastly-mcp --help`.

## Using the server well

A Fastly API token can expose real production configuration, and write-capable tokens can change it.

The server does not guess your intent, so the safest workflow is to be explicit about whether the assistant may change anything.

For read-only work, say that directly.

For example, ask the assistant to list services, find the active version for a service, summarize backends, check TLS status, inspect logging endpoints, or report recent traffic without making changes.

For changes, start by naming the service, domain, version, dictionary, ACL, or backend the assistant should work on.

Then ask it to show the method it plans to call before making the change.

If the change affects service configuration, it is often better to clone a service version, edit the clone, show you the diff or summary, and activate only after you approve.

Good first prompts look like this:

```text
List my Fastly services and show the active version for each one. Do not make changes.

Find the service serving www.example.com and summarize its domains, backends, and health checks.

Inspect the API method for purging one URL, then show me the exact call you would make before running it.

Clone the active version of service ABC123, add a backend named origin-api, and stop before activation.
```

If an answer looks too broad, ask the assistant to narrow the result in code before returning it.

Large Fastly responses are summarized automatically, but targeted calls are easier to review and less likely to leak irrelevant information.

## Secret encryption

Fastly API responses can contain credentials, keys, or other sensitive values.

By default, the server returns API output to the MCP client as it came back from Fastly.

If you want an additional layer of protection before tool output reaches the model, enable secret encryption.

When encryption is enabled, recognized token formats are replaced with encrypted stand-ins before they are returned to the assistant.

These replacements keep the same general shape and stay consistent during the server session, so the assistant can refer to them in later calls.

When those values appear in a later `execute` call, the server decrypts them before running the code.

To enable encryption in an MCP configuration that uses `bunx`, add `--encrypt-secrets` after the binary name:

```json
{
  "mcpServers": {
    "fastly": {
      "command": "bunx",
      "args": ["-p", "@fastly/mcp", "fastly-mcp", "--encrypt-secrets"],
      "env": {
        "FASTLY_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

You can also enable it with an environment variable:

```json
{
  "mcpServers": {
    "fastly": {
      "command": "bunx",
      "args": ["-p", "@fastly/mcp", "fastly-mcp"],
      "env": {
        "FASTLY_API_TOKEN": "your-token-here",
        "FASTLY_MCP_ENCRYPT_SECRETS": "true"
      }
    }
  }
}
```

By default, the encryption key is generated when the server starts.

Because decryption uses a table built in memory, only the server session that encrypted a value can recover the original secret.

After a restart, old encrypted values can no longer be decrypted, even if the key is pinned.

Setting `FASTLY_MCP_ENCRYPT_KEY` to exactly 32 hex characters, which is a 16-byte key, keeps the encrypted forms stable across restarts, but it does not bring old values back.

You can also set `FASTLY_MCP_ENCRYPT_TWEAK` if you want a separate tweak value for domain separation.

Secret encryption is a safety feature, not a complete data classification system.
It only encrypts values that match known token patterns.

You should still use least-privilege Fastly tokens and avoid asking the assistant to retrieve secrets unless the task requires it.

## Troubleshooting

If the server starts but Fastly API calls fail, check that `FASTLY_API_TOKEN` is set in the environment seen by the MCP server.

Search and inspect still work without a token because they use bundled documentation, but real API calls need one.

A failed call reports what the API said, so the answer is usually in the tool output itself:

```json
{
  "error": "HTTP 401 Unauthorized",
  "status": 401,
  "body": "{\"msg\":\"Provided credentials are missing or invalid\"}",
  "hint": "Fastly rejected the API token. Check that FASTLY_API_TOKEN is current and has not been revoked."
}
```

The hint on a 401 or 403 distinguishes the three cases that need different fixes: no token reached the server, Fastly refused the token it got, or the token is valid but not allowed to perform that operation.

These fields are also available inside `execute`, so a snippet can catch a failure and read `e.status` or `e.body` itself.

If the assistant cannot find the right method, ask it to use broader search terms such as `service`, `domain`, `backend`, `purge`, `tls`, `logging`, `dictionary`, `acl`, `vcl`, `stats`, or a fragment of the HTTP path from Fastly's API docs.

If a result is unexpectedly empty, ask the assistant to return the raw API response first.

Fastly client methods return values directly, not inside a `.result` wrapper.

If a response is shortened, ask the assistant to filter, page, or select fields in the JavaScript code it runs.

This happens because the server summarizes large arrays and objects to keep tool responses manageable.

Since each `execute` call has a 30-second limit, split the work into smaller calls if it times out.

## Local development

The server entry point is `src/index.js`. Bun is the primary development runtime:

```sh
bun run src/index.js
```

The main checks are:

```sh
bun test
bun run lint
```

Install both Bun and Node to run the tests.

The known Bun 1.3.11 bug is marked as an expected failure so fixes in future versions get noticed.

The API documentation in `docs/` is generated from the Fastly JavaScript client and is used to build the search index at startup.

Regenerate it with:

```sh
bun run update-docs
```

## Security

Please report security issues through Fastly's [security issue reporting process](https://www.fastly.com/security/report-security-issue), as described in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE) for details.
