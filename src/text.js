// Fastly Compute has no Buffer, so these work on plain strings and fall back to TextEncoder there.

/** `text.slice(0, end)`, minus the first half of a character that takes two UTF-16 units, such as an emoji. */
export function sliceWhole(text, end) {
  const last = text.charCodeAt(end - 1);
  return text.slice(0, last >= 0xd800 && last <= 0xdbff ? end - 1 : end);
}

const encoder = new TextEncoder();

/** How many bytes `text` takes in UTF-8, with a lone surrogate counted as the replacement character it becomes. */
export const utf8Length =
  typeof Buffer === "function"
    ? (text) => Buffer.byteLength(text)
    : (text) => encoder.encode(text).length;
