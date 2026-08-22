const MAX_EXTRACTED_CHARS = 80_000;
const MIN_ARTICLE_CHARS = 180;

const ARTICLE_SELECTORS = [
  "article",
  "[itemprop='articleBody']",
  "[data-testid*='article']",
  "[class*='article-body']",
  "[class*='articleBody']",
  "[class*='article-content']",
  "[class*='articleContent']",
  "[class*='post-content']",
  "[class*='postContent']",
  "[class*='news-content']",
  "[class*='newsContent']",
  "main",
  "[role='main']"
];

const HARD_NOISE_SELECTOR = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "iframe",
  "svg",
  "canvas",
  "[role='navigation']",
  "[role='complementary']",
  "[aria-hidden='true']",
  "[class*='breadcrumb']",
  "[class*='share']",
  "[id*='share']",
  "[class*='sidebar']",
  "[class*='comment']",
  "[id*='comment']"
].join(",");

const STRONG_NOISE_SELECTOR = [
  "[class*='advert']",
  "[id*='advert']",
  "[class*='advertisement']",
  "[id*='advertisement']",
  "[class*='native-ad']",
  "[class*='native_ad']",
  "[class*='sponsor']",
  "[id*='sponsor']",
  "[class*='sponsored']",
  "[class*='promo']",
  "[id*='promo']",
  "[class*='promotion']",
  "[class*='related']",
  "[id*='related']",
  "[class*='recommend']",
  "[id*='recommend']",
  "[class*='social']",
  "[id*='social']",
  "[class*='follow']",
  "[id*='follow']"
].join(",");

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n[ \t]+/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function compactText(value) {
  return normalizeText(value)
    .replace(/\s+/gu, " ")
    .trim();
}

function looksLikeTerminalBoundary(text) {
  const value = normalizeText(text).toLowerCase();
  const phrases = [
    "در شبکه های اجتماعی دنبال کنید",
    "در شبکه‌های اجتماعی دنبال کنید",
    "ما را در شبکه های اجتماعی دنبال کنید",
    "ما را در شبکه‌های اجتماعی دنبال کنید",
    "follow us on social media",
    "follow us on",
    "related posts",
    "recommended for you",
    "مطالب مرتبط",
    "پیشنهاد برای شما"
  ];
  return phrases.some((phrase) => value.includes(phrase));
}

function looksLikeAdvertisement(text) {
  const value = normalizeText(text).toLowerCase();
  if (!value) {
    return false;
  }

  const commercialPhrases = [
    "ثبت سفارش",
    "سفارش دهید",
    "تماس بگیرید",
    "ارسال رایگان",
    "فروش ویژه",
    "همین حالا خرید",
    "مشاهده محصول",
    "پرداخت اقساطی",
    "buy now",
    "shop now",
    "order now",
    "special offer",
    "limited offer",
    "free shipping",
    "sponsored",
    "advertisement"
  ];

  if (commercialPhrases.some((phrase) => value.includes(phrase))) {
    return true;
  }

  const productClaims = [
    "درمان دائمی",
    "درمان قطعی",
    "رفع سفیدی",
    "بازگشت رنگ طبیعی",
    "صددرصد طبیعی",
    "۱۰۰٪ طبیعی",
    "100% طبیعی",
    "guaranteed result",
    "permanent treatment",
    "100% natural"
  ].filter((phrase) => value.includes(phrase)).length;

  const percentCount = (value.match(/\d+\s*(?:%|٪)/gu) || []).length;
  const emojiCount = (value.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  const moneyPattern = /(?:\d[\d,.٬]*\s*(?:تومان|تومن|ریال)|(?:تومان|تومن|ریال)\s*\d)/u;

  return (
    (value.length < 280 && productClaims >= 1 && percentCount >= 1) ||
    (value.length < 220 && productClaims >= 2) ||
    (value.length < 260 && emojiCount >= 3) ||
    (value.length < 260 && moneyPattern.test(value) && /[!❗❌]/u.test(value))
  );
}

function linkDensity(node, text) {
  const linkText = normalizeText(
    [...node.querySelectorAll("a")]
      .map((link) => link.textContent)
      .join(" ")
  );
  return text.length ? linkText.length / text.length : 1;
}

function removeKnownNoise(root) {
  for (const node of [
    ...root.querySelectorAll(`${HARD_NOISE_SELECTOR},${STRONG_NOISE_SELECTOR}`)
  ]) {
    node.remove();
  }
}

function titleFromDocument() {
  const metaTitle = document
    .querySelector("meta[property='og:title']")
    ?.getAttribute("content");
  return normalizeText(
    metaTitle ||
      document.querySelector("h1")?.textContent ||
      document.title ||
      location.hostname
  );
}

function blockFromNode(node, text) {
  const tag = node.tagName?.toUpperCase();

  if (/^H[2-4]$/u.test(tag || "")) {
    return {
      type: "heading",
      level: Number(tag.slice(1)),
      text
    };
  }

  if (tag === "BLOCKQUOTE") {
    return {
      type: "quote",
      text
    };
  }

  if (tag === "LI") {
    return {
      type: "list-item",
      text
    };
  }

  return {
    type: "paragraph",
    text
  };
}

function blocksToText(blocks) {
  return normalizeText(
    blocks
      .map((block) => block.text)
      .join("\n\n")
  );
}

function paragraphBlocksFromText(text) {
  const normalized = normalizeText(text);
  let pieces = normalized.split(/\n{2,}/u);

  if (pieces.length === 1) {
    pieces = normalized.split(/\n/u);
  }

  return pieces
    .map((piece) => normalizeText(piece))
    .filter(Boolean)
    .map((piece) => ({
      type: "paragraph",
      text: piece
    }));
}

function cleanBlocksFromRoot(root) {
  removeKnownNoise(root);
  const nodes = [
    ...root.querySelectorAll("h2, h3, h4, p, blockquote, li")
  ];
  const blocks = [];
  const seen = new Set();
  let establishedChars = 0;

  for (const node of nodes) {
    const text = normalizeText(node.textContent);
    if (!text || seen.has(text)) {
      continue;
    }

    if (looksLikeTerminalBoundary(text) || looksLikeAdvertisement(text)) {
      if (establishedChars >= MIN_ARTICLE_CHARS) {
        break;
      }
      continue;
    }

    if (linkDensity(node, text) > 0.55) {
      if (establishedChars >= MIN_ARTICLE_CHARS) {
        break;
      }
      continue;
    }

    const isHeading = /^H[2-4]$/u.test(node.tagName || "");
    if (!isHeading && text.length < 30) {
      continue;
    }

    seen.add(text);
    blocks.push(blockFromNode(node, text));
    if (!isHeading) {
      establishedChars += text.length;
    }
  }

  return blocks;
}

function structuredBlocksFromDom(articleBody) {
  const bodyCompact = compactText(articleBody);
  const nodes = [
    ...document.querySelectorAll("h2, h3, h4, p, blockquote, li")
  ];
  const blocks = [];
  const seen = new Set();
  let pendingHeading = null;
  let started = false;
  let matchedChars = 0;

  for (const node of nodes) {
    if (
      node.closest(HARD_NOISE_SELECTOR) ||
      node.closest(STRONG_NOISE_SELECTOR)
    ) {
      continue;
    }

    const text = normalizeText(node.textContent);
    if (!text || seen.has(text)) {
      continue;
    }

    if (looksLikeTerminalBoundary(text) || looksLikeAdvertisement(text)) {
      if (started && matchedChars >= MIN_ARTICLE_CHARS) {
        break;
      }
      pendingHeading = null;
      continue;
    }

    const tag = node.tagName?.toUpperCase();
    if (/^H[2-4]$/u.test(tag || "")) {
      pendingHeading = blockFromNode(node, text);
      continue;
    }

    if (text.length < 30 || linkDensity(node, text) > 0.55) {
      continue;
    }

    const compact = compactText(text);
    const probe = compact.length > 160
      ? compact.slice(0, 160)
      : compact;
    const matchesArticle =
      bodyCompact.includes(compact) ||
      (probe.length >= 50 && bodyCompact.includes(probe));

    if (!matchesArticle) {
      continue;
    }

    if (pendingHeading && !seen.has(pendingHeading.text)) {
      blocks.push(pendingHeading);
      seen.add(pendingHeading.text);
    }
    pendingHeading = null;

    blocks.push(blockFromNode(node, text));
    seen.add(text);
    started = true;
    matchedChars += text.length;
  }

  return matchedChars >= MIN_ARTICLE_CHARS
    ? blocks
    : [];
}

function findArticleObject(value, results = []) {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findArticleObject(item, results);
    }
    return results;
  }

  const body = normalizeText(value.articleBody);
  if (body.length >= MIN_ARTICLE_CHARS) {
    const enrichedBlocks = structuredBlocksFromDom(body);
    const blocks = enrichedBlocks.length
      ? enrichedBlocks
      : paragraphBlocksFromText(body);

    results.push({
      title: normalizeText(value.headline || value.name || titleFromDocument()),
      text: blocksToText(blocks),
      blocks,
      method: "json-ld"
    });
  }

  for (const child of Object.values(value)) {
    findArticleObject(child, results);
  }

  return results;
}

function structuredDataExtraction() {
  const candidates = [];

  for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
    try {
      const parsed = JSON.parse(script.textContent || "null");
      findArticleObject(parsed, candidates);
    } catch {
      // Ignore malformed structured data blocks.
    }
  }

  return candidates
    .filter(({ text }) => !looksLikeAdvertisement(text))
    .sort((a, b) => b.text.length - a.text.length)[0] || null;
}

function readabilityExtraction() {
  if (typeof globalThis.Readability !== "function") {
    return null;
  }

  const clone = document.cloneNode(true);
  removeKnownNoise(clone);

  let parsed;
  try {
    parsed = new globalThis.Readability(clone, {
      charThreshold: MIN_ARTICLE_CHARS,
      keepClasses: false
    }).parse();
  } catch {
    return null;
  }

  if (!parsed?.content) {
    return null;
  }

  const parsedDocument = new DOMParser().parseFromString(parsed.content, "text/html");
  let blocks = cleanBlocksFromRoot(parsedDocument.body);
  let text = blocksToText(blocks);

  if (text.length < MIN_ARTICLE_CHARS) {
    text = normalizeText(parsed.textContent);
    blocks = paragraphBlocksFromText(text);
  }

  if (text.length < MIN_ARTICLE_CHARS) {
    return null;
  }

  return {
    title: normalizeText(parsed.title || titleFromDocument()),
    text,
    blocks,
    method: "readability"
  };
}

function bestContiguousSegment(root) {
  const nodes = [
    ...root.querySelectorAll("h2, h3, h4, p, blockquote, li")
  ];
  const segments = [];
  let current = [];
  let currentChars = 0;
  const seen = new Set();

  function flush() {
    if (!current.length) {
      return;
    }

    const text = blocksToText(current);
    if (text.length >= MIN_ARTICLE_CHARS) {
      const punctuation = (text.match(/[.!?؟؛:]/gu) || []).length;
      segments.push({
        blocks: current,
        text,
        score: text.length + current.length * 220 + punctuation * 24
      });
    }

    current = [];
    currentChars = 0;
  }

  for (const node of nodes) {
    if (node.closest(HARD_NOISE_SELECTOR)) {
      continue;
    }

    const text = normalizeText(node.textContent);
    if (!text || seen.has(text)) {
      continue;
    }

    const isBoundary =
      node.closest(STRONG_NOISE_SELECTOR) ||
      looksLikeTerminalBoundary(text) ||
      looksLikeAdvertisement(text) ||
      linkDensity(node, text) > 0.62;

    if (isBoundary) {
      flush();
      continue;
    }

    const isHeading = /^H[2-4]$/u.test(node.tagName || "");
    if (!isHeading && text.length < 35) {
      continue;
    }

    const sentenceSignals = (text.match(/[.!?؟؛:]/gu) || []).length;
    const articleLike =
      isHeading ||
      text.length >= 90 ||
      sentenceSignals >= 1 ||
      ["P", "BLOCKQUOTE"].includes(node.tagName);

    if (!articleLike) {
      continue;
    }

    seen.add(text);
    current.push(blockFromNode(node, text));
    if (!isHeading) {
      currentChars += text.length;
    }
  }

  flush();
  return segments.sort((a, b) => b.score - a.score)[0] || null;
}

function semanticExtraction() {
  const ranked = ARTICLE_SELECTORS
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter((element, index, all) => all.indexOf(element) === index)
    .map((element) => {
      const segment = bestContiguousSegment(element);
      if (!segment) {
        return null;
      }
      const semanticBonus = element.matches("article, [itemprop='articleBody']") ? 1800 : 0;
      return {
        title: normalizeText(element.querySelector("h1")?.textContent || titleFromDocument()),
        text: segment.text,
        blocks: segment.blocks,
        method: "semantic",
        score: segment.score + semanticBonus
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return ranked[0] || null;
}

function densityClusterExtraction() {
  const paragraphs = [...document.querySelectorAll("p, blockquote")]
    .filter((node) => !node.closest(HARD_NOISE_SELECTOR))
    .filter((node) => !node.closest(STRONG_NOISE_SELECTOR))
    .filter((node) => {
      const text = normalizeText(node.textContent);
      return (
        text.length >= 45 &&
        !looksLikeAdvertisement(text) &&
        !looksLikeTerminalBoundary(text) &&
        linkDensity(node, text) <= 0.5
      );
    });

  const parentStats = new Map();

  for (const node of paragraphs) {
    const text = normalizeText(node.textContent);
    let parent = node.parentElement;

    for (let depth = 0; parent && depth < 7; depth += 1) {
      const current = parentStats.get(parent) || { chars: 0, paragraphs: 0 };
      current.chars += text.length;
      current.paragraphs += 1;
      parentStats.set(parent, current);
      parent = parent.parentElement;
    }
  }

  const ranked = [...parentStats.entries()]
    .map(([element, stats]) => {
      const segment = bestContiguousSegment(element);
      if (!segment) {
        return null;
      }
      return {
        title: normalizeText(element.querySelector?.("h1")?.textContent || titleFromDocument()),
        text: segment.text,
        blocks: segment.blocks,
        method: "density-cluster",
        score:
          segment.score +
          stats.chars * 0.35 +
          Math.min(stats.paragraphs, 24) * 120 +
          (element.querySelector?.("h1") ? 900 : 0)
      };
    })
    .filter(Boolean)
    .filter(({ text }) => text.length >= MIN_ARTICLE_CHARS)
    .sort((a, b) => b.score - a.score);

  return ranked[0] || null;
}

function truncateBlocks(blocks, maxChars) {
  const result = [];
  let used = 0;

  for (const block of blocks) {
    if (used >= maxChars) {
      break;
    }

    const remaining = maxChars - used;
    const text = block.text.slice(0, remaining).trim();
    if (!text) {
      continue;
    }

    result.push({
      ...block,
      text
    });
    used += text.length + 2;
  }

  return result;
}

function extractReadableText() {
  const selected =
    structuredDataExtraction() ||
    readabilityExtraction() ||
    semanticExtraction() ||
    densityClusterExtraction();

  if (!selected || selected.text.length < MIN_ARTICLE_CHARS) {
    throw new Error("متن اصلی مقاله در این صفحه با اطمینان کافی پیدا نشد.");
  }

  const blocks = selected.blocks?.length
    ? selected.blocks
    : paragraphBlocksFromText(selected.text);
  const truncated = selected.text.length > MAX_EXTRACTED_CHARS;
  const finalBlocks = truncated
    ? truncateBlocks(blocks, MAX_EXTRACTED_CHARS)
    : blocks;

  return {
    title: selected.title,
    url: location.href,
    text: blocksToText(finalBlocks),
    blocks: finalBlocks,
    truncated,
    extractionMethod: selected.method
  };
}

if (!globalThis.__AVAYAR_EXTRACTOR_INSTALLED__) {
  globalThis.__AVAYAR_EXTRACTOR_INSTALLED__ = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "AVAYAR_EXTRACT") {
      return false;
    }

    try {
      sendResponse({
        ok: true,
        result: extractReadableText()
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return false;
  });
}
