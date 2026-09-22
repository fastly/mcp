import { types } from "node:util";

const mapEntries = Map.prototype.entries;
const setValues = Set.prototype.values;
const dateToISOString = Date.prototype.toISOString;
const regExpToString = RegExp.prototype.toString;

// The label is cosmetic, so a spoofed or throwing Symbol.toStringTag only
// mislabels the view instead of corrupting the result.
function viewName(val) {
  try {
    const name = Object.prototype.toString.call(val).slice(8, -1);
    return name || "TypedArray";
  } catch {
    return types.isDataView(val) ? "DataView" : "TypedArray";
  }
}

// Plain assignment of a "__proto__" key would invoke the legacy prototype
// setter, dropping the field and mutating the result's prototype.
export function setKey(obj, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else {
    obj[key] = value;
  }
}

// User getters can throw, and a throw while rendering a result must not
// turn a successful execution into an error.
function readProp(obj, key) {
  try {
    return { ok: true, value: obj[key] };
  } catch {
    return { ok: false };
  }
}

/**
 * Turns a value into plain JSON data that fits in `maxSize` bytes, making it shallower level by level if it has to.
 * A shallower value has to fit in `reducedMaxSize`, which lets a caller that would refuse a large cut-down value anyway skip the work of producing one.
 * With `shrink` off, an oversized value is not cut down at all.
 *
 * `reduced` says whether cutting happened, because a value cut down to fit is not what the snippet returned and the host must not pass it off as such.
 */
export function serializeResult(
  value,
  {
    maxDepth = 6,
    maxSize = 100_000,
    reducedMaxSize = maxSize,
    shrink = true,
  } = {},
) {
  function walkProp(obj, key, depth, seen, depthLimit) {
    const read = readProp(obj, key);
    return read.ok
      ? walk(read.value, depth + 1, seen, depthLimit)
      : "[getter threw]";
  }

  function walk(val, depth, seen, depthLimit) {
    if (depth > depthLimit) return "[truncated: max depth]";
    if (val === null || val === undefined) return val;

    const type = typeof val;
    if (type === "bigint") return `${val.toString()}n`;
    if (type === "function") return "[function]";
    if (type === "symbol") return val.toString();
    if (type === "number") return Number.isFinite(val) ? val : String(val);
    if (type === "boolean" || type === "string") return val;

    if (typeof Buffer !== "undefined" && Buffer.isBuffer(val)) {
      try {
        return `[Buffer: ${val.length} bytes]`;
      } catch {
        return "[Buffer: detached]";
      }
    }

    // The util.types brand checks and captured intrinsics work across
    // realms and cannot be overridden from user code. Detached buffers
    // make byteLength throw.
    if (ArrayBuffer.isView(val)) {
      const name = viewName(val);
      try {
        return `[${name}: ${val.byteLength} bytes]`;
      } catch {
        return `[${name}: detached]`;
      }
    }

    if (type === "object") {
      if (types.isDate(val)) {
        try {
          return dateToISOString.call(val);
        } catch {
          return "Invalid Date";
        }
      }
      if (types.isRegExp(val)) {
        try {
          return regExpToString.call(val);
        } catch {
          return "[RegExp]";
        }
      }
      if (types.isAnyArrayBuffer(val)) {
        try {
          return `[ArrayBuffer: ${val.byteLength} bytes]`;
        } catch {
          return "[ArrayBuffer: detached]";
        }
      }

      if (seen.has(val)) return "[circular]";
      seen.add(val);

      let normalized;
      if (types.isNativeError(val)) {
        const name = readProp(val, "name");
        const message = readProp(val, "message");
        normalized = {
          name:
            name.ok && typeof name.value === "string" ? name.value : "Error",
          message:
            message.ok && typeof message.value === "string"
              ? message.value
              : "",
        };
        for (const k of Object.keys(val)) {
          setKey(normalized, k, walkProp(val, k, depth, seen, depthLimit));
        }
      } else if (types.isMap(val)) {
        normalized = {
          _type: "Map",
          entries: Array.from(mapEntries.call(val), ([k, v]) => [
            walk(k, depth + 1, seen, depthLimit),
            walk(v, depth + 1, seen, depthLimit),
          ]),
        };
      } else if (types.isSet(val)) {
        normalized = {
          _type: "Set",
          values: Array.from(setValues.call(val), (v) =>
            walk(v, depth + 1, seen, depthLimit),
          ),
        };
      } else if (Array.isArray(val)) {
        normalized = new Array(val.length);
        for (let idx = 0; idx < val.length; idx++) {
          if (!(idx in val)) continue;
          normalized[idx] = walkProp(val, idx, depth, seen, depthLimit);
        }
      } else {
        normalized = {};
        for (const k of Object.keys(val)) {
          setKey(normalized, k, walkProp(val, k, depth, seen, depthLimit));
        }
      }
      seen.delete(val);
      return normalized;
    }

    return val;
  }

  let fullBytes;
  for (let depthLimit = maxDepth; depthLimit >= 1; depthLimit--) {
    // Hostile proxies can still throw from traps no guarded read covers
    // (ownKeys, getPrototypeOf, ...); a value that refuses to be read
    // becomes a description of that fact rather than a failed execution.
    let normalized;
    try {
      normalized = walk(value, 0, new WeakSet(), depthLimit);
    } catch (err) {
      let msg;
      try {
        msg = String(err?.message ?? err);
      } catch {
        msg = "unknown error";
      }
      return { value: `[unserializable: ${msg}]` };
    }
    const json = JSON.stringify(normalized);
    if (json === undefined) return { value: null };
    const jsonBytes = Buffer.byteLength(json);
    if (depthLimit === maxDepth) {
      if (jsonBytes <= maxSize) return { value: normalized };
      fullBytes = jsonBytes;
    } else if (jsonBytes <= reducedMaxSize) {
      return {
        value: normalized,
        reduced: { bytes: fullBytes, depth: depthLimit },
      };
    }

    if (depthLimit === 1 || !shrink) {
      // This re-enumerates the value, and a proxy that tolerated the first
      // enumeration may still throw on this one.
      let previewKeys;
      if (typeof value === "object" && value !== null) {
        try {
          // Key names can be as long as anything else, and this stand-in has to stay small.
          previewKeys = Object.keys(value)
            .slice(0, 20)
            .map((k) => (k.length > 100 ? `${k.slice(0, 100)}...` : k));
        } catch {}
      }
      return {
        value: {
          _truncated: true,
          _message: `Result too large to serialize (${fullBytes} bytes). Return fewer fields, or page through the data and process it inside your code.`,
          _previewKeys: previewKeys,
        },
        reduced: { bytes: fullBytes, depth: 0 },
      };
    }
  }
}

export function safeSerialize(value, options) {
  return serializeResult(value, options).value;
}
