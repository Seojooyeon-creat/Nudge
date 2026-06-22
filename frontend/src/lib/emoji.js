// Extract the last single emoji (grapheme cluster) from arbitrary text input.
// Used so the emoji field always holds exactly one emoji — typing a new one
// replaces the previous. Uses Intl.Segmenter when available (handles ZWJ /
// skin-tone sequences), falling back to code-point splitting otherwise.
export function lastEmoji(text) {
  if (!text) return "";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let last = "";
    for (const { segment } of seg.segment(text)) last = segment;
    return last;
  }
  const cps = Array.from(text);
  return cps.length ? cps[cps.length - 1] : "";
}
