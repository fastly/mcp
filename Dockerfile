# Remote HTTP service image: Bun serves HTTP, Node runs every execution.
#
# Refresh the two pinned base images together.
# Rerun the test suite and the Linux hardening tests inside the new image before shipping it.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node

FROM oven/bun:1.4.2-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61

# prlimit caps the memory and CPU of each execution.
# Without it the server still starts, but only with the heap cap.
# Slim images do not always ship util-linux.
RUN apt-get update \
    && apt-get install -y --no-install-recommends util-linux libstdc++6 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && prlimit --version

# The server needs the real Node binary.
# The Bun image ships a `node` symlink to Bun that even answers `node --version`, so ask the engine what it really is.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN node --version \
    && node --permission --disable-sigusr1 --eval \
       "if (process.versions.bun || process.execPath !== '/usr/local/bin/node') process.exit(1)"

RUN groupadd --gid 10001 fastly-mcp \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin fastly-mcp

WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production
COPY src ./src
COPY docs ./docs
COPY README.md REMOTE-HTTP.md SECURITY.md LICENSE ./

# The root filesystem is read-only at run time, so Bun must not cache transpiled files.
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    DO_NOT_TRACK=1 \
    NODE_ENV=production

USER 10001:10001
EXPOSE 8231

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD ["bun", "--eval", "const r = await fetch('http://127.0.0.1:8231/healthz'); process.exit(r.ok ? 0 : 1)"]

ENTRYPOINT ["bun", "src/index.js", "--remote-http", "--http-host", "0.0.0.0"]
CMD ["--remote-max-executions", "4", "--remote-execution-memory", "512"]
