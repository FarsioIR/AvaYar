const PERSIAN_STOP_WORDS = new Set([
  "از", "به", "در", "با", "برای", "که", "این", "آن", "را", "و", "یا",
  "یک", "می", "است", "هست", "شد", "شود", "کرد", "کند", "تا", "بر", "اما",
  "اگر", "هم", "نیز", "خود", "هر", "های", "هایش", "بود", "باشد", "شده",
  "کرده", "دارند", "دارد", "دارای", "بین", "پس", "پس از", "همچنین"
]);

const CONCLUSION_HINTS = [
  "جمع‌بندی",
  "در نهایت",
  "نتیجه",
  "ارزش خرید",
  "به طور کلی",
  "به‌طور کلی",
  "در مجموع",
  "با این حال"
];

const IMPORTANCE_HINTS = [
  "مهم",
  "اصلی",
  "مزیت",
  "ضعف",
  "نقطه قوت",
  "نقطه ضعف",
  "بهترین",
  "مقایسه",
  "عملکرد",
  "پشتیبانی",
  "قیمت",
  "باتری",
  "دوربین",
  "نمایشگر"
];

function normalizeWord(word) {
  return String(word || "")
    .toLocaleLowerCase("fa-IR")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function wordsOf(text) {
  return String(text || "")
    .split(/\s+/u)
    .map(normalizeWord)
    .filter(Boolean);
}

function contentWordsOf(text) {
  return wordsOf(text).filter(
    (word) => word.length >= 3 && !PERSIAN_STOP_WORDS.has(word)
  );
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .length;
}

function containsAny(text, hints) {
  const value = String(text || "").toLocaleLowerCase("fa-IR");
  return hints.some((hint) => value.includes(hint));
}

function numberDensity(text) {
  const matches = String(text || "").match(/[0-9۰-۹]+(?:[.,٫][0-9۰-۹]+)?/gu);
  return matches?.length ?? 0;
}

function similarity(aWords, bWords) {
  if (!aWords.size || !bWords.size) {
    return 0;
  }

  let intersection = 0;

  for (const word of aWords) {
    if (bWords.has(word)) {
      intersection += 1;
    }
  }

  return intersection / Math.min(aWords.size, bWords.size);
}

function resolveTargetWords(sourceWords, ratioOrOptions) {
  if (
    ratioOrOptions &&
    typeof ratioOrOptions === "object" &&
    Number.isFinite(ratioOrOptions.targetWords)
  ) {
    return Math.max(
      18,
      Math.min(500, Math.round(ratioOrOptions.targetWords))
    );
  }

  if (typeof ratioOrOptions === "number" && Number.isFinite(ratioOrOptions)) {
    return Math.max(
      18,
      Math.min(500, Math.round(sourceWords * ratioOrOptions))
    );
  }

  if (sourceWords <= 80) {
    return Math.max(18, Math.round(sourceWords * 0.55));
  }

  if (sourceWords <= 180) {
    return Math.max(35, Math.round(sourceWords * 0.5));
  }

  if (sourceWords <= 450) {
    return 120;
  }

  if (sourceWords <= 900) {
    return 190;
  }

  if (sourceWords <= 1600) {
    return 300;
  }

  return 400;
}

export function splitSentences(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/(?<=[.!؟?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function summarizePersian(text, ratioOrOptions) {
  const source = String(text ?? "").trim();
  const sentences = splitSentences(source);
  const sourceWords = wordCount(source);

  if (!source || sentences.length <= 2) {
    return source;
  }

  const frequencies = new Map();

  for (const sentence of sentences) {
    for (const word of contentWordsOf(sentence)) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
  }

  const targetWords = resolveTargetWords(
    sourceWords,
    ratioOrOptions
  );

  const scored = sentences.map((sentence, index) => {
    const contentWords = contentWordsOf(sentence);
    const uniqueWords = new Set(contentWords);

    const frequencyScore = contentWords.reduce(
      (total, word) => total + Math.log1p(frequencies.get(word) ?? 0),
      0
    );

    const sentenceWords = Math.max(1, wordCount(sentence));
    const normalizedFrequency = frequencyScore / Math.sqrt(sentenceWords);

    let positionBoost = 0;

    if (index === 0) {
      positionBoost += 4;
    } else if (index === 1) {
      positionBoost += 2.5;
    }

    if (index >= Math.max(0, sentences.length - 4)) {
      positionBoost += 1.5;
    }

    const conclusionBoost = containsAny(sentence, CONCLUSION_HINTS)
      ? 4
      : 0;

    const importanceBoost = containsAny(sentence, IMPORTANCE_HINTS)
      ? 1.5
      : 0;

    const numericBoost = Math.min(2, numberDensity(sentence) * 0.4);

    const lengthPenalty = sentenceWords > 70
      ? 1.5
      : sentenceWords < 6
        ? 1
        : 0;

    return {
      index,
      sentence,
      wordCount: sentenceWords,
      wordSet: uniqueWords,
      score:
        normalizedFrequency +
        positionBoost +
        conclusionBoost +
        importanceBoost +
        numericBoost -
        lengthPenalty
    };
  });

  const ranked = [...scored].sort(
    (a, b) => b.score - a.score || a.index - b.index
  );

  const selected = [];
  let selectedWords = 0;

  for (const candidate of ranked) {
    const tooSimilar = selected.some(
      (item) => similarity(candidate.wordSet, item.wordSet) >= 0.72
    );

    if (tooSimilar) {
      continue;
    }

    const nextTotal = selectedWords + candidate.wordCount;

    if (
      selected.length >= 2 &&
      nextTotal > targetWords * 1.12
    ) {
      continue;
    }

    selected.push(candidate);
    selectedWords = nextTotal;

    if (selectedWords >= targetWords) {
      break;
    }
  }

  if (!selected.length) {
    return sentences[0];
  }

  const firstSentence = scored[0];

  if (
    firstSentence &&
    !selected.some((item) => item.index === firstSentence.index) &&
    selectedWords + firstSentence.wordCount <= targetWords * 1.35
  ) {
    selected.push(firstSentence);
    selectedWords += firstSentence.wordCount;
  }

  const conclusionCandidate = [...scored]
    .reverse()
    .find((item) => containsAny(item.sentence, CONCLUSION_HINTS));

  if (
    conclusionCandidate &&
    !selected.some((item) => item.index === conclusionCandidate.index) &&
    selectedWords + conclusionCandidate.wordCount <= targetWords * 1.35
  ) {
    selected.push(conclusionCandidate);
  }

  const summary = selected
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ")
    .trim();

  if (summary.length >= source.length && sentences.length > 2) {
    return sentences
      .slice(0, Math.max(1, sentences.length - 1))
      .join(" ")
      .trim();
  }

  return summary;
}
