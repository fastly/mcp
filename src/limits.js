/**
 * Size budgets shared by the sandbox child and its parent, all in bytes.
 *
 * These used to be one 100 KB number.
 * They are separate now because a result that is too large to show the model is not too large to keep.
 */

/** What one tool result may put in front of the model. */
export const INLINE_RESULT_BYTES = 100_000;

/** Ceiling on one stored result file, so a snippet can't fill the disk. */
export const RESULT_FILE_BYTES = 4_000_000;

/** Ceiling on the preview that stands in for a stored result. */
export const PREVIEW_BYTES = 16_000;

/**
 * What one Fastly API response may hand a snippet.
 * The response never leaves the sandbox, so this is about leaving the code room to filter.
 */
export const API_RESPONSE_BYTES = 4_000_000;
