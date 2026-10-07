// Web stream helpers shared by the Node server and the Fastly Compute build.

/**
 * Reads `body` into one Uint8Array, or resolves with undefined and cancels the rest once it goes over `limit` bytes.
 * A missing body reads as empty.
 * `onReader` gets the reader before the first read, so a caller can cancel it from elsewhere.
 */
export async function readBounded(body, limit, onReader) {
  const reader = body?.getReader();
  const chunks = [];
  let total = 0;
  if (reader) {
    onReader?.(reader);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        reader.cancel().catch(() => {});
        return undefined;
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
