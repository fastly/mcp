import { expect, test } from "bun:test";
import { buildUsage, enrichMethod } from "../src/method-entry.js";

const field = (name, extra = {}) => ({
  name,
  type: "String",
  required: true,
  description: "",
  ...extra,
});

test("buildUsage cuts big bodies down and writes single allowed values as literals", () => {
  let deep = field("a");
  for (let i = 0; i < 6; i++) {
    deep = field("a", { type: "Nested", fields: [deep] });
  }
  const wide = Array.from({ length: 30 }, (_, i) => field(`field_${i}`));
  const params = [
    { ...deep, name: "deep" },
    field("wide", { type: "Wide", fields: wide }),
    field("text", { allowedValues: ["line one\nit's \\ done"] }),
    field("count", { type: "Number", allowedValues: [3] }),
    field("tags", { type: "[String]", allowedValues: ["a"] }),
  ];
  expect(
    buildUsage(
      enrichMethod({ apiClass: "FakeApi", method: "doThing", params }),
    ),
  ).toBe(
    "return await fakeApi.doThing({ deep: { a: { a: { a: { a: {} } } } }, wide: {}, text: 'line one\\nit\\'s \\\\ done', count: 3, tags: ['a'] });",
  );
});
