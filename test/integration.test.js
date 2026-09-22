import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { tempDir } from "./helpers.js";

const SERVER_PATH = join(import.meta.dir, "../src/index.js");
const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

function connectClient({ env = {}, extraArgs = [] } = {}) {
  const transport = new StdioClientTransport({
    command: "bun",
    args: ["run", SERVER_PATH, ...extraArgs],
    env: { ...process.env, ...env },
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  return { transport, client, connect: () => client.connect(transport) };
}

let client;
let transport;

beforeAll(async () => {
  ({ client, transport } = connectClient({}));
  await client.connect(transport);
}, 15000);

afterAll(async () => {
  if (client) {
    await client.close();
  }
});

// The original bug was seen end to end, so these go through a real client and a real server process.
describe("large results over MCP", () => {
  let dir;
  let bigClient;
  let bigTransport;

  beforeAll(async () => {
    dir = tempDir("integration-results");
    ({ client: bigClient, transport: bigTransport } = connectClient({
      extraArgs: ["--result-dir", dir],
    }));
    await bigClient.connect(bigTransport);
  }, 20000);

  afterAll(async () => {
    if (bigClient) await bigClient.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const run = async (code) => {
    const result = await bigClient.callTool({
      name: "execute",
      arguments: { code },
    });
    return JSON.parse(result.content[0].text);
  };

  test("a list of 500 records arrives complete", async () => {
    const parsed = await run(
      'return Array.from({length: 500}, (_, i) => ({ id: "u" + i, login: "user" + i + "@example.com" }));',
    );
    expect(parsed.truncated).toBeUndefined();
    expect(parsed.result).toHaveLength(500);
    expect(parsed.result[499].id).toBe("u499");
  }, 20000);

  test("an oversized list arrives as a path to the whole result", async () => {
    const parsed = await run(
      'return Array.from({length: 5000}, (_, i) => ({ id: "u" + i, login: "user" + i + "@example.com", note: "x".repeat(40) }));',
    );
    expect(parsed.truncated).toBe(true);
    expect(parsed.resultFile).toStartWith(dir);
    const stored = JSON.parse(readFileSync(parsed.resultFile, "utf8"));
    expect(stored).toHaveLength(5000);
    expect(stored[4999].login).toBe("user4999@example.com");
  }, 20000);

  // The model is told to read the file, so it must hide what the response hides.
  test("a stored result is encrypted like the response", async () => {
    const { client: sealed, transport: sealedTransport } = connectClient({
      extraArgs: ["--result-dir", dir, "--encrypt-secrets"],
    });
    await sealed.connect(sealedTransport);
    try {
      const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
      const response = await sealed.callTool({
        name: "execute",
        arguments: {
          code: `return Array.from({length: 2000}, (_, i) => ({ id: i, token: "${token}", note: "x".repeat(40) }));`,
        },
      });
      const text = response.content[0].text;
      expect(text).not.toContain(token);
      const parsed = JSON.parse(text);
      expect(parsed.truncated).toBe(true);
      const stored = readFileSync(parsed.resultFile, "utf8");
      expect(stored).not.toContain(token);
      const records = JSON.parse(stored);
      expect(records).toHaveLength(2000);
      expect(records[1999].token).toStartWith("ghp_");
      expect(parsed.result.items[0].token).toBe(records[0].token);
    } finally {
      await sealed.close();
    }
  }, 20000);

  test("the execute tool tells the model that result files exist", async () => {
    const { tools } = await bigClient.listTools();
    const execute = tools.find((t) => t.name === "execute");
    expect(execute.description).toContain("resultFile");
  }, 10000);
});

describe("MCP integration", () => {
  test("tools/list returns search, execute, and inspect", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(3);

    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["execute", "inspect", "search"]);

    const searchTool = tools.find((t) => t.name === "search");
    expect(searchTool.inputSchema.properties.query).toBeDefined();

    const executeTool = tools.find((t) => t.name === "execute");
    expect(executeTool.inputSchema.properties.code).toBeDefined();

    const inspectTool = tools.find((t) => t.name === "inspect");
    expect(inspectTool.inputSchema.properties.method).toBeDefined();
  }, 10000);

  test("search tool returns results for 'purge'", async () => {
    const result = await client.callTool({
      name: "search",
      arguments: { query: "purge" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.total).toBeGreaterThan(0);
    expect(parsed.matches.length).toBeGreaterThan(0);
    expect(parsed.matches.some((m) => m.apiClass === "PurgeApi")).toBe(true);
  }, 10000);

  test("search tool handles empty query", async () => {
    const result = await client.callTool({
      name: "search",
      arguments: { query: "" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("non-empty");
  }, 10000);

  test("execute tool runs code and returns result", async () => {
    const result = await client.callTool({
      name: "execute",
      arguments: { code: "return 1 + 1;" },
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.result).toBe(2);
  }, 15000);

  test("execute tool has access to Fastly", async () => {
    const result = await client.callTool({
      name: "execute",
      arguments: { code: "return typeof Fastly;" },
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.result).toBe("object");
  }, 15000);

  test("execute tool returns isError for bad code", async () => {
    const result = await client.callTool({
      name: "execute",
      arguments: { code: "throw new Error('test error');" },
    });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("test error");
  }, 15000);

  test("execute tool captures console.log output", async () => {
    const result = await client.callTool({
      name: "execute",
      arguments: {
        code: 'console.log("hello"); console.warn("warn msg"); return 42;',
      },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.result).toBe(42);
    expect(parsed.console).toHaveLength(2);
    expect(parsed.console[0]).toEqual({ level: "log", text: "hello" });
    expect(parsed.console[1]).toEqual({ level: "warn", text: "warn msg" });
  }, 15000);

  test("inspect tool returns method details", async () => {
    const result = await client.callTool({
      name: "inspect",
      arguments: { method: "listServices" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.apiClass).toBe("ServiceApi");
    expect(parsed.method).toBe("listServices");
    expect(parsed.httpMethod).toBe("GET");
    expect(parsed.usage).toContain("serviceApi.listServices");
    expect(parsed.usage).not.toContain("new Fastly");
    expect(parsed.params).toBeDefined();
  }, 10000);

  test("inspect tool handles unknown method", async () => {
    const result = await client.callTool({
      name: "inspect",
      arguments: { method: "nonExistentMethod" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("No method named");
  }, 10000);

  test("inspect tool accepts ClassName.methodName format", async () => {
    const result = await client.callTool({
      name: "inspect",
      arguments: { method: "PurgeApi.purgeSingleUrl" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.apiClass).toBe("PurgeApi");
    expect(parsed.method).toBe("purgeSingleUrl");
  }, 10000);
});

describe("MCP integration with encryption (env vars)", () => {
  let encClient;

  beforeAll(async () => {
    const conn = connectClient({
      env: {
        FASTLY_MCP_ENCRYPT_SECRETS: "true",
        FASTLY_MCP_ENCRYPT_KEY: "0102030405060708090a0b0c0d0e0f10",
      },
    });
    encClient = conn.client;
    await conn.connect();
  }, 15000);

  afterAll(async () => {
    if (encClient) {
      await encClient.close();
    }
  });

  test("execute tool encrypts tokens in output", async () => {
    const result = await encClient.callTool({
      name: "execute",
      arguments: {
        code: `return "token: ${GITHUB_PAT}";`,
      },
    });
    const text = result.content[0].text;
    // The real token should NOT appear in the response
    expect(text).not.toContain(GITHUB_PAT);
    // But a ghp_ prefixed token should (encrypted form)
    expect(text).toContain("ghp_");
  }, 15000);

  test("execute tool decrypts tokens in input code", async () => {
    // First, encrypt a token to get its ciphertext
    const encResult = await encClient.callTool({
      name: "execute",
      arguments: { code: `return "${GITHUB_PAT}";` },
    });
    const encParsed = JSON.parse(encResult.content[0].text);
    const encryptedToken = encParsed.result;

    // Now pass the encrypted token back — it should be decrypted before execution
    const decResult = await encClient.callTool({
      name: "execute",
      arguments: { code: `return "${encryptedToken}";` },
    });
    const decParsed = JSON.parse(decResult.content[0].text);
    // The result should be the encrypted form again (re-encrypted on output)
    expect(decParsed.result).toBe(encryptedToken);
  }, 15000);

  test("search tool works with encryption enabled", async () => {
    const result = await encClient.callTool({
      name: "search",
      arguments: { query: "purge" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.total).toBeGreaterThan(0);
  }, 10000);

  test("inspect tool works with encryption enabled", async () => {
    const result = await encClient.callTool({
      name: "inspect",
      arguments: { method: "listServices" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.method).toBe("listServices");
  }, 10000);
});

describe("MCP integration with encryption (CLI flags)", () => {
  let cliClient;

  beforeAll(async () => {
    const conn = connectClient({
      extraArgs: [
        "--encrypt-secrets",
        "--encrypt-key",
        "0102030405060708090a0b0c0d0e0f10",
      ],
    });
    cliClient = conn.client;
    await conn.connect();
  }, 15000);

  afterAll(async () => {
    if (cliClient) {
      await cliClient.close();
    }
  });

  test("--encrypt-secrets flag enables encryption", async () => {
    const result = await cliClient.callTool({
      name: "execute",
      arguments: {
        code: `return "token: ${GITHUB_PAT}";`,
      },
    });
    const text = result.content[0].text;
    expect(text).not.toContain(GITHUB_PAT);
    expect(text).toContain("ghp_");
  }, 15000);
});
