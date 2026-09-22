# Deploying a remote HTTP server for multiple users

Use `--remote-http` to serve callers who each bring their own Fastly API token.
Each MCP request carries that token in a `Fastly-Key` header, and the server ignores its own `FASTLY_API_TOKEN`.

The regular `--transport http` mode shares one server token between trusted clients.
It does not enable the remote policy described here.

Remote mode runs on any platform with a supported Node.js binary.
Every execution requires Node.js 24.12.0 or newer, even when Bun serves HTTP, and startup fails without it.

The Linux deployment examples below use Docker or systemd.
Their recorded validation used Ubuntu 24.04 (arm64), Docker 29, Bun 1.4.2 and Node.js 24.21.0.
Run the [deployment tests](#deployment-tests) on your host before using it.

Read the [execution trust boundary](SECURITY.md#execution-trust-boundary) before exposing a service to other users.
The VM context does not guarantee containment of hostile code that escapes it.

## Remote mode and caller credentials

Behind an HTTPS reverse proxy on the same host, start the server with:

```sh
bunx -p @fastly/mcp fastly-mcp --remote-http \
  --http-allow-host mcp.example.com \
  --http-trusted-proxy 127.0.0.1
```

The listener defaults to `http://127.0.0.1:8231/mcp`.
Use `--http-host 0.0.0.0` when the proxy needs a network listener, as in the Docker image, and keep that port off the public network.
See [reverse proxy setup](#the-reverse-proxy) before accepting traffic.

Run `bunx -p @fastly/mcp fastly-mcp --help` for all flags.

Here is what changes for callers:

- Every MCP request needs exactly one `Fastly-Key` header, including `initialize` and `tools/list`.

  The server checks the token with Fastly before handling the request, and remembers a good answer for at most 60 seconds.

- Secret encryption is always on, and its key is derived from the caller's token.

  This means an encrypted value keeps working on another replica or after a restart, as long as the same token is used.

  If you rotate the token, though, old encrypted values become unusable, so fetch them again.

- `execute` has no `fetch` and no file access, and `packageApi.putPackage` is unavailable because it needs a file.

- Executions are limited per customer and per token, and wait in a short queue when the server is busy.

  A token that cannot read its own customer account can still use `search` and `inspect`, but not `execute`.

`--http-auth-token` still works in remote mode.

It adds a second, shared password in `Authorization: Bearer`, so callers must send it along with the `Fastly-Key` header.

## Client configuration

The token belongs in the client's configuration, never in a prompt or in the URL.

For Swival, add this HTTP entry to `swival.toml` in your project, replacing the local `fastly` entry if you already have one:

```toml
[mcp_servers.fastly]
url = "https://mcp.example.com/mcp"
headers = { "Fastly-Key" = "your-token-here" }
```

Replace the URL with your server's address and `your-token-here` with your Fastly API token, then start Swival from that project.

Swival sends header values literally, so `${FASTLY_API_TOKEN}` will not expand to an environment variable here.

Since this configuration contains your token, keep it out of version control.

Other AI clients have similar settings for connecting to a remote MCP server with custom HTTP headers.

Check your client's documentation for where to set the server URL and `Fastly-Key` header.

For VS Code, `.vscode/mcp.json` can prompt for the token once and store it as a secret:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "fastly-api-token",
      "description": "Fastly API token",
      "password": true
    }
  ],
  "servers": {
    "fastly": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Fastly-Key": "${input:fastly-api-token}"
      }
    }
  }
}
```

This is a plain API-key header, not the MCP OAuth flow.

As a result, a client that insists on OAuth and cannot send custom headers cannot connect.

Whoever runs the remote server can read and use the token you send it.

For that reason, only point your client at a service you trust, and use a token limited to what you need.

## Multiple replicas

The server keeps no MCP sessions, so a load balancer does not need sticky routing.
Encrypted values work across replicas when the caller uses the same Fastly token.

Admission limits and token-validation caches belong to each server process.
If you need a limit across the whole deployment, enforce it at the proxy or gateway as well.

## Deployment files

Run the commands below from the repository root.
The package includes this guide; the Docker, systemd and firewall files are in the [source repository](https://github.com/fastly/mcp).

| File                                                                                           | Purpose                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Dockerfile](Dockerfile)                                                                       | Production image: Bun serves HTTP, Node runs every execution           |
| [compose.yaml](compose.yaml)                                                                   | Hardened example service                                               |
| [fastly-mcp.service](deploy/fastly-mcp.service)                                                | systemd unit for a native installation                                 |
| [fastly-mcp.logrotate](deploy/fastly-mcp.logrotate)                                            | Rotation of the audit log for the native installation                  |
| [metadata-deny-docker.nft](deploy/metadata-deny-docker.nft)                                    | Firewall rules that keep containers away from cloud metadata endpoints |
| [metadata-deny-native.nft](deploy/metadata-deny-native.nft)                                    | The same for the native service user                                   |
| [Dockerfile.qualify](deploy/Dockerfile.qualify), [qualify-docker.sh](deploy/qualify-docker.sh) | Run the Linux hardening tests inside a hardened container              |

## What the host should provide

On Linux, the server uses the protections below when available and warns at startup about any that are missing.

The rest of this guide assumes a Linux host that provides all of them.

Without them, the server still limits execution time, output size, concurrent work and JavaScript heap memory.

However, memory outside the JavaScript heap, such as ArrayBuffers, has no limit.

CPU use is limited only by elapsed time, and a child that escapes the sandbox could read the server's memory.

Check `hardening` in the startup log to see which protections are active.

- **Protect the server's memory with Yama.**

  `kernel.yama.ptrace_scope` should be 1, 2 or 3.

  Executions run as the same user as the server, so a value of 0 lets them attach to it and read other callers' tokens from memory.

  Set this on the host, even with Docker: containers share the host's value, and the server never changes it.

  Ubuntu defaults to 1, Debian kernels to 0.
  To make the setting persistent:

  ```sh
  echo 'kernel.yama.ptrace_scope = 1' | sudo tee /etc/sysctl.d/10-ptrace.conf
  sudo sysctl --system
  cat /proc/sys/kernel/yama/ptrace_scope
  ```

- **Install util-linux `prlimit`.**

  The server uses it to limit memory allocations and CPU time for each execution.

  It checks `/usr/bin`, `/bin`, `/usr/sbin` and `/sbin`, not `PATH`, and tests the limits before using it.

  Slim and Alpine images may lack it, so the Dockerfile installs `util-linux`.

- **Install Node.js 24.12.0 or newer, and Bun.**

  These examples use Bun for HTTP, but every remote execution runs in Node.

  The `node` on `PATH` must point to the Node binary, rather than Bun or a wrapper supplied by a version manager.

- **No credentials in the service environment.**

  Yama does not protect `/proc/<pid>/environ`, which contains the server's environment variables.

  Because executions can read that file, do not set `FASTLY_API_TOKEN`, cloud credentials or anything else you would not hand to a caller.

## The reverse proxy

The server uses unencrypted HTTP, so put an HTTPS reverse proxy in front of it and keep port 8231 off the public network.

Configure the proxy to:

- Forward the public `Host` header, and declare that name with `--http-allow-host`.

- Forward the `Fastly-Key` header untouched.

  MCP requests without it get 401, and requests with two of them get 400.

  Forward `Authorization` too if you configure the optional deployment token, and preserve the MCP headers, including `Mcp-Method` and `Mcp-Name`.

- Overwrite `X-Forwarded-For` with the address it saw, instead of appending to what the client sent.

  Set `--http-trusted-proxy` to the proxy's IP address or CIDR so callers get separate rate limits.

  The server ignores `X-Forwarded-For` from addresses it does not trust.

- Disable response buffering, since tool calls can stream as server-sent events.

- Keep read and send timeouts at 60 seconds or more.

  An execution may run for 30 seconds and wait up to 10 seconds in the queue before that.

- Disable caching.

  The service sends `Cache-Control: no-store, no-transform` on every response.

- Keep `Fastly-Key` and `Authorization` out of access logs, and never capture request or response bodies.

  They carry code, API results and sometimes secrets.

This nginx block was tested in front of the Compose service.

The default `combined` log format omits request headers; do not add `$http_fastly_key` or `$http_authorization`.

```nginx
location / {
    proxy_pass http://127.0.0.1:8231;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 75s;
    proxy_send_timeout 75s;
    client_max_body_size 4m;
}
```

## Docker and Compose

In `compose.yaml`, set `--http-allow-host` to your public hostname and `--http-trusted-proxy` to the address your proxy connects from.

```sh
docker compose up -d --build
docker compose logs fastly-mcp | grep '"event":"startup"'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8231/healthz
```

The startup record should show `"serverRuntime":"bun"`, `"executionRuntime":"node"`, the limits you configured and `yamaPtraceScope`.

`/healthz` answers 200 without credentials.

Compose runs the service as UID 10001 with memory, CPU and process limits.

It also drops all Linux capabilities, sets `no-new-privileges`, and makes the root filesystem read-only, with a small writable temporary filesystem at `/tmp`.

An init process cleans up exited child processes.

Do not add volumes, environment credentials or the Docker socket to the service.

Check the container settings and its out-of-memory behavior:

```sh
container_id=$(docker compose ps -q fastly-mcp)
docker inspect --format '{{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}} {{.Config.User}}' "$container_id"
pid=$(docker inspect --format '{{.State.Pid}}' "$container_id")
cat "/sys/fs/cgroup$(sed -n 's/^0:://p' /proc/$pid/cgroup)/memory.oom.group"
```

The last command must print `0`.

If it prints `1`, the kernel kills the whole container when one execution exhausts the memory limit, instead of that execution alone.

Both base images are pinned by digest in the Dockerfile.

To update them, pull the new tags and read each digest with `docker inspect --format '{{index .RepoDigests 0}}' <image>`.

Then update both `FROM` lines, rebuild, and run the deployment tests against the new image.

## Native installation with systemd

Before starting the service, use the `sudoedit` step below to set `--http-allow-host` and `--http-trusted-proxy` in `ExecStart` for your setup.

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin fastly-mcp
sudo mkdir -p /opt/fastly-mcp
sudo rsync -a --chown=root:root src docs package.json bun.lock bunfig.toml README.md REMOTE-HTTP.md SECURITY.md LICENSE /opt/fastly-mcp/
(cd /opt/fastly-mcp && sudo bun install --frozen-lockfile --production)
sudo chmod -R go-w /opt/fastly-mcp
sudo install -m 0644 deploy/fastly-mcp.service /etc/systemd/system/
sudoedit /etc/systemd/system/fastly-mcp.service
sudo systemctl daemon-reload
sudo systemctl enable --now fastly-mcp
```

Keep the installation owned by root and read-only for the service user, since executions can read those files.

The unit expects Bun at `/usr/local/bin/bun` and finds Node through the default `PATH`.

The startup checks pass with the unit's security settings enabled.

`ProtectKernelTunables` leaves the Yama setting readable, and `prlimit` works without Linux capabilities.

The server can also write `/proc/<child>/oom_score_adj` to make the child the preferred process to kill when memory runs out.

`IPAddressDeny=` also blocks cloud metadata access for the service, regardless of the host firewall.

`OOMPolicy=continue` and the default `memory.oom.group` of 0 let the kernel kill one execution instead of the whole service.

In a test with a small `MemoryMax`, the kernel killed two executions that exhausted memory, while the server kept answering.

Both calls reported an out-of-memory error.

`RestartPreventExitStatus=2` stops systemd from retrying a rejected startup, so you can fix the reported problem first.

The service still restarts after a crash.

## Sizing

`--remote-execution-memory` sets each execution's allocation limit (`RLIMIT_DATA`), and half that amount sets the JavaScript heap limit.

Neither directly limits physical RAM use, so use these measurements when sizing the host:

| Execution memory   | Trivial call | Retained JS heap | Touched ArrayBuffers | Touched SharedArrayBuffers |
| ------------------ | ------------ | ---------------- | -------------------- | -------------------------- |
| 1024 MiB (default) | 100 MiB      | 571 MiB          | 721 MiB              | 722 MiB                    |
| 512 MiB            | 87 MiB       | 220 MiB          | 216 MiB              | 215 MiB                    |

The table shows peak RAM use for one execution; results matched with and without Docker.

In these tests, V8 stopped the process when the heap filled, while buffer allocations failed inside the sandbox.

Each test that exhausted memory returned an out-of-memory error to the caller.

The idle server uses about 40 MiB.

Allow at least this much memory for the container or systemd service:

```
memory limit >= max executions x execution memory + about 1 GiB
```

The example uses 4 executions of 512 MiB and a 3 GiB limit.
With the default of 8 executions of 1024 MiB, that rises to 9 GiB.

Keep swap off for the service, as both examples do.

Whenever you change `--remote-max-executions` or `--remote-execution-memory`, change `mem_limit` and `memswap_limit`, or `MemoryMax`, with them.

A trivial execution takes about 210 ms from start to finish, mostly Node and SDK startup.

With eight running at once on 4 cores, each takes about 700 ms.

Keep the number of simultaneous executions close to the number of CPU cores available to the service.

## Cloud metadata endpoints

Block cloud metadata access outside the service, because executions have network access and the sandbox cannot reliably stop requests to `169.254.169.254`.

- Do not attach an instance role, a service account or a managed identity to the VM.

  That removes the credentials, not the rest of the metadata.

- Disable the metadata service where the platform allows it.

- IMDSv2 with a hop limit of 1 is not a substitute.

  It stops a bridged container, which is one hop further away, but a native process sits directly on the VM and can still request a token.

- Load the firewall rules that match your deployment.

```sh
# Docker host
sudo nft -f deploy/metadata-deny-docker.nft
# Native service: the fastly-mcp user must already exist
sudo nft -f deploy/metadata-deny-native.nft
```

The Docker rules block forwarded requests to cloud metadata endpoints, covering every container on the host's bridge network.

Rules based only on the service user's outgoing traffic would miss those connections.

They also block metadata requests from UID 10001, so the image remains covered if someone switches it to host networking.

For the systemd service, the native rules block metadata requests from the service user while leaving administrators' access intact.

Both files cover `169.254.169.254` and `fd00:ec2::254`.

To cover the other endpoints of your platform, add them to the two sets at the top of each table, and to `IPAddressDeny=` in the unit.

To make the rules persistent, copy the files somewhere under `/etc`, add an `include "/path/to/file.nft"` line for each in `/etc/nftables.conf`, and enable `nftables.service`.

On Debian and Ubuntu that file starts with `flush ruleset`.
That is harmless at boot, since Docker starts later.

However, reloading `nftables.service` on a running host also wipes Docker's own rules.

If you reload the service, restart Docker afterward.

To avoid wiping Docker's rules, load the two files directly with `nft -f` instead; this only replaces their own tables.

Persistence across a reboot was not tested here, so check it once on your host.

Check access as the service user and from inside the container.

Both requests must fail, while your own user should still reach the endpoint if your platform provides one:

```sh
sudo -u fastly-mcp curl -s -m 3 http://169.254.169.254/ ; echo "exit $?"
docker compose exec fastly-mcp bun -e 'await fetch("http://169.254.169.254/", { signal: AbortSignal.timeout(3000) }).then(() => console.log("REACHABLE"), (e) => console.log("blocked", e.code ?? e.name))'
sudo nft list table inet fastly_mcp_metadata_docker
```

The counters in the last output increase with every rejected attempt.

Any response from the endpoint means the rules are not working; there is no need to request real credentials.

## Audit log

Records go to stdout by default; use `--audit-log <path>` to write them to a file.

The service writes one JSON record per line: a `startup` record, then one record per rejected request and per tool call.

Records hold token IDs, customer IDs, tool names, outcomes and timings, never tokens, code, arguments or results.

In Docker the records go to stdout, so `docker compose logs` shows them.

Compose keeps up to 10 log files of 50 MB each through the `json-file` driver.

Forward logs elsewhere if you need to keep more.

The systemd unit passes `--audit-log /var/log/fastly-mcp/audit.jsonl`.

`LogsDirectory=` creates the directory with permissions 0750; the log file uses 0600.

Both belong to the service user.

The server keeps the file open and never reopens it, so rotate it with `copytruncate`:

```sh
sudo install -m 0644 deploy/fastly-mcp.logrotate /etc/logrotate.d/fastly-mcp
```

A record written while the file is being copied and emptied can be lost.

If that is not acceptable, remove `--audit-log` from the unit and let journald collect stdout.

## Deployment tests

Run `test/linux-hardening.test.js` on the Linux host to check Yama and `prlimit`.

The suite also checks that each child is marked as the preferred process to kill when memory runs out.

It also checks that heap, ArrayBuffer and SharedArrayBuffer allocations stop at their limits.

Repeat these tests after changing the kernel, distribution, Node, Bun or base images.

The recorded deployment checks did not cover amd64 images, firewall persistence across a reboot, streaming through the proxy with a real Fastly token, or two replicas behind HTTPS with the documented clients.
Verify those paths if your deployment uses them.

```sh
# Native, from a checkout with development dependencies
bun install --frozen-lockfile
bun test test/linux-hardening.test.js

# Docker, inside a container restricted like the Compose service
docker build -t fastly-mcp:prod .
deploy/qualify-docker.sh fastly-mcp:prod
```

The script builds a test image from the production image and adds `procps`, which provides the `pgrep` command used by the tests.

It mounts `test/` read-only and runs as UID 10001 with the example's memory and process limits, no Linux capabilities, and a read-only root filesystem.

All tests in this suite have to pass in both places.
