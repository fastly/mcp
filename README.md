# Fastly MCP Server

[![Go Version](https://img.shields.io/badge/go-1.23+-blue.svg)](https://golang.org/dl/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/fastly/mcp?color=brightgreen)](https://github.com/fastly/mcp/releases)

> 🤖 **AI-powered Fastly management** - Securely control your CDN and edge compute infrastructure through natural language interactions with AI assistants.

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that provides AI agents with secure access to Fastly services. Ask your AI assistant to manage CDN configurations, deploy edge compute applications, analyze performance metrics, and more - all through simple conversational commands.

## ✨ What Can You Do?

With this MCP server, your AI assistant can:

- 📊 **Monitor Performance** - "Show me real-time traffic and cache hit ratios"
- 🌍 **Manage CDN** - "List my services and their domains"
- 🚀 **Deploy Changes** - "Update my backend configuration"
- 🔍 **Analyze Issues** - "Help me troubleshoot 5xx errors"
- 🛡️ **Control Security** - "Show my ACL rules and TLS certificates"

### Key Features

- **🔒 Security First**: Command allowlisting, input validation, and dangerous operation protection
- **🤖 AI-Optimized**: Full MCP protocol support for seamless AI integration
- **🔌 Flexible Transport**: Stdio (default), HTTP, and Server-Sent Events
- **📝 Smart Output**: Automatic pagination and truncation of large responses
- **🔐 Privacy Options**: Optional PII sanitization and token encryption

## 📚 Table of Contents

- [Fastly MCP Server](#fastly-mcp-server)
  - [✨ What Can You Do?](#-what-can-you-do)
    - [Key Features](#key-features)
  - [📚 Table of Contents](#-table-of-contents)
  - [📋 Prerequisites](#-prerequisites)
  - [📦 Installation](#-installation)
    - [Option 1: Pre-built Binaries](#option-1-pre-built-binaries)
    - [Option 2: Install with Go](#option-2-install-with-go)
    - [Option 3: Build from Source](#option-3-build-from-source)
  - [🚀 Quick Start](#-quick-start)
    - [Step 1: Authenticate with Fastly](#step-1-authenticate-with-fastly)
    - [Step 2: Configure Your AI Assistant](#step-2-configure-your-ai-assistant)
    - [Step 3: Start Managing Your CDN!](#step-3-start-managing-your-cdn)
      - [💡 Example Commands to Try:](#-example-commands-to-try)
  - [🔧 Available Tools](#-available-tools)
    - [📋 `fastly_list_commands`](#-fastly_list_commands)
    - [🔍 `fastly_describe`](#-fastly_describe)
    - [▶️ `fastly_execute`](#️-fastly_execute)
    - [🕰️ `current_time`](#️-current_time)
  - [🎮 Running Modes](#-running-modes)
    - [Stdio Mode (Default)](#stdio-mode-default)
    - [HTTP Mode](#http-mode)
    - [CLI Mode (Testing)](#cli-mode-testing)
  - [🔒 Security](#-security)
    - [🛡️ Command Execution Security](#️-command-execution-security)
    - [📊 Resource Limits](#-resource-limits)
    - [⚠️ Dangerous Operation Protection](#️-dangerous-operation-protection)
    - [🚫 Blocked Commands](#-blocked-commands)
    - [🛡️ Prompt Injection Protection](#️-prompt-injection-protection)
  - [⚙️ Configuration Options](#️-configuration-options)
    - [Custom Command Allowlist](#custom-command-allowlist)
    - [PII Sanitization (Optional)](#pii-sanitization-optional)
    - [Token Encryption (Optional)](#token-encryption-optional)
    - [Combining Options](#combining-options)
  - [🤖 Model Recommendations](#-model-recommendations)
  - [🔌 Custom AI Integration](#-custom-ai-integration)
  - [🛠️ Development](#️-development)
  - [🤝 Contributing](#-contributing)
  - [🔐 Security](#-security-1)
  - [📜 License](#-license)
  - [🙏 Acknowledgments](#-acknowledgments)
  - [Appendix: Recommended AI Assistant Prompt](#appendix-recommended-ai-assistant-prompt)
  - [Appendix: Example Prompts for Fastly MCP](#appendix-example-prompts-for-fastly-mcp)
    - [Service Overview \& Status](#service-overview--status)
    - [Performance Analytics \& Statistics](#performance-analytics--statistics)
    - [Global Infrastructure Insights](#global-infrastructure-insights)
    - [Configuration Audit \& Management](#configuration-audit--management)
    - [Security \& Access Control](#security--access-control)
    - [Real-time Monitoring](#real-time-monitoring)
    - [Operations \& Troubleshooting](#operations--troubleshooting)
    - [Optimization \& Recommendations](#optimization--recommendations)
    - [Capacity Planning \& Forecasting](#capacity-planning--forecasting)
    - [Advanced Analytics \& Insights](#advanced-analytics--insights)

## 📋 Prerequisites

Before getting started, ensure you have:

- ✅ **Go 1.23+** (for building from source)
- ✅ **[Fastly CLI](https://developer.fastly.com/reference/cli/)** installed and in your PATH
- ✅ **Fastly account** with CLI authenticated (via `fastly auth login`)

## 📦 Installation

Choose the installation method that works best for you:

### Option 1: Pre-built Binaries

Download the latest release for your platform:

<div align="center">

| Platform              | Download                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| macOS (Intel)         | [Download](https://github.com/fastly/mcp/releases/latest)                                       |
| macOS (Apple Silicon) | [Download](https://github.com/fastly/mcp/releases/latest)                                       |
| Linux (64-bit)        | [Download](https://github.com/fastly/mcp/releases/latest)                                       |
| Windows (64-bit)      | [Download](https://github.com/fastly/mcp/releases/latest)                                       |

</div>

After downloading:
```bash
# macOS/Linux: Make it executable
chmod +x fastly-mcp

# Move to a directory in your PATH (optional)
sudo mv fastly-mcp /usr/local/bin/
```

### Option 2: Install with Go

```bash
go install github.com/fastly/mcp/cmd/fastly-mcp@latest
```

### Option 3: Build from Source

```bash
git clone https://github.com/fastly/mcp.git
cd mcp
make build

# Binary will be at ./bin/fastly-mcp
```

## 🚀 Quick Start

Get up and running in just 3 steps!

### Step 1: Authenticate with Fastly

First, ensure the Fastly CLI is authenticated with your account:

```bash
fastly auth login
```

> 💡 **Note**: The MCP server uses your existing Fastly CLI authentication. No additional setup needed!

<details>
<summary>📁 Where are credentials stored?</summary>

- **macOS**: `~/Library/Application Support/fastly/config.toml`
- **Linux**: `~/.config/fastly/config.toml`
- **Windows**: `%APPDATA%\fastly\config.toml`
</details>

### Step 2: Configure Your AI Assistant

Choose your AI assistant and follow the configuration steps:

<details>
<summary><b>🦘 Roo Code</b></summary>

1. Click the **MCP** button in Roo Code
2. Select **"Edit Global MCP"** or **"Edit Project MCP"**
3. Add the following configuration:

```json
{
  "mcpServers": {
    "fastly": {
      "command": "/path/to/fastly-mcp",
      "args": []
    }
  }
}
```
</details>

<details>
<summary><b>🔧 Augment Code</b></summary>

Navigate to **Settings → MCP Servers → Add Server**, or edit the configuration directly:

```json
{
  "mcpServers": {
    "fastly": {
      "command": "/path/to/fastly-mcp",
      "args": []
    }
  }
}
```
</details>

<details>
<summary><b>🤖 Claude Desktop</b></summary>

Add to your Claude configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fastly": {
      "command": "/path/to/fastly-mcp",
      "args": []
    }
  }
}
```
</details>

<details>
<summary><b>💻 Claude Code</b></summary>

Simply run this command:

```bash
claude mcp add fastly /path/to/fastly-mcp
```
</details>

### Step 3: Start Managing Your CDN!

🎉 **You're all set!** Start by asking your AI assistant about your Fastly services:

```
👤 You: "Show me all my Fastly services"
🤖 Assistant: "I'll list all your Fastly services for you..."
```

#### 💡 Example Commands to Try:

- 📊 **"Show me performance metrics for my main service"**
- 🌐 **"List all domains and their SSL status"**
- 🚦 **"Check backend health for service ABC123"**
- 🧹 **"Help me purge cache for /api/* paths"**
- 📈 **"Analyze my cache hit ratios"**

<details>
<summary>⚠️ <b>Troubleshooting Quick Start Issues</b></summary>

**AI assistant doesn't see the Fastly tools?**
- Restart your AI application after configuration
- Verify the path to `fastly-mcp` is correct
- Check that the binary has execute permissions

**"Command not found" errors?**
- Ensure Fastly CLI is installed: `which fastly`
- Verify CLI is authenticated: `fastly whoami`
- Check PATH includes Fastly CLI location

**Permission denied errors?**
- Make binary executable: `chmod +x /path/to/fastly-mcp`
- Ensure your user has access to Fastly CLI config
</details>

## 🔧 Available Tools

The server provides four powerful tools for AI agents:

### 📋 `fastly_list_commands`
**Lists all available Fastly CLI commands**

```json
{
  "tool": "fastly_list_commands"
}
```

### 🔍 `fastly_describe`
**Gets detailed information about a specific command**

```json
{
  "tool": "fastly_describe",
  "arguments": {
    "command": "service list"
  }
}
```

### ▶️ `fastly_execute`
**Executes a Fastly CLI command with specified parameters**

```json
{
  "tool": "fastly_execute",
  "arguments": {
    "command": "service",
    "args": ["list"],
    "flags": [
      {"name": "json"}
    ]
  }
}
```

### 🕰️ `current_time`
**Returns the current time in multiple formats for temporal context**

```json
{
  "tool": "current_time"
}
```

<details>
<summary>Example response</summary>

```json
{
  "unix": 1736531400,
  "unix_milli": 1736531400000,
  "iso": "2025-01-10T18:30:00Z",
  "utc": "2025-01-10 18:30:00 UTC",
  "local": "2025-01-10 10:30:00 PST",
  "timezone": "PST",
  "time_offset": "-08:00"
}
```
</details>

## 🎮 Running Modes

### Stdio Mode (Default)
```sh
fastly-mcp
```

### HTTP Mode
```sh
# Default port 8080
fastly-mcp --http

# Custom port
fastly-mcp --http :9000

# With Server-Sent Events
fastly-mcp --http --sse
```

### CLI Mode (Testing)
```sh
# List commands
fastly-mcp list-commands

# Get help
fastly-mcp describe service list

# Execute command
fastly-mcp execute '{"command":"version","args":[]}'
```

## 🔒 Security

We've designed this server with multiple layers of security:

### 🛡️ Command Execution Security

- **🚫 No Shell Execution**: Commands run directly without shell interpretation
- **🏯 Process Isolation**: Direct execution prevents command injection
- **✅ Argument Validation**: All inputs validated against dangerous patterns
- **📁 Path Security**: Directory traversal prevention

### 📊 Resource Limits

- Maximum command length: 50 characters
- Maximum argument length: 100 characters per argument
- Maximum flag name length: 50 characters
- Maximum flag value length: 500 characters
- Maximum file path length: 256 characters
- Maximum output size: 50KB (truncated if larger)
- Maximum JSON array items: 100 (truncated if larger)
- Command execution timeout: 30 seconds

### ⚠️ Dangerous Operation Protection

These commands require explicit human approval via `--user-reviewed` flag:
- `delete` - Removes resources
- `purge` - Clears cache
- `create` - Creates resources
- `update` - Modifies resources
- `activate` - Deploys changes
- `deactivate` - Disables services
- `upload` - Uploads packages

**Human Confirmation Required**: AI agents must:
1. Present the command to you for review
2. Wait for your explicit approval
3. Only then add the `--user-reviewed` flag

Example after human approval:
```json
{
  "tool": "fastly_execute",
  "arguments": {
    "command": "service",
    "args": ["delete"],
    "flags": [
      {"name": "service-id", "value": "abc123"},
      {"name": "user-reviewed"}
    ]
  }
}
```

### 🚫 Blocked Commands

These commands are completely blocked for security:
- `auth-token` - Authentication token management
- `sso` - Single sign-on operations
- `profile` - Profile management

### 🛡️ Prompt Injection Protection

Comprehensive defenses against [prompt injection attacks](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/):

- Command allowlisting prevents arbitrary execution
- Shell metacharacter blocking (`;`, `|`, `&`, `` ` ``, `$`, etc.)
- Tool definitions cannot be modified at runtime
- Output sanitization strips ANSI sequences
- Structured responses prevent hidden content

## ⚙️ Configuration Options

### Custom Command Allowlist

Override the default allowed commands:

```sh
fastly-mcp --allowed-commands /path/to/allowed-commands.txt
```

Format (see `example-allowed-commands.txt`):
- One command per line
- Lines starting with `#` are comments
- Empty lines ignored

### PII Sanitization (Optional)

Remove sensitive data from outputs:

```sh
fastly-mcp --sanitize
```

What gets sanitized:
- API tokens and keys → `[REDACTED]`
- Email addresses → `u***@example.com`
- IP addresses → `[REDACTED-IP]`
- URLs with credentials → `https://[REDACTED-CREDENTIALS]@...`
- AWS/SSH keys → `[REDACTED-AWS-ACCESS-KEY]`
- JSON sensitive fields (password, secret, token)

⚠️ **Warning**: May redact service IDs and break automation workflows.

### Token Encryption (Optional)

Protect secrets from LLM exposure while maintaining functionality:

```sh
fastly-mcp --encrypt-tokens
```

How it works:
1. Detects hex tokens (32+ chars) and base64 secrets (20+ chars)
2. Encrypts using an ephemeral session key
3. Replaces with `[ENCRYPTED-TOKEN:xxxxx]` placeholders
4. Automatically decrypts when processing commands

### Combining Options

```sh
# All features
fastly-mcp --http --sanitize --encrypt-tokens --allowed-commands custom.txt

# HTTP with encryption
fastly-mcp --http :9000 --encrypt-tokens

# Testing with sanitization
fastly-mcp --sanitize execute '{"command":"service","args":["list"]}'
```

## 🤖 Model Recommendations

This server works best with Language Models optimized for:
- **Tool use and computer interaction**: Function calling and API interactions
- **Extended reasoning**: Enhanced thinking and planning capabilities
- **Structured output generation**: Well-formatted JSON and schema following

For best results, use models specifically optimized for agentic workflows and tool usage.

**Recommended Model**: Microsoft's MAI-DS-R1 is an excellent choice for use with the Fastly MCP server. It's open, free, and performs very well with MCP interactions and tool usage.

**Note**: At the time of writing, we do not recommend Gemini models as they are not optimized for tool usage and MCP interactions.

## 🔌 Custom AI Integration

For custom applications:

```python
import subprocess
import json

# Start the MCP server
process = subprocess.Popen(
    ['fastly-mcp'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True
)

# Send a command
request = {
    "method": "tools/call",
    "params": {
        "name": "fastly_list_commands"
    }
}
process.stdin.write(json.dumps(request) + '\n')
process.stdin.flush()

# Read response
response = json.loads(process.stdout.readline())
```

## 🛠️ Development

```sh
make build   # Build binary
make test    # Run all tests
make fmt     # Format code
make lint    # Run golangci-lint
make vet     # Static analysis
make clean   # Clean artifacts
make tidy    # Update dependencies
make help    # Show all commands
```

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## 🔐 Security

Found a security issue? Please report it according to our [security policy](SECURITY.md).

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/) specification
- Uses [mcp-go](https://github.com/mark3labs/mcp-go) library for MCP implementation
- Wraps the official [Fastly CLI](https://developer.fastly.com/reference/cli/)

## Appendix: Recommended AI Assistant Prompt

When integrating the Fastly MCP server with an AI assistant, we recommend using this concise system prompt for optimal results:

```
You have access to Fastly's CDN/edge platform via MCP tools that wrap the Fastly CLI.

#### Tools:
- **`fastly_list_commands`** - List available commands
- **`fastly_describe [command]`** - Get command details/parameters
- **`fastly_execute`** - Run commands with parameters
- **`current_time`** - Get timestamps

#### Core Operations:
- **Services**: Create/update/list CDN services, manage versions
- **Edge Config**: VCL, ACLs, dictionaries, Compute
- **Content**: Backends, domains, caching, purging
- **Security**: TLS, secrets, access controls
- **Monitoring**: Stats, logs, alerts

#### Critical Rules:
1. **ALWAYS use `fastly_describe` before executing any unfamiliar command**
2. **Destructive operations require `--user-reviewed: true`** flag after human approval:
   - `delete`, `remove`, `purge`, `create`, `update` commands
   - Always explain impact and get human confirmation first
3. **Use `--json` format** for parsing
4. **Most commands need `--service-id`**
5. **Clone versions before changes**
6. Use `current_time` before operations that need timestamps

#### Workflow:

~~~
# Discover
fastly_describe command="service list"

# Execute (safe)
fastly_execute command="service list" parameters={"format": "json"}

# Execute (destructive - needs human review)
fastly_execute command="cache purge" parameters={
  "service-id": "ABC123",
  "key": "/api/*",
  "user-reviewed": true
}
~~~

#### Constraints:
- 30s timeout, 50KB output limit
- No shell features (pipes/redirects)
- Auth management blocked
- Never execute commands without first understanding them via describe

**Priority**: Explain command impacts clearly. Production changes need explicit human approval.
```

The recommended role definition (for example to configure a dedicated mode in Roo Code) is `You are an expert in using, interpreting, optimizing and configuring the Fastly CDN services.`

## Appendix: Example Prompts for Fastly MCP

Here are example prompts you can use with your AI assistant to interact with Fastly services:

### Service Overview & Status
- "Show me a comprehensive dashboard of all my Fastly services with their current status, domains, and performance metrics"
- "Generate a visual summary of my service configuration including backends, domains, and cache settings"
- "Display service health overview with uptime, error rates, and active alerts across all my services"
- "Create a service topology map showing my backends, origins, and edge locations"
- "Show me which of my services are currently active vs inactive with deployment timestamps"

### Performance Analytics & Statistics
- "Generate a real-time performance dashboard showing requests per second, bandwidth, and cache hit ratios"
- "Display hourly traffic patterns for the last 24 hours with cache performance metrics"
- "Show me bandwidth utilization trends over the past week with peak usage analysis"
- "Create a cache hit ratio analysis with recommendations for optimization"
- "Generate response time percentiles (P50, P95, P99) across all my services"

### Global Infrastructure Insights
- "Show me a world map of Fastly POPs (Points of Presence) with traffic distribution"
- "Display which edge locations are serving my content with request volumes"
- "Generate a report of Fastly's public IP ranges and datacenter locations"
- "Show me traffic patterns by geographic region with latency metrics"
- "Create a visual representation of my global CDN coverage and performance"

### Configuration Audit & Management
- "Audit my service configurations and highlight any security or performance issues"
- "Show me all my backend configurations with health check status and failover settings"
- "Display my domain configurations including TLS status and certificate expiry dates"
- "Generate a comprehensive VCL configuration summary across all service versions"
- "Show me my caching rules and TTL settings with optimization recommendations"

### Security & Access Control
- "Display all my ACL (Access Control Lists) with IP addresses and access patterns"
- "Show me TLS certificate status across all domains with expiration alerts"
- "Generate a security audit report including rate limiting and access controls"
- "Display my secret stores and configuration stores with usage analytics"
- "Show me authentication and authorization settings across all services"

### Real-time Monitoring
- "Create a live dashboard showing current traffic, errors, and cache performance"
- "Display real-time alerts and their severity across all my services"
- "Show me current backend health status with automatic failover information"
- "Generate a real-time error rate dashboard with trending analysis"
- "Display current purge operations and cache invalidation status"

### Operations & Troubleshooting
- "Show me recent service deployments and version changes with rollback options"
- "Display my logging endpoints configuration and recent log volumes"
- "Generate a troubleshooting report for recent 5xx errors with potential causes"
- "Show me dictionary and KV store usage patterns and performance metrics"
- "Display my compute service metrics including execution time and error rates"

### Optimization & Recommendations
- "Analyze my cache performance and provide optimization recommendations"
- "Show me bandwidth costs by region with suggestions for cost optimization"
- "Generate a performance audit highlighting bottlenecks and improvement opportunities"
- "Display my image optimization settings and compression ratios"
- "Show me opportunities to improve cache hit ratios and reduce origin load"

### Capacity Planning & Forecasting
- "Generate traffic growth projections based on historical data trends"
- "Show me capacity utilization across different service tiers and regions"
- "Display seasonal traffic patterns to help with capacity planning"
- "Create a cost analysis dashboard showing usage trends and billing forecasts"
- "Show me resource utilization metrics for compute services and edge functions"

### Advanced Analytics & Insights
- "Generate a user experience report showing page load times and performance metrics"
- "Display API endpoint performance with request patterns and error analysis"
- "Show me mobile vs desktop traffic patterns with performance comparisons"
- "Create a content popularity analysis showing most requested resources"
- "Generate a comprehensive monthly service report with KPIs and trend analysis"