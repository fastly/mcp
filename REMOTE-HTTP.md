# Use Fastly MCP on a remote server

A remote Fastly MCP server lets you use Fastly from your AI client without running the server on your own computer.
Each user connects with their own Fastly API token.

If someone has already set up a server for you, start with [Connect your client](#connect-your-client).
To set up your own server, follow [Run your own server](#run-your-own-server).

## Connect your client

### 1. Get the server address and your Fastly token

Ask whoever runs the server for its address.
It should look like `https://mcp.example.com/mcp`.
You'll also need a Fastly API token with permission to do the work you want your assistant to do.

Only connect to a server you trust: whoever runs it can read and use the token you send.
Keep the token in your client's settings, never in a prompt or in the server address.

### 2. Add the server to your client

Choose the instructions for your client below, and replace `https://mcp.example.com/mcp` with your server's address.

Some servers also require a separate password.
If the server operator gives you one, add an `Authorization` header with the value `Bearer your-server-password`, replacing the placeholder with that password.
You'll still need the `Fastly-Key` header.

#### Swival

Add this to your project's `swival.toml`.
If the file already has a `fastly` entry, replace that entry.

```toml
[mcp_servers.fastly]
url = "https://mcp.example.com/mcp"
headers = { "Fastly-Key" = "your-token-here" }
```

Replace `your-token-here` with your Fastly API token, then start Swival from that project.
Swival uses the value exactly as written, so putting `${FASTLY_API_TOKEN}` here will not read the token from your environment.
Keep this file out of version control because it contains your token.

#### VS Code

Add the following settings to `.vscode/mcp.json`.
If you already have other servers configured, add the `fastly` entry and its input to the existing settings.

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

When you start the server connection in VS Code, enter your Fastly API token when prompted.
You don't need to put the token itself in the file.

#### Other clients

In your client's MCP settings, add an HTTP server with your server's address.
Then add a header named `Fastly-Key` with your Fastly API token as its value.
Your client must send this header on every request.
Clients that cannot set custom headers cannot connect.

### 3. Try it

Ask your assistant to list your Fastly services.
If your token can access them, you should get a list back.

You can use the remote server to work with the Fastly API, but you cannot upload files or make requests to unrelated websites.
The server encrypts recognized secrets before returning them to your assistant.
If you replace your Fastly token, ask the assistant to retrieve any values it previously received in encrypted form again.

## Run your own server

The steps below use Linux, with either Docker Compose or systemd to keep the server running.
Remote mode also runs on other systems with Node.js 24.12.0 or newer, though some of the Linux protections will be unavailable.

Only let trusted users share a server.
Give people who do not trust one another separate, isolated installations.
Read the [security guide](SECURITY.md#execution-trust-boundary) before giving anyone access.

### 1. Prepare the machine

Get a copy of the [source repository](https://github.com/fastly/mcp) and run the commands below from its top-level directory.
The Docker, systemd and firewall files used here are included in that repository.

You'll need:

- A Linux machine with administrator access. The examples reserve 3 GiB of memory and four CPU cores for the service, so leave room for the operating system too.
- Bun and Node.js 24.12.0 or newer for the setup checks and for running without Docker.
- Docker with Compose if you choose the Docker installation.
- `nftables` and `util-linux` for the firewall and setup checks.
- A domain name pointing to the machine and a web server such as nginx configured to serve that name over HTTPS.

Check this Linux setting on the host, including when using Docker:

```sh
cat /proc/sys/kernel/yama/ptrace_scope
```

The result should be `1`, `2` or `3`.
If it is `0`, change it to `1` so code running for one user cannot attach to the server and read other users' tokens:

```sh
echo 'kernel.yama.ptrace_scope = 1' | sudo tee /etc/sysctl.d/10-ptrace.conf
sudo sysctl --system
```

Do not give the service Fastly tokens, cloud credentials or other secrets through environment variables.
Users supply their own Fastly tokens when they connect.

If this is a cloud machine, do not assign it a cloud role or service account that grants access to other resources.
Disable the cloud's metadata service if possible; this is a local address that can provide information and credentials about the machine.
The firewall rules in the next step block access to it as well.

The supplied rules cover `169.254.169.254` and `fd00:ec2::254`.
If your cloud uses other addresses, add them to the address lists in the firewall file you use.
For systemd, add them to `IPAddressDeny=` in the service file too.

### 2. Install and start the service

Choose one of the following methods.
Both keep port 8231 private to the machine.

#### With Docker Compose

Open [compose.yaml](compose.yaml) and change these two settings:

- `--http-allow-host`: replace `mcp.example.com` with your domain name, without `https://` or `/mcp`.
- `--http-trusted-proxy`: replace the example address range with the address your web server connects from. Docker may use a different address here from `127.0.0.1`.

Keep the other restrictions in the file, and do not add credentials, shared folders or access to the Docker socket.
Then load the firewall rules and start the service:

```sh
sudo nft -f deploy/metadata-deny-docker.nft
docker compose up -d --build
docker compose logs fastly-mcp
```

These firewall rules apply to all containers on the host's Docker bridge network.

#### With systemd

Install Bun and Node.js first.
The service file expects Bun at `/usr/local/bin/bun`, and `node` must be available to the service as a real Node.js installation.

Create a dedicated user and copy the files:

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin fastly-mcp
sudo mkdir -p /opt/fastly-mcp
sudo rsync -a --chown=root:root src docs package.json bun.lock bunfig.toml README.md REMOTE-HTTP.md SECURITY.md LICENSE /opt/fastly-mcp/
(cd /opt/fastly-mcp && sudo bun install --frozen-lockfile --production)
sudo chmod -R go-w /opt/fastly-mcp
sudo install -m 0644 deploy/fastly-mcp.service /etc/systemd/system/
sudoedit /etc/systemd/system/fastly-mcp.service
```

In the service file, replace `mcp.example.com` after `--http-allow-host` with your domain name.
The `--http-trusted-proxy 127.0.0.1` setting works when nginx runs on the same machine.
Keep the installation owned by root so the service user cannot change its files.

Load the firewall rules, set up automatic log cleanup, and start the service:

```sh
sudo nft -f deploy/metadata-deny-native.nft
sudo install -m 0644 deploy/fastly-mcp.logrotate /etc/logrotate.d/fastly-mcp
sudo systemctl daemon-reload
sudo systemctl enable --now fastly-mcp
sudo journalctl -u fastly-mcp -n 50
```

#### Keep the firewall rules after a restart

Copy the firewall file you used to `/etc/nftables.d/`, creating the directory if needed.
Add an `include` line for that file to `/etc/nftables.conf`, then enable `nftables.service`.
After rebooting the machine, check that the rules are still present.

For changes on a running Docker host, load your file with `sudo nft -f /path/to/file.nft`.
Reloading the whole `nftables` service can remove Docker's network rules.
If that happens, restart Docker too.

### 3. Make the server available over HTTPS

Keep port 8231 closed to the public internet.
Your web server should accept HTTPS connections and pass them to Fastly MCP at `http://127.0.0.1:8231`.
This is called a reverse proxy.

For nginx, add this block inside the HTTPS `server` block for your domain:

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

This block needs an existing HTTPS configuration and certificate; it does not create them.
Check the nginx configuration and reload it once the checks in the next step pass.

If you use another web server, keep the original `Host`, `Fastly-Key`, `Authorization`, `Mcp-Method` and `Mcp-Name` headers.
Set `X-Forwarded-For` to the connecting client's address, replacing any value the client supplied.
Turn off caching and response buffering, and allow at least 60 seconds for a response.

Keep tokens and request and response contents out of your web server's logs.
The default nginx `combined` log format is suitable; do not add token headers to it.

### 4. Check the setup before sharing it

First, check that the service responds on the machine:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8231/healthz
```

You should see `200`.
This check does not need a Fastly token.
Read the startup messages too, and resolve any warnings about missing protections before sharing the server.

Run the Linux checks from your source checkout with development dependencies installed:

```sh
bun install --frozen-lockfile
bun test test/linux-hardening.test.js
```

If you use Docker, also check the image:

```sh
docker build -t fastly-mcp:prod .
deploy/qualify-docker.sh fastly-mcp:prod
```

All checks should pass.
The deployment examples were tested on Ubuntu 24.04 with an ARM64 processor.
Other processors, firewall rules after a reboot, and complete client connections through HTTPS were not covered by those tests, so verify your own setup.

On a cloud machine, also check that the service cannot reach the metadata address.
For Docker, run:

```sh
docker compose exec fastly-mcp bun -e 'await fetch("http://169.254.169.254/", { signal: AbortSignal.timeout(3000) }).then(() => console.log("REACHABLE"), (e) => console.log("blocked", e.code ?? e.name))'
```

The result should say `blocked`.
For systemd, run:

```sh
sudo -u fastly-mcp curl -v --max-time 3 http://169.254.169.254/
```

The connection should fail without an HTTP response.
Any HTTP response, even an error, means the address is still reachable.
Check any additional metadata addresses your cloud uses too.

Once these checks pass, reload your HTTPS web server and follow [Connect your client](#connect-your-client) with `https://your-domain/mcp`.
Try listing your services before giving the address to other users.

## Keep the server running

### Read the logs

With Docker, use `docker compose logs fastly-mcp`.
The example keeps up to ten log files of 50 MB each.

With systemd, request logs are in `/var/log/fastly-mcp/audit.jsonl`.
Use `journalctl -u fastly-mcp` for startup errors.
The log cleanup configured above can lose an entry written during cleanup.
If you need to avoid that, remove `--audit-log` from the service file and let systemd collect the output instead.
Then run `sudo systemctl daemon-reload` and `sudo systemctl restart fastly-mcp`.

Request logs show who made a call, whether it succeeded, and how long it took.
They do not contain tokens, submitted code or API results.

### Change how much work the server can handle

The examples allow four calls to run at once, with a memory setting of 512 MiB per call and a total service limit of 3 GiB.
Keep the number of simultaneous calls close to the number of CPU cores available to the service.

To change these settings, edit `--remote-max-executions` and `--remote-execution-memory` in Compose or the systemd service file.
Allow at least the number of calls times the memory setting, plus another 1 GiB for the service.
For example, eight calls at 1024 MiB each need a service limit of at least 9 GiB.

Update `mem_limit` and `memswap_limit` in Compose, or `MemoryMax` in systemd, at the same time.
Keep swap disabled as in the supplied examples.
For Docker, apply the changes with `docker compose up -d`.
For systemd, run `sudo systemctl daemon-reload` followed by `sudo systemctl restart fastly-mcp`.

If you run more than one server, requests from the same user can go to any of them.
Encrypted values continue to work as long as the user keeps the same Fastly token.
Each server applies its own limits, so configure any overall limit in the web service that distributes requests between them.

### Check again after updates

Repeat the checks in step 4 after updating Linux, Node.js, Bun or the Docker images.
Also test a connection from your usual client before sharing the updated server.

## If something goes wrong

- **The client cannot connect:** check the address ends in `/mcp`, uses HTTPS, and matches `--http-allow-host` on the server.
- **The server rejects your token:** check the client sends one `Fastly-Key` header on every request, including when it first connects. If the server also requires a password, send its `Authorization` header too.
- **You can browse tools but cannot run a call:** Fastly must be able to identify the account for your token. Check the token's permissions.
- **A file upload fails:** remote mode does not support file uploads.
- **The server is busy:** wait briefly and try again. If it happens often, check the server's logs and capacity settings.
- **The service will not start:** read the startup error. For a systemd installation, check that the service can find Bun and Node.js 24.12.0 or newer.
