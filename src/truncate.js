import { BUILTIN_PATTERNS, scan } from "fast-cipher/tokens";

/** `text.slice(0, end)`, minus the first half of a character that takes two UTF-16 units, such as an emoji. */
export function sliceWhole(text, end) {
  const last = text.charCodeAt(end - 1);
  return text.slice(0, last >= 0xd800 && last <= 0xdbff ? end - 1 : end);
}

/**
 * The first `limit` characters of `text` followed by `suffix`, or fewer when the cut would go through a secret.
 * Text within the limit comes back as it is.
 *
 * Secrets are encrypted after text leaves here, and only when the shield recognizes them.
 * It can't recognize part of a token, so a token the cut would split is left out whole.
 *
 * `text` must not have been cut through a token already, since a fragment can't be recognized here either.
 * Text this function cut is fine to cut again.
 */
export function truncateOutsideSecrets(text, limit, suffix = "") {
  if (text.length <= limit) return text;
  let cut = limit;
  for (const { start, end } of scan(text, BUILTIN_PATTERNS)) {
    if (start >= cut) break;
    if (end > cut) {
      cut = start;
      break;
    }
  }
  return sliceWhole(text, cut) + suffix;
}
