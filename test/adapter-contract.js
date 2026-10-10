import { describe, expect, test } from "bun:test";
import { buildIndex } from "../src/indexer.js";
import { enrichMethod } from "../src/method-entry.js";
import { operationsOf } from "../src/method-policy.js";

/** Stands in for the SDK client and keeps the calls instead of sending them. */
export function recordingClient(data = { data: [], meta: {} }) {
  const calls = [];
  return {
    calls,
    callApi(...args) {
      calls.push(args);
      return Promise.resolve({ data, response: {} });
    },
  };
}

const WRONG = {
  String: [7, false],
  Number: ["7", 1.5],
  Boolean: ["false", 0],
  Object: [[], "x", 7],
};

const EXPECTED = {
  String: "a string",
  Number: "an integer",
  Boolean: "a boolean",
  Object: "an object",
};

/**
 * The checks every owned adapter module shares, since they all run on src/api-adapter.js.
 *
 * `operations` stays the module's own hand-written table, so a typo in the source table still cannot pass its own test. Each module supplies `sampleOptions` its own way, because NGWAF takes anything of the right type while the Log Explorer adapters check the values they are given.
 */
export function describeAdapterContract({
  name,
  methods: ownedMethods,
  classes,
  operations,
  firstParam,
  sampleOptions,
}) {
  const methods = () => ownedMethods().map(enrichMethod);
  const call = (client, entry, options) =>
    new classes[entry.apiClass](client)[entry.method](options);

  describe(`${name} adapter metadata`, () => {
    test("has the parser's shape", async () => {
      const [generated] = await buildIndex();
      const parsedKeys = [
        "apiClass",
        "constraints",
        "description",
        "httpMethod",
        "httpPath",
        "method",
        "params",
        "returnType",
      ];
      expect(Object.keys(generated)).toEqual(
        expect.arrayContaining(parsedKeys),
      );
      for (const entry of ownedMethods()) {
        expect(Object.keys(entry).sort()).toEqual(parsedKeys);
        for (const param of entry.params) {
          expect(Object.keys(param).sort()).toEqual([
            "description",
            "name",
            "required",
            "type",
          ]);
          expect(param.description).not.toBe("");
        }
      }
    });

    test("advertises exactly the adapters' own operations", () => {
      const advertised = {};
      for (const { apiClass, method } of ownedMethods()) {
        advertised[apiClass] ??= [];
        advertised[apiClass].push(method);
      }
      expect(Object.keys(advertised).sort()).toEqual(
        Object.keys(classes).sort(),
      );
      for (const [apiClass, Ctor] of Object.entries(classes)) {
        expect([...operationsOf(Ctor)].sort()).toEqual(
          advertised[apiClass].sort(),
        );
      }
    });

    test("returns fresh objects on every call", () => {
      ownedMethods()[0].params[0].name = "changed";
      expect(ownedMethods()[0].params[0].name).toBe(firstParam);
    });

    test("lists the expected paths and options", () => {
      expect(
        methods().map((entry) => [
          `${entry.apiClass}.${entry.method}`,
          entry.httpPath,
          entry.requiredParams,
          Object.fromEntries(
            entry.params
              .filter((p) => !p.required)
              .map((p) => [p.name, p.type]),
          ),
        ]),
      ).toEqual(operations);
      // Usage examples show '...' for every required option, which only fits strings.
      for (const entry of methods()) {
        for (const param of entry.params.filter((p) => p.required)) {
          expect(param.type).toBe("String");
        }
      }
    });
  });

  describe(`every ${name} adapter`, () => {
    test("a missing, empty or dot-segment required option is refused before any request", async () => {
      for (const entry of methods()) {
        const client = recordingClient();
        const valid = sampleOptions(entry, entry.requiredParams);
        const [first] = entry.requiredParams;
        if (first) {
          await expect(call(client, entry)).rejects.toThrow(
            `Missing the required parameter '${first}'.`,
          );
        }
        for (const option of entry.requiredParams) {
          const missing = `Missing the required parameter '${option}'.`;
          const { [option]: _, ...without } = valid;
          for (const options of [
            without,
            { ...valid, [option]: "" },
            { ...valid, [option]: null },
          ]) {
            await expect(call(client, entry, options)).rejects.toThrow(missing);
          }
          if (!entry.pathParams.includes(option)) continue;
          for (const id of [".", ".."]) {
            await expect(
              call(client, entry, { ...valid, [option]: id }),
            ).rejects.toThrow(`'${option}' must be an ID, not '${id}'.`);
          }
        }
        expect(client.calls).toEqual([]);
      }
    });

    test("unknown options, wrong types and non-objects are refused before any request", async () => {
      for (const entry of methods()) {
        const client = recordingClient();
        const valid = sampleOptions(entry, entry.requiredParams);
        const accepted = entry.params.length
          ? `Its options are ${entry.params.map((p) => p.name).join(", ")}.`
          : "It takes no options.";
        // Object.prototype names must not count as options.
        for (const unknown of [
          "nope",
          "__proto__",
          "constructor",
          "toString",
        ]) {
          const options = JSON.parse(`{"${unknown}": "x"}`);
          await expect(
            call(client, entry, { ...valid, ...options }),
          ).rejects.toThrow(
            `${entry.method} does not accept '${unknown}'. ${accepted}`,
          );
        }
        for (const param of entry.params) {
          for (const wrong of WRONG[param.type]) {
            await expect(
              call(client, entry, { ...valid, [param.name]: wrong }),
            ).rejects.toThrow(
              `'${param.name}' must be ${EXPECTED[param.type]}.`,
            );
          }
        }
        for (const options of [[], "x", null]) {
          await expect(call(client, entry, options)).rejects.toThrow(
            `${entry.method} takes a single options object.`,
          );
        }
        expect(client.calls).toEqual([]);
      }
    });
  });
}
