import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SANDBOX_PATH = join(import.meta.dir, "../src/sandbox.js");
const runtimes = [
  {
    name: "Bun",
    executable: process.execPath,
    args: ["--no-env-file", "--no-install", "--no-addons"],
  },
  {
    name: "Node",
    executable: Bun.which("node"),
    args: ["--experimental-vm-modules"],
  },
];

function spawnRuntime(runtime, args, input) {
  if (!runtime.executable) {
    throw new Error(`${runtime.name} is required for sandbox runtime tests`);
  }
  const child = spawnSync(runtime.executable, [...runtime.args, ...args], {
    input,
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    env: { BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0", DO_NOT_TRACK: "1" },
  });
  if (child.error) {
    throw new Error(`${runtime.name} failed to start`, { cause: child.error });
  }
  return child;
}

function readResult(runtime, child) {
  if (child.status !== 0) {
    throw new Error(
      `${runtime.name} exited with ${child.signal ?? child.status}: ${child.stderr}`,
    );
  }
  return JSON.parse(child.stdout);
}

function run(runtime, args, input) {
  return readResult(runtime, spawnRuntime(runtime, args, input));
}

function runSandbox(runtime, code) {
  return run(runtime, [SANDBOX_PATH], JSON.stringify({ code }));
}

function runWithInjectedGlobals(runtime, setup, code) {
  const marker = "sandbox runtime globals injected";
  const launcher = `
    import vm from "node:vm";
    const createContext = vm.createContext;
    vm.createContext = (...args) => {
      const context = createContext(...args);
      vm.runInContext(${JSON.stringify(setup)}, context);
      process.stderr.write(${JSON.stringify(`${marker}\n`)});
      return context;
    };
    await import(${JSON.stringify(pathToFileURL(SANDBOX_PATH).href)});
  `;
  const child = spawnRuntime(
    runtime,
    ["--input-type=module", "--eval", launcher],
    JSON.stringify({ code }),
  );
  expect(child.stderr).toContain(marker);
  return child;
}

const realmAssertions = `
  function assertRealm(value, expected, label) {
    if (!(value instanceof expected)) {
      throw new Error(label + " has a foreign realm or unexpected type: " + typeof value);
    }
    for (let current = value; current !== null; current = Object.getPrototypeOf(current)) {
      const constructor = Object.getOwnPropertyDescriptor(current, "constructor")?.value;
      if (typeof constructor === "function" && !(constructor instanceof Function)) {
        throw new Error(label + " exposes a foreign constructor");
      }
    }
    return value;
  }

  function assertCodeGenerationBlocked(constructor, label) {
    assertRealm(constructor, Function, label);
    let failure;
    try {
      constructor("return 42");
    } catch (error) {
      failure = error;
    }
    assertRealm(failure, EvalError, label + " rejection");
    if (!/^Code generation from strings disallowed/.test(failure.message)) {
      throw new Error(label + " did not reject string code generation");
    }
  }

  function assertLocalError(error, label) {
    assertRealm(error, Error, label);
    assertCodeGenerationBlocked(error.constructor.constructor, label + " constructor");
    return error;
  }

  async function expectLocalRejection(pending, label) {
    assertRealm(pending, Promise, label + " promise");
    try {
      await pending;
    } catch (error) {
      return assertLocalError(error, label);
    }
    throw new Error(label + " unexpectedly succeeded");
  }
`;

const constructorProbes = [
  { name: "eval", target: "eval", targetName: "eval" },
  { name: "Function", target: "Function", targetName: "Function" },
  {
    name: "Object constructor",
    target: "Object.constructor",
    targetName: "Function",
  },
  {
    name: "host-bridge error constructor",
    setup: `
      const failure = await serviceApi.thisMethodDoesNotExist().catch(error => error);
      if (!(failure instanceof Error) || failure.message !==
          "Unknown Fastly API method: ServiceApi.thisMethodDoesNotExist") {
        throw new Error("Expected the unsupported API bridge failure");
      }
    `,
    target: "failure.constructor.constructor",
    targetName: "Function",
  },
  {
    name: "promise constructor",
    setup: `
      const pending = console.log("promise probe");
      if (!(pending instanceof Promise) || await pending !== null) {
        throw new Error("Expected a fulfilled console bridge promise");
      }
    `,
    target: "pending.constructor.constructor",
    targetName: "Function",
  },
  {
    name: "async-function constructor",
    target: "serviceApi.listServices.constructor",
    targetName: "AsyncFunction",
  },
];

for (const runtime of runtimes) {
  describe(`sandbox restrictions under ${runtime.name}`, () => {
    beforeAll(() => {
      const identity = run(runtime, [
        "--eval",
        "console.log(JSON.stringify({ node: process.versions.node, bun: process.versions.bun }));",
      ]);
      if (
        typeof identity.node !== "string" ||
        Boolean(identity.bun) !== (runtime.name === "Bun")
      ) {
        throw new Error(
          `${runtime.name} executable has the wrong runtime identity: ${JSON.stringify(identity)}`,
        );
      }
    });

    test("successful smoke control reaches the sandbox and bridge", () => {
      const out = runSandbox(
        runtime,
        'await console.log("ready"); return { answer: await Promise.resolve(42), api: typeof serviceApi.listServices };',
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual({ answer: 42, api: "function" });
      expect(out.console).toEqual([{ level: "log", text: "ready" }]);
    }, 15000);

    test("standard globals still support data processing", () => {
      const out = runSandbox(
        runtime,
        `
          const bytes = new Uint8Array([3, 1, 3]);
          const values = [...new Set(bytes)].sort((a, b) => a - b);
          const counts = new Map(values.map(value =>
            [String(value), bytes.filter(byte => byte === value).length]));
          const view = new DataView(new ArrayBuffer(4));
          view.setUint32(0, 42);
          return {
            values,
            counts: Object.fromEntries(counts),
            binary: view.getUint32(0),
            big: String(BigInt(2) ** BigInt(5)),
            match: /^fastly$/i.test("Fastly"),
            date: new Date(Date.UTC(2026, 0, 1)).toISOString(),
            parsed: await Promise.resolve(JSON.parse('{"answer":42}').answer),
            squareRoot: Math.sqrt(81),
          };
        `,
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual({
        values: [1, 3],
        counts: { 1: 1, 3: 2 },
        binary: 42,
        big: "32",
        match: true,
        date: "2026-01-01T00:00:00.000Z",
        parsed: 42,
        squareRoot: 9,
      });
    }, 15000);

    test("ShadowRealm and WebAssembly are unavailable", () => {
      const out = runSandbox(
        runtime,
        `return [
          typeof ShadowRealm,
          typeof globalThis.ShadowRealm,
          typeof WebAssembly,
          typeof globalThis.WebAssembly,
        ];`,
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual([
        "undefined",
        "undefined",
        "undefined",
        "undefined",
      ]);
    }, 15000);

    test("global object has no inherited constructor", () => {
      const out = runSandbox(
        runtime,
        `return {
          constructor: typeof globalThis.constructor,
          prototypeIsNull: Object.getPrototypeOf(globalThis) === null,
        };`,
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual({
        constructor: "undefined",
        prototypeIsNull: true,
      });
    }, 15000);

    test("unknown string and symbol globals are removed", () => {
      const child = runWithInjectedGlobals(
        runtime,
        `
          Object.defineProperty(globalThis, "futureRuntimeGlobal", {
            value: 42, configurable: true,
          });
          Object.defineProperty(globalThis, Symbol.for("fastly-mcp.future-global"), {
            value: 42, configurable: true,
          });
        `,
        `return {
          stringKey: Object.hasOwn(globalThis, "futureRuntimeGlobal"),
          symbolKey: Object.hasOwn(globalThis, Symbol.for("fastly-mcp.future-global")),
        };`,
      );
      const out = readResult(runtime, child);
      expect(out.ok).toBe(true);
      expect(out.result).toEqual({ stringKey: false, symbolKey: false });
    }, 15000);

    test("an unremovable unknown global prevents user execution", () => {
      const child = runWithInjectedGlobals(
        runtime,
        `Object.defineProperty(globalThis, "futureFixedRuntimeGlobal", {
          value: 42, configurable: false,
        });`,
        'return "USER_CODE_RAN";',
      );
      const output = `${child.stdout}\n${child.stderr}`;
      expect(output).not.toContain("USER_CODE_RAN");
      const out = readResult(runtime, child);
      expect(out.ok).toBe(false);
      expect(out.error).toBe(
        "Cannot remove unsupported sandbox global: futureFixedRuntimeGlobal",
      );
      expect(out.result).toBeUndefined();
    }, 15000);

    test("dynamic import is rejected", () => {
      const out = runSandbox(runtime, 'return await import("node:fs");');
      expect(out.ok).toBe(false);
      expect(out.error).toBe("import() is not available");
      expect(out.result).toBeUndefined();
    }, 15000);

    test("dynamic import rejects with a context error even after TypeError is replaced", () => {
      const out = runSandbox(
        runtime,
        `
          ${realmAssertions}
          const originalTypeError = TypeError;
          const first = await expectLocalRejection(import("node:fs"), "first import");
          assertRealm(first, originalTypeError, "first import error");
          globalThis.TypeError = function () {
            throw new Error("Replacement TypeError must not be called");
          };
          const second = await expectLocalRejection(import("node:fs"), "second import");
          assertRealm(second, originalTypeError, "second import error");
          return [first.message, second.message];
        `,
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual([
        "import() is not available",
        "import() is not available",
      ]);
    }, 15000);

    test("facade values, functions, and promises belong to the context", () => {
      const out = runSandbox(
        runtime,
        `
          ${realmAssertions}
          for (const fn of [console.log, serviceApi.listServices, Fastly.ServiceApi,
              Headers.prototype.entries, TextEncoder.prototype.encode, crypto.subtle.digest]) {
            assertRealm(fn, Function, "facade function");
            assertCodeGenerationBlocked(fn.constructor.constructor, "facade function constructor");
          }
          assertRealm(serviceApi, Object, "API facade");
          const logged = assertRealm(console.log("realm control"), Promise, "console promise");
          await logged;
          const headers = assertRealm(new Headers({ example: "value" }), Headers, "headers");
          const iterator = assertRealm(headers.entries(), Object, "header iterator");
          const entry = assertRealm(iterator.next(), Object, "iterator result");
          assertRealm(entry.value, Array, "header entry");
          const parsed = new Response('{"values":[1,2]}').json();
          assertRealm(parsed, Promise, "response promise");
          const object = assertRealm(await parsed, Object, "response object");
          assertRealm(object.values, Array, "response values");
          const digest = crypto.subtle.digest("SHA-256", new Uint8Array());
          assertRealm(digest, Promise, "digest promise");
          assertRealm(await digest, ArrayBuffer, "digest result");
          return object.values;
        `,
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual([1, 2]);
      expect(out.console).toEqual([{ level: "log", text: "realm control" }]);
    }, 15000);

    test("caught facade and runtime errors belong to the context", () => {
      const out = runSandbox(
        runtime,
        `
          ${realmAssertions}
          await expectLocalRejection(serviceApi.thisMethodDoesNotExist(), "API failure");
          await expectLocalRejection(crypto.subtle.digest("invalid-algorithm", new Uint8Array()), "digest failure");
          await expectLocalRejection(new Response("{").json(), "response parse failure");
          for (const operation of [() => JSON.parse("{"), () => new TextDecoder("invalid-encoding")]) {
            let failure;
            try { operation(); } catch (error) { failure = error; }
            assertLocalError(failure, "synchronous failure");
          }
          return "checked";
        `,
      );
      expect(out.ok).toBe(true);
      expect(out.result).toBe("checked");
    }, 15000);

    test("stack formatting cannot be replaced and stays a string", () => {
      const out = runSandbox(
        runtime,
        `
          ${realmAssertions}
          let called = false;
          const hook = () => { called = true; return "custom stack"; };
          Error.prepareStackTrace = hook;
          if (Error.prepareStackTrace !== undefined) throw new Error("Stack hook assignment succeeded");
          for (const [label, operation] of [
            ["assign stack hook", () => { "use strict"; Error.prepareStackTrace = hook; }],
            ["redefine stack hook", () => Object.defineProperty(Error, "prepareStackTrace", { value: hook })],
            ["delete stack hook", () => { "use strict"; delete Error.prepareStackTrace; }],
          ]) {
            let failure;
            try { operation(); } catch (error) { failure = error; }
            if (failure !== undefined) assertLocalError(failure, label);
            if (Error.prepareStackTrace !== undefined) {
              throw new Error(label + " changed stack formatting");
            }
          }
          const redefined = Reflect.defineProperty(Error, "prepareStackTrace", { value: hook });
          const deleted = Reflect.deleteProperty(Error, "prepareStackTrace");
          const descriptor = Object.getOwnPropertyDescriptor(Error, "prepareStackTrace");
          const stack = new Error("stack control").stack;
          return {
            called, redefined, deleted,
            hookType: typeof descriptor.value,
            writable: descriptor.writable,
            configurable: descriptor.configurable,
            stackType: typeof stack,
            hasMessage: typeof stack === "string" && stack.includes("stack control"),
          };
        `,
      );
      expect(out).toMatchObject({ ok: true });
      expect(out.result).toEqual({
        called: false,
        redefined: false,
        deleted: false,
        hookType: "undefined",
        writable: false,
        configurable: false,
        stackType: "string",
        hasMessage: true,
      });
    }, 15000);

    test("replacing global Error cannot enable stack callbacks or expose foreign errors", () => {
      const out = runSandbox(
        runtime,
        `
          ${realmAssertions}
          const originalError = Error;
          const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Error");
          let called = false;
          const replacement = class extends originalError {};
          Object.defineProperty(replacement, "prepareStackTrace", {
            value: () => { called = true; return "custom stack"; },
          });
          const results = [];
          for (const [label, operation] of [
            ["assign global Error", () => { "use strict"; globalThis.Error = replacement; }],
            ["redefine global Error", () => Object.defineProperty(globalThis, "Error", { value: replacement })],
          ]) {
            let failure;
            try { operation(); } catch (error) { failure = error; }
            const replaced = globalThis.Error === replacement;
            const stack = new Error("replacement control").stack;
            globalThis.Error = originalError;
            if (failure !== undefined) assertLocalError(failure, label);
            results.push({ replaced, stackType: typeof stack, hasMessage: stack.includes("replacement control") });
          }
          let deletionFailure;
          let deleted;
          try { deleted = Reflect.deleteProperty(globalThis, "Error"); } catch (error) { deletionFailure = error; }
          globalThis.Error = originalError;
          if (deletionFailure !== undefined) assertLocalError(deletionFailure, "delete global Error");
          return {
            called, results, deleted,
            bindingLocked: descriptor.writable === false && descriptor.configurable === false,
            intrinsicHookType: typeof originalError.prepareStackTrace,
          };
        `,
      );
      expect(out).toMatchObject({ ok: true });
      const replaced = runtime.name === "Bun";
      expect(out.result).toEqual({
        called: false,
        results: [
          { replaced, stackType: "string", hasMessage: true },
          { replaced, stackType: "string", hasMessage: true },
        ],
        deleted: replaced,
        bindingLocked: !replaced,
        intrinsicHookType: "undefined",
      });
    }, 15000);

    test("rewritten stacks preserve the user line without sandbox frames", () => {
      const code =
        "const first = 1;\nconst second = 2;\nthrow new Error('stack control');";
      const out = runSandbox(runtime, code);
      expect(out.ok).toBe(false);
      expect(out.error).toBe("stack control");
      expect(out.line).toMatchObject({
        number: 3,
        source: "throw new Error('stack control');",
      });
      expect(out.line.column).toBeGreaterThan(0);
      expect(out.stack).toContain("user-code:3:");
      expect(out.stack).not.toMatch(
        /sandbox-facade|sandbox\.js|node:vm|node:internal/,
      );
    }, 15000);

    describe("immutable-global realm qualification", () => {
      let result;

      beforeAll(() => {
        const out = runSandbox(
          runtime,
          `
            Object.defineProperty(globalThis, "realmProbe", {
              value: 1, writable: false, configurable: false,
            });
            let failure;
            try {
              Object.defineProperty(globalThis, "realmProbe", { value: 2 });
            } catch (error) {
              failure = error;
            }
            const descriptor = Object.getOwnPropertyDescriptor(globalThis, "realmProbe");
            return {
              value: globalThis.realmProbe,
              writable: descriptor.writable,
              configurable: descriptor.configurable,
              errorName: failure?.name,
              localError: failure instanceof Error,
              localTypeError: failure instanceof TypeError,
              localConstructor: failure?.constructor === TypeError,
              localFunction: failure?.constructor?.constructor === Function,
            };
          `,
        );
        expect(out).toMatchObject({ ok: true });
        expect(out.result).toMatchObject({
          value: 1,
          writable: false,
          configurable: false,
          errorName: "TypeError",
        });
        result = out.result;
      }, 15000);

      // Bun 1.3.11 exposes a host TypeError here; an unexpected pass requires requalification.
      test.failingIf(runtime.name === "Bun")(
        "redefinition errors stay in the context (known Bun qualification blocker)",
        () => {
          expect(result).toMatchObject({
            localError: true,
            localTypeError: true,
            localConstructor: true,
            localFunction: true,
          });
        },
      );
    });

    if (runtime.name === "Node") {
      test("missing VM modules support fails before user execution", () => {
        const out = runSandbox(
          { ...runtime, args: [] },
          'return "USER_CODE_RAN";',
        );
        expect(out.ok).toBe(false);
        expect(out.error).toBe(
          "Node sandbox requires --experimental-vm-modules",
        );
        expect(out.result).toBeUndefined();
      }, 15000);
    }

    for (const probe of constructorProbes) {
      test(`${probe.name} blocks string code generation`, () => {
        const out = runSandbox(
          runtime,
          `
            ${probe.setup ?? ""}
            const target = ${probe.target};
            try {
              target("42");
            } catch (error) {
              return {
                type: typeof target,
                name: target.name,
                errorName: error.name,
                message: error.message,
              };
            }
            return { generated: true };
          `,
        );
        expect(out.ok).toBe(true);
        expect(out.result).toMatchObject({
          type: "function",
          name: probe.targetName,
          errorName: "EvalError",
        });
        expect(out.result.message).toMatch(
          /^Code generation from strings disallowed\b/,
        );
      }, 15000);
    }

    test("leaked globals: process, Bun, and require are unavailable", () => {
      const out = runSandbox(
        runtime,
        "return [typeof process, typeof Bun, typeof require];",
      );
      expect(out.ok).toBe(true);
      expect(out.result).toEqual(["undefined", "undefined", "undefined"]);
    }, 15000);
  });
}
