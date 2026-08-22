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

const NOISE_SELECTOR = [
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
  "[class*='advert']",
  "[class*='banner']",
  "[class*='breadcrumb']",
  "[class*='related']",
  "[class*='recommend']",
  "[class*='share']",
  "[class*='social']",
  "[class*='sidebar']",
  "[class*='comment']"
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

function meaningfulParagraphs(root) {
  const nodes = [
    ...root.querySelectorAll("p, h2, h3, blockquote, li")
  ];

  const seen = new Set();
  const chunks = [];

  for (const node of nodes) {
    if (node.closest(NOISE_SELECTOR)) {
      continue;
    }

    const text = normalizeText(node.innerText);

    if (text.length < 35) {
      continue;
    }

    const linkText = normalizeText(
      [...node.querySelectorAll("a")]
        .map((link) => link.innerText)
        .join(" ")
    );
    const linkDensity = text.length
      ? linkText.length / text.length
      : 1;

    if (linkDensity > 0.45 || seen.has(text)) {
      continue;
    }

    seen.add(text);
    chunks.push(text);
  }

  return chunks;
}

function scoreCandidate(element) {
  const chunks = meaningfulParagraphs(element);
  const text = chunks.join("\n\n");
  const paragraphCount = chunks.length;
  const punctuationCount =
    (text.match(/[.!?؟؛]/gu) || []).length;

  return {
    element,
    text,
    score:
      text.length +
      paragraphCount * 180 +
      punctuationCount * 20
  };
}

function fallbackFromParagraphCluster() {
  const paragraphs = [...document.querySelectorAll("p")]
    .filter((node) => !node.closest(NOISE_SELECTOR))
    .map((node) => ({
      node,
      text: normalizeText(node.innerText)
    }))
    .filter(({ text }) => text.length >= 60);

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

  const ranked = [...parentScores.entries()]
    .map(([element]) => scoreCandidate(element))
    .filter(({ text }) => text.length >= 180)
    .sort((left, right) => right.score - left.score);

  return ranked[0] || null;
}

function articleTitle(selectedElement) {
  const heading = selectedElement?.querySelector("h1");
  const metaTitle =
    document.querySelector("meta[property='og:title']")
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
