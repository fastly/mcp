## Execution trust boundary

The `execute` tool runs caller-supplied JavaScript in a VM context inside a separate child process.
The current implementation does not guarantee containment of hostile code that escapes that context.
An escape may expose server credentials, host resources, or data belonging to other calls, depending on the host's protections.
If the parent server process is compromised, assume that all Fastly tokens it is processing are exposed, including every request in flight on that replica.

Request-scoped variables and encryption of tool output do not protect tokens held in process memory.
An HTTP authentication token controls who can connect; it does not isolate those callers from one another.
Treat clients sharing a server as belonging to the same trust boundary unless the deployment supplies independently verified protections.
Runtime permission flags and host hardening can block specific access paths, but they do not establish general containment after an escape.

Local execution can receive hostile code through model prompt injection in Fastly API content.
When a chat client only exposes MCP tools, an escape can expose the user's files even though the model had no shell access.
The server prefers Node execution with permissions enabled; Bun is a local fallback only when Node is absent, with a stderr warning.
Bun 1.3.11 still exposes a host-realm error when user code redefines an immutable global, and is unsupported for remote execution.

If you supply a Fastly API token to a remote server, its operator can read and use it.
Encryption of tool output does not hide the token from that operator.

## Report a security issue

The fastly/mcp project team welcomes security reports and is committed to providing prompt attention to security issues. Security issues should be reported privately via [Fastly’s security issue reporting process](https://www.fastly.com/security/report-security-issue).

## Security advisories

Remediation of security vulnerabilities is prioritized by the project team. The project team endeavors to coordinate remediation with third-party stakeholders, and is committed to transparency in the disclosure process. The Fastly team announces security issues in release notes as well as Github Security Advisories on a best-effort basis.

Note that communications related to security issues in Fastly-maintained OSS as described here are distinct from [Fastly Security Advisories](https://www.fastly.com/security-advisories).
