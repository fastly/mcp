import { describe, expect, test } from "bun:test";
import { buildUsage, enrichMethod } from "../src/method-entry.js";

const usage = (params) =>
  buildUsage(enrichMethod({ apiClass: "FakeApi", method: "doThing", params }));

const field = (name, extra = {}) => ({
  name,
  type: "String",
  required: true,
  description: "",
  ...extra,
});

describe("buildUsage", () => {
  test("bodies that are too deep or too long become an empty object", () => {
    let deep = field("a");
    for (let i = 0; i < 6; i++) {
      deep = field("a", { type: "Nested", fields: [deep] });
    }
    const wide = Array.from({ length: 30 }, (_, i) => field(`field_${i}`));
    expect(
      usage([
        { ...deep, name: "deep" },
        field("wide", { type: "Wide", fields: wide }),
      ]),
    ).toBe(
      "return await fakeApi.doThing({ deep: { a: { a: { a: { a: {} } } } }, wide: {} });",
    );
  });

  test("a single allowed value is written as a JavaScript literal", () => {
    expect(
      usage([
        field("text", { allowedValues: ["line one\nit's \\ done"] }),
        field("count", { type: "Number", allowedValues: [3] }),
        field("tags", { type: "[String]", allowedValues: ["a"] }),
      ]),
    ).toBe(
      "return await fakeApi.doThing({ text: 'line one\\nit\\'s \\\\ done', count: 3, tags: ['a'] });",
    );
  });
});
