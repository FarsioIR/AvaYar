const PERSIAN_STOP_WORDS = new Set([
  "از", "به", "در", "با", "برای", "که", "این", "آن", "را", "و", "یا",
  "یک", "می", "است", "هست", "شد", "شود", "کرد", "کند", "تا", "بر", "اما",
  "اگر", "هم", "نیز", "خود", "هر", "های", "هایش", "بود", "باشد"
]);

function normalizeWord(word) {
  return word
    .toLocaleLowerCase("fa-IR")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function splitSentences(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/(?<=[.!؟?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function summarizePersian(text, ratio = 0.35) {
  const sentences = splitSentences(text);

  if (sentences.length <= 2) {
    return sentences.join(" ");
  }

  const frequencies = new Map();

  for (const sentence of sentences) {
    for (const rawWord of sentence.split(/\s+/u)) {
      const word = normalizeWord(rawWord);
      if (!word || word.length < 3 || PERSIAN_STOP_WORDS.has(word)) {
        continue;
      }

      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
  }

  const scored = sentences.map((sentence, index) => {
    const words = sentence
      .split(/\s+/u)
      .map(normalizeWord)
      .filter(Boolean);

    const rawScore = words.reduce(
      (total, word) => total + (frequencies.get(word) ?? 0),
      0
    );

    const lengthPenalty = Math.max(1, Math.sqrt(words.length));

    return {
      index,
      sentence,
      score: rawScore / lengthPenalty
    };
  });

  const targetCount = Math.max(
    1,
    Math.min(sentences.length - 1, Math.ceil(sentences.length * ratio))
  );

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, targetCount)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ");
}
