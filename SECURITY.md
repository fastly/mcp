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

## Remote service (`--remote-http`)

Remote mode accepts a different Fastly API token on every request and runs code for many callers on one replica.

See the [remote HTTP deployment guide](REMOTE-HTTP.md) for host requirements, setup and deployment tests.

Even with the Linux extras, none of the defenses below turns the VM context into a containment boundary.

- Each execution is a fresh Node child that gets its caller's token on stdin only.

  Nothing is shared between executions except the server process that started them.

- On Linux, with `kernel.yama.ptrace_scope` at 1 or higher and no `CAP_SYS_PTRACE`, a child cannot attach to the server or to a sibling, and cannot read their `/proc/<pid>/mem` or `/proc/<pid>/syscall`.

  On other platforms, or with the setting at 0, the server warns at startup and runs without this protection.

  Yama does not cover `/proc/<pid>/environ`, so never put a credential in the server's environment.

- Children run under the Node permission model: read access to the installation only, no child processes, no workers, no native addons and no Inspector.

  However, Node itself says this model does not contain malicious code that already has host capabilities.

  `--allow-net` grants the whole network, not a list of hosts.

- V8 gets a heap cap on every platform.

  On Linux, `prlimit` also caps allocations and CPU time, and each child is marked as the first thing the kernel OOM killer should kill.

  Both are skipped with a warning when the host lacks them.

  These limits apply to one execution and do not promise that other calls survive a host that runs out of memory.

- Executed code has no `fetch`, the Fastly client only talks to `api.fastly.com` and `rt.fastly.com` without following redirects, and file upload operations are refused.

- Without Yama, `prlimit` and the OOM score file, a deployment keeps the portable protections: the execution deadline, the output caps, the admission limits and the heap cap.

  It is still weaker against resource exhaustion, because ArrayBuffers and native allocations are unbounded and CPU time is only limited by the wall clock.

  It also has no protection against a process that reads the server's memory after a sandbox escape.

  The startup audit record says which protections are active.

- Cloud metadata endpoints must be blocked outside the process, for the service user and for the container's forwarding path.

  The URL restrictions above only cover the supported interface, not code that escaped it.

- Bun never runs remote executions, even a version that passes the memory tests.

In remote mode, the secret encryption key is derived from the caller's token with HKDF-SHA-256.

The encryption is deterministic: equal secrets give equal ciphertexts, and short segments have few possible values, so a caller could enumerate them under their own key.

The `{{fastly-encrypted:v1:...}}` marker only tells ciphertext from plaintext.

It authenticates nothing, so a wrong key or an altered ciphertext decrypts to a different, well-formed value without any error.

The feature keeps recognized secrets away from the model, not from the operator of the server.

The server remembers a valid token for at most 60 seconds, so a revoked token can still get in for that long.

Fastly still authorizes every real API call.

## Report a security issue

The fastly/mcp project team welcomes security reports and is committed to providing prompt attention to security issues. Security issues should be reported privately via [Fastly’s security issue reporting process](https://www.fastly.com/security/report-security-issue).

## Security advisories

Remediation of security vulnerabilities is prioritized by the project team. The project team endeavors to coordinate remediation with third-party stakeholders, and is committed to transparency in the disclosure process. The Fastly team announces security issues in release notes as well as Github Security Advisories on a best-effort basis.

Note that communications related to security issues in Fastly-maintained OSS as described here are distinct from [Fastly Security Advisories](https://www.fastly.com/security-advisories).
