export function safeSerialize(value, { maxDepth = 6, maxSize = 100_000 } = {}) {
  function walk(val, depth, seen, depthLimit) {
    if (depth > depthLimit) return "[truncated: max depth]";
    if (val === null || val === undefined) return val;

    const type = typeof val;
    if (type === "bigint") return `${val.toString()}n`;
    if (type === "function") return "[function]";
    if (type === "symbol") return val.toString();
    if (type === "boolean" || type === "number" || type === "string")
      return val;

    if (
      (typeof Buffer !== "undefined" && Buffer.isBuffer(val)) ||
      val instanceof Uint8Array
    ) {
      return `[Buffer: ${val.length} bytes]`;
    }

    if (type === "object") {
      if (seen.has(val)) return "[circular]";
      seen.add(val);

      let normalized;
      if (Array.isArray(val)) {
        normalized = val.map((v) => walk(v, depth + 1, seen, depthLimit));
      } else {
        normalized = {};
        for (const [k, v] of Object.entries(val)) {
          normalized[k] = walk(v, depth + 1, seen, depthLimit);
        }
      }
      seen.delete(val);
      return normalized;
    }

    return val;
  }

  for (let depthLimit = maxDepth; depthLimit >= 1; depthLimit--) {
    const normalized = walk(value, 0, new WeakSet(), depthLimit);
    const json = JSON.stringify(normalized);
    if (json === undefined) return null; // undefined, functions, symbols at top level
    if (json.length <= maxSize) return normalized;

    if (depthLimit === 1) {
      return {
        _truncated: true,
        _message: `Result too large (${json.length} bytes). Reduce scope of your query.`,
        _previewKeys:
          typeof value === "object" && value !== null
            ? Object.keys(value).slice(0, 20)
            : undefined,
      };
    }
  }
}
