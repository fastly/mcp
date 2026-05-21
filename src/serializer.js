export function safeSerialize(value, { maxDepth = 6, maxSize = 100_000 } = {}) {
  function walk(val, depth, seen, depthLimit) {
    if (depth > depthLimit) return "[truncated: max depth]";
    if (val === null || val === undefined) return val;
    if (typeof val === "bigint") return `${val.toString()}n`;
    if (typeof val === "function") return "[function]";
    if (typeof val === "symbol") return val.toString();
    if (
      typeof val === "boolean" ||
      typeof val === "number" ||
      typeof val === "string"
    )
      return val;

    if (
      (typeof Buffer !== "undefined" && Buffer.isBuffer(val)) ||
      val instanceof Uint8Array
    ) {
      return `[Buffer: ${val.length} bytes]`;
    }

    if (typeof val === "object") {
      if (seen.has(val)) return "[circular]";
      seen.add(val);

      if (Array.isArray(val)) {
        return val.map((v) => walk(v, depth + 1, seen, depthLimit));
      }

      const out = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = walk(v, depth + 1, seen, depthLimit);
      }
      return out;
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
