const MAX_EXTRACTED_CHARS = 80_000;

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
  "[class*='sidebar']",
  "[class*='comment']"
].join(",");

const AD_BOUNDARY_SELECTOR = [
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
  "[class*='banner']",
  "[id*='banner']",
  "[class*='shopping']",
  "[class*='product']",
  "[class*='offer']",
  "[class*='coupon']",
  "[class*='related']",
  "[class*='recommend']",
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
    "خرید",
    "تخفیف",
    "قیمت",
    "تومان",
    "تومن",
    "ثبت سفارش",
    "سفارش دهید",
    "تماس بگیرید",
    "ارسال رایگان",
    "فروش ویژه",
    "همین حالا",
    "کلیک کنید",
    "مشاهده محصول",
    "درمان در منزل",
    "ماهی فقط",
    "پرداخت اقساطی",
    "buy now",
    "shop now",
    "order now",
    "special offer",
    "limited offer",
    "discount",
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

function looksLikeAdvertisement(text) {
  const value = normalizeText(text);

  if (!value) {
    return false;
  }

  const signalCount = commercialSignalCount(value);
  const emojiCount =
    (value.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  const exclamationCount =
    (value.match(/[!❗❌]/gu) || []).length;
  const percentageCount =
    (value.match(/\d+\s*(?:%|٪)/gu) || []).length;
  const moneyPattern =
    /(?:\d[\d,.٬]*\s*(?:تومان|تومن|ریال|میلیون|هزار)|(?:تومان|تومن|ریال)\s*\d)/u;

  return (
    signalCount >= 2 ||
    (signalCount >= 1 &&
      (emojiCount >= 2 ||
        exclamationCount >= 2 ||
        percentageCount >= 1 ||
        moneyPattern.test(value))) ||
    (value.length < 320 &&
      (emojiCount >= 3 ||
        (moneyPattern.test(value) && exclamationCount >= 1)))
  );
}

function looksLikeTerminalBoundary(text) {
  const value = normalizeText(text).toLowerCase();

  if (!value) {
    return false;
  }

  const boundaryPhrases = [
    "در شبکه های اجتماعی دنبال کنید",
    "در شبکه‌های اجتماعی دنبال کنید",
    "ما را در شبکه های اجتماعی دنبال کنید",
    "ما را در شبکه‌های اجتماعی دنبال کنید",
    "تابناک را در شبکه های اجتماعی دنبال کنید",
    "تابناک را در شبکه‌های اجتماعی دنبال کنید",
    "شبکه های اجتماعی تابناک",
    "شبکه‌های اجتماعی تابناک",
    "follow us on social media",
    "follow us on",
    "related posts",
    "recommended for you"
  ];

  return boundaryPhrases.some((phrase) => value.includes(phrase));
}

function linkDensity(node, text) {
  const linkText = normalizeText(
    [...node.querySelectorAll("a")]
      .map((link) => link.innerText)
      .join(" ")
  );

  return text.length ? linkText.length / text.length : 1;
}

function classifyNode(node) {
  const text = normalizeText(node.innerText);

  if (!text) {
    return { type: "ignore" };
  }

  if (looksLikeTerminalBoundary(text)) {
    return {
      type: "boundary",
      text
    };
  }

  if (node.closest(HARD_NOISE_SELECTOR)) {
    return { type: "ignore" };
  }

  const adContainer = node.closest(AD_BOUNDARY_SELECTOR);
  const density = linkDensity(node, text);
  const adLike = looksLikeAdvertisement(text);

  if (adContainer || adLike || density > 0.62) {
    return {
      type: "boundary",
      text
    };
  }

  if (text.length < 35) {
    return { type: "ignore" };
  }

  const sentenceSignals =
    (text.match(/[.!?؟؛:]/gu) || []).length;

  const articleLike =
    text.length >= 90 ||
    sentenceSignals >= 1 ||
    ["P", "BLOCKQUOTE"].includes(node.tagName);

  return articleLike
    ? {
        type: "content",
        text
      }
    : { type: "ignore" };
}

function segmentScore(chunks) {
  const text = chunks.join("\n\n");
  const punctuationCount =
    (text.match(/[.!?؟؛:]/gu) || []).length;

  return {
    text,
    score:
      text.length +
      chunks.length * 220 +
      punctuationCount * 24
  };
}

function bestContiguousArticleSegment(root) {
  const nodes = [
    ...root.querySelectorAll("p, h2, h3, blockquote, li")
  ];

  const segments = [];
  let current = [];
  const seen = new Set();

  function flush() {
    if (current.length > 0) {
      segments.push(segmentScore(current));
      current = [];
    }
  }

  for (const node of nodes) {
    const classification = classifyNode(node);

    if (classification.type === "boundary") {
      flush();
      continue;
    }

    if (classification.type !== "content") {
      continue;
    }

    if (seen.has(classification.text)) {
      continue;
    }

    seen.add(classification.text);
    current.push(classification.text);
  }

  flush();

  return segments
    .filter(({ text }) => text.length >= 180)
    .sort((left, right) => right.score - left.score)[0] || null;
}

function scoreCandidate(element) {
  const segment = bestContiguousArticleSegment(element);

  if (!segment) {
    return {
      element,
      text: "",
      score: 0
    };
  }

  const semanticBonus =
    element.matches("article, [itemprop='articleBody']")
      ? 1800
      : 0;

  return {
    element,
    text: segment.text,
    score: segment.score + semanticBonus
  };
}

function fallbackFromParagraphCluster() {
  const paragraphs = [...document.querySelectorAll("p")]
    .filter((node) => !node.closest(HARD_NOISE_SELECTOR))
    .filter((node) => !node.closest(AD_BOUNDARY_SELECTOR))
    .map((node) => ({
      node,
      text: normalizeText(node.innerText)
    }))
    .filter(
      ({ node, text }) =>
        text.length >= 60 &&
        !looksLikeAdvertisement(text) &&
        !looksLikeTerminalBoundary(text) &&
        linkDensity(node, text) <= 0.45
    );

  const parentScores = new Map();

  for (const { node, text } of paragraphs) {
    let parent = node.parentElement;

    for (let depth = 0; parent && depth < 4; depth += 1) {
      parentScores.set(
        parent,
        (parentScores.get(parent) || 0) + text.length
      );
      parent = parent.parentElement;
    }
  }

  return [...parentScores.entries()]
    .map(([element]) => scoreCandidate(element))
    .filter(({ text }) => text.length >= 180)
    .sort((left, right) => right.score - left.score)[0] || null;
}

function articleTitle(selectedElement) {
  const heading = selectedElement?.querySelector("h1");
  const metaTitle = document
    .querySelector("meta[property='og:title']")
    ?.getAttribute("content");

  return normalizeText(
    heading?.innerText ||
      metaTitle ||
      document.querySelector("h1")?.innerText ||
      document.title ||
      location.hostname
  );
}

function extractReadableText() {
  const candidates = ARTICLE_SELECTORS
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter((element, index, all) => all.indexOf(element) === index)
    .map(scoreCandidate)
    .filter(({ text }) => text.length >= 180)
    .sort((left, right) => right.score - left.score);

  const selected = candidates[0] || fallbackFromParagraphCluster();

  if (!selected || selected.text.length < 180) {
    throw new Error(
      "متن اصلی مقاله در این صفحه با اطمینان کافی پیدا نشد."
    );
  }

  const truncated = selected.text.length > MAX_EXTRACTED_CHARS;

  return {
    title: articleTitle(selected.element),
    url: location.href,
    text: truncated
      ? selected.text.slice(0, MAX_EXTRACTED_CHARS)
      : selected.text,
    truncated
  };
}

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
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
