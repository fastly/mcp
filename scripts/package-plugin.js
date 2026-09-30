import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const pluginDirectory = join(repository, "plugins/fastly-mcp");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const packageMetadata = readJson(join(repository, "package.json"));
const manifest = readJson(join(pluginDirectory, "plugin.json"));
const mcp = readJson(join(pluginDirectory, "mcp.json"));
const codexOverlay = readJson(
  join(pluginDirectory, ".codex-plugin/plugin.json"),
);

assert.equal(
  manifest.$schema,
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
);
assert.equal(manifest.name, "fastly-mcp");
assert.equal(manifest.version, packageMetadata.version);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(
  mcp.$schema,
  "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
);
assert.deepEqual(mcp.mcpServers, {
  "fastly-js": {
    type: "stdio",
    command: "bunx",
    args: [
      "-p",
      `@fastly/mcp@${manifest.version}`,
      "fastly-mcp",
      "--transport",
      "stdio",
      "--encrypt-secrets",
    ],
  },
});
assert.deepEqual(codexOverlay, {
  name: "fastly-mcp",
  mcpServers: {
    "fastly-js": {
      command: "bunx",
      env_vars: ["FASTLY_API_TOKEN"],
    },
  },
});

const files = [
  "plugin.json",
  "mcp.json",
  ".codex-plugin/plugin.json",
  "README.md",
  "assets/README.md",
  "assets/fastly-icon.svg",
];
const temporaryDirectory = join(repository, "tmp");
mkdirSync(temporaryDirectory, { recursive: true });
const stagingDirectory = mkdtempSync(
  join(temporaryDirectory, "fastly-mcp-plugin-"),
);

try {
  for (const file of files) {
    const destination = join(stagingDirectory, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(pluginDirectory, file), destination);
  }
  copyFileSync(join(repository, "LICENSE"), join(stagingDirectory, "LICENSE"));
  const archiveName = `fastly-mcp-plugin-${manifest.version}.zip`;
  const stagedArchive = join(stagingDirectory, archiveName);
  const zipped = spawnSync(
    "zip",
    ["-X", "-q", stagedArchive, ...files, "LICENSE"],
    {
      cwd: stagingDirectory,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      encoding: "utf8",
    },
  );
  if (zipped.error) throw zipped.error;
  if (zipped.status !== 0) {
    throw new Error(
      `zip failed (${zipped.signal ?? zipped.status}): ${zipped.stderr.trim()}`,
    );
  }
  const outputDirectory = join(repository, "dist");
  mkdirSync(outputDirectory, { recursive: true });
  const archive = join(outputDirectory, archiveName);
  renameSync(stagedArchive, archive);
  process.stdout.write(`${archive}\n`);
} finally {
  rmSync(stagingDirectory, { recursive: true, force: true });
}
