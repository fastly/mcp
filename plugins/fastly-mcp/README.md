# Fastly MCP plugin

This plugin connects your assistant to the Fastly API through an MCP server running on your computer.
It provides three tools: `search` finds API methods, `inspect` explains a method's parameters, and `execute` runs a short JavaScript snippet with the Fastly client already configured.

Install [Bun](https://bun.sh/) and Node.js 24.12.0 or newer, and make sure `bunx` and `node` are available to your MCP client.
The launch configuration downloads the pinned `@fastly/mcp@2.2.0` package through `bunx`.
An initial download and Fastly API calls require network access.

## Connect your account

Create a [Fastly API token](https://www.fastly.com/documentation/reference/api/auth-tokens/) with the permissions needed for your work.
A read-only token is a good starting point for investigation and reporting.

Configure `FASTLY_API_TOKEN` in your client's local credential settings or in the environment that starts the client.
For Codex, the included overlay declares this variable so Codex can forward it to the server.
The plugin does not contain a token or run a credential prompt.
Keep your token out of chat, the plugin files, and version control.

Install this directory in a client that supports local Agent Plugins and stdio MCP servers.
For Codex, the repository includes an opt-in `fastly-local` marketplace at `.agents/plugins/marketplace.json`.
Select `fastly-mcp` from that marketplace in your client's plugin installation flow.

With Codex CLI, run these commands from the repository root:

```sh
codex plugin marketplace add "$PWD"
codex plugin add fastly-mcp@fastly-local
```

Restart Codex from an environment where `FASTLY_API_TOKEN` is set.
The local installation and credential forwarding were verified with Codex 0.159.2.

The server starts with stdio transport and secret encryption enabled.
Recognized secrets in tool output are replaced with encrypted values that the server can reuse in later calls.
Encryption does not reduce the permissions of your Fastly token.

## Try it

Ask your assistant to list your Fastly services without making changes.
It can find `ServiceApi.listServices` with `search` and execute:

```javascript
return await serviceApi.listServices();
```

For a configuration change, name the service and version, ask to see the planned method and arguments, and approve the call before execution.
A write-capable token can modify production resources.
The server runs code supplied by your assistant, so use it with a trusted local client.

Large results may be saved as JSON files on your computer.
The tool response includes the path and a preview when that happens.
Clients that cannot read local files should request fewer fields or smaller pages.

Report bugs through the [repository issue tracker](https://github.com/fastly/mcp/issues).
Fastly's [privacy policy](https://www.fastly.com/privacy) and [terms of service](https://www.fastly.com/terms) describe its applicable policies and service terms.
