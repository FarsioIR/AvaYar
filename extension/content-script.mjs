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

function commercialSignalCount(text) {
  const value = normalizeText(text).toLowerCase();
  const signals = [
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

  return signals.reduce(
    (count, signal) =>
      count + (value.includes(signal) ? 1 : 0),
    0
  );
}

function productClaimSignalCount(text) {
  const value = normalizeText(text).toLowerCase();
  const signals = [
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
  ];

  return signals.reduce(
    (count, signal) =>
      count + (value.includes(signal) ? 1 : 0),
    0
  );
}

function looksLikeAdvertisement(text) {
  const value = normalizeText(text);

  if (!value) {
    return false;
  }

  const commercialSignals = commercialSignalCount(value);
  const productClaims = productClaimSignalCount(value);
  const emojiCount =
    (value.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  const exclamationCount =
    (value.match(/[!❗❌]/gu) || []).length;
  const percentageCount =
    (value.match(/\d+\s*(?:%|٪)/gu) || []).length;
  const moneyPattern =
    /(?:\d[\d,.٬]*\s*(?:تومان|تومن|ریال)|(?:تومان|تومن|ریال)\s*\d)/u;

  return (
    commercialSignals >= 1 ||
    (value.length < 280 && productClaims >= 1 && percentageCount >= 1) ||
    (value.length < 220 && productClaims >= 2) ||
    (value.length < 260 && emojiCount >= 3) ||
    (value.length < 260 && moneyPattern.test(value) && exclamationCount >= 1)
  );
}

function looksLikeTerminalBoundary(text) {
  const value = normalizeText(text).toLowerCase();

  if (!value) {
    return false;
  }

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
    ...root.querySelectorAll(
      `${HARD_NOISE_SELECTOR},${STRONG_NOISE_SELECTOR}`
    )
  ]) {
    node.remove();
  }
}

function cleanArticleRoot(root) {
  removeKnownNoise(root);

  const nodes = [
    ...root.querySelectorAll("p, h2, h3, h4, blockquote, li")
  ];
  const chunks = [];
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

    const density = linkDensity(node, text);

    if (density > 0.55) {
      if (establishedChars >= MIN_ARTICLE_CHARS) {
        break;
      }
      continue;
    }

    if (text.length < 30) {
      continue;
    }

    seen.add(text);
    chunks.push(text);
    establishedChars += text.length;
  }

  return normalizeText(chunks.join("\n\n"));
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

  const parsedDocument = new DOMParser().parseFromString(
    parsed.content,
    "text/html"
  );

  const cleaned = cleanArticleRoot(parsedDocument.body);
  const fallbackText = normalizeText(parsed.textContent);
  const text =
    cleaned.length >= MIN_ARTICLE_CHARS
      ? cleaned
      : fallbackText;

  if (text.length < MIN_ARTICLE_CHARS) {
    return null;
  }

  return {
    title: normalizeText(
      parsed.title ||
        document.querySelector("h1")?.textContent ||
        document.title ||
        location.hostname
    ),
    text,
    method: "readability"
  };
}

function classifyFallbackNode(node) {
  if (node.closest(HARD_NOISE_SELECTOR)) {
    return { type: "ignore" };
  }

  const text = normalizeText(node.textContent);

  if (!text) {
    return { type: "ignore" };
  }

  if (
    node.closest(STRONG_NOISE_SELECTOR) ||
    looksLikeTerminalBoundary(text) ||
    looksLikeAdvertisement(text) ||
    linkDensity(node, text) > 0.62
  ) {
    return { type: "boundary", text };
  }

  if (text.length < 35) {
    return { type: "ignore" };
  }

  const sentenceSignals =
    (text.match(/[.!?؟؛:]/gu) || []).length;

  return (
    text.length >= 90 ||
    sentenceSignals >= 1 ||
    ["P", "BLOCKQUOTE"].includes(node.tagName)
  )
    ? { type: "content", text }
    : { type: "ignore" };
}

function bestContiguousSegment(root) {
  const nodes = [
    ...root.querySelectorAll("p, h2, h3, h4, blockquote, li")
  ];
  const segments = [];
  let current = [];
  const seen = new Set();

  function flush() {
    if (!current.length) {
      return;
    }

    const text = normalizeText(current.join("\n\n"));

    if (text.length >= MIN_ARTICLE_CHARS) {
      const punctuation =
        (text.match(/[.!?؟؛:]/gu) || []).length;
      segments.push({
        text,
        score:
          text.length +
          current.length * 220 +
          punctuation * 24
      });
    }

    current = [];
  }

  for (const node of nodes) {
    const result = classifyFallbackNode(node);

    if (result.type === "boundary") {
      flush();
      continue;
    }

    if (result.type !== "content" || seen.has(result.text)) {
      continue;
    }

    seen.add(result.text);
    current.push(result.text);
  }

  flush();

  return segments.sort((a, b) => b.score - a.score)[0] || null;
}

function articleTitle(element) {
  const heading = element?.querySelector?.("h1");
  const metaTitle = document
    .querySelector("meta[property='og:title']")
    ?.getAttribute("content");

  return normalizeText(
    heading?.textContent ||
      metaTitle ||
      document.querySelector("h1")?.textContent ||
      document.title ||
      location.hostname
  );
}

function heuristicExtraction() {
  const candidates = ARTICLE_SELECTORS
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter((element, index, all) => all.indexOf(element) === index)
    .map((element) => {
      const segment = bestContiguousSegment(element);
      const semanticBonus = element.matches(
        "article, [itemprop='articleBody']"
      )
        ? 1800
        : 0;

      return segment
        ? {
            element,
            text: segment.text,
            score: segment.score + semanticBonus
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const selected = candidates[0];

  if (!selected) {
    return null;
  }

  return {
    title: articleTitle(selected.element),
    text: selected.text,
    method: "heuristic"
  };
}

function densityClusterExtraction() {
  const paragraphNodes = [
    ...document.querySelectorAll("p, blockquote")
  ].filter((node) => {
    if (
      node.closest(HARD_NOISE_SELECTOR) ||
      node.closest(STRONG_NOISE_SELECTOR)
    ) {
      return false;
    }

    const text = normalizeText(node.textContent);

    return (
      text.length >= 50 &&
      !looksLikeAdvertisement(text) &&
      !looksLikeTerminalBoundary(text) &&
      linkDensity(node, text) <= 0.5
    );
  });

  if (!paragraphNodes.length) {
    return null;
  }

  const parentStats = new Map();

  for (const node of paragraphNodes) {
    const text = normalizeText(node.textContent);
    let parent = node.parentElement;

    for (let depth = 0; parent && depth < 6; depth += 1) {
      if (
        parent.matches?.(HARD_NOISE_SELECTOR) ||
        parent.matches?.(STRONG_NOISE_SELECTOR)
      ) {
        break;
      }

      const current = parentStats.get(parent) || {
        chars: 0,
        paragraphs: 0
      };

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

      const headingBonus = element.querySelector?.("h1") ? 900 : 0;
      const paragraphBonus = Math.min(stats.paragraphs, 24) * 120;

      return {
        element,
        text: segment.text,
        score:
          segment.score +
          stats.chars * 0.35 +
          paragraphBonus +
          headingBonus
      };
    })
    .filter(Boolean)
    .filter(({ text }) => text.length >= MIN_ARTICLE_CHARS)
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];

  if (!selected) {
    return null;
  }

  return {
    title: articleTitle(selected.element),
    text: selected.text,
    method: "density-cluster"
  };
}

function extractReadableText() {
  const selected =
    readabilityExtraction() ||
    heuristicExtraction() ||
    densityClusterExtraction();

  if (!selected || selected.text.length < MIN_ARTICLE_CHARS) {
    throw new Error(
      "متن اصلی مقاله در این صفحه با اطمینان کافی پیدا نشد."
    );
  }

  const truncated = selected.text.length > MAX_EXTRACTED_CHARS;

  return {
    title: selected.title,
    url: location.href,
    text: truncated
      ? selected.text.slice(0, MAX_EXTRACTED_CHARS)
      : selected.text,
    truncated,
    extractionMethod: selected.method
  };
}

if (!globalThis.__AVAYAR_EXTRACTOR_INSTALLED__) {
  globalThis.__AVAYAR_EXTRACTOR_INSTALLED__ = true;

  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
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
          error:
            error instanceof Error
              ? error.message
              : String(error)
        });
      }

      return false;
    }
  );
}
