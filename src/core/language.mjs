const ARABIC_SCRIPT = /[\u0600-\u06ff]/gu;
const LATIN_SCRIPT = /[A-Za-z]/g;
const PERSIAN_SPECIFIC = /[پچژگکی]/gu;

function countMatches(text, expression) {
  return text.match(expression)?.length ?? 0;
}

export function detectLanguage(text) {
  const normalized = String(text ?? "").trim();

  if (!normalized) {
    return {
      code: "unknown",
      confidence: 0,
      arabicScriptCount: 0,
      latinScriptCount: 0
    };
  }

  const arabicScriptCount = countMatches(normalized, ARABIC_SCRIPT);
  const latinScriptCount = countMatches(normalized, LATIN_SCRIPT);
  const persianSpecificCount = countMatches(normalized, PERSIAN_SPECIFIC);
  const considered = Math.max(1, arabicScriptCount + latinScriptCount);
  const arabicRatio = arabicScriptCount / considered;

  const isPersianLike =
    persianSpecificCount > 0 ||
    (arabicScriptCount >= 4 && arabicRatio >= 0.55);

  return {
    code: isPersianLike ? "fa" : "non-fa",
    confidence: Number((isPersianLike ? arabicRatio : 1 - arabicRatio).toFixed(3)),
    arabicScriptCount,
    latinScriptCount
  };
}
