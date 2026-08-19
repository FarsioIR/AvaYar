import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

const MAX_EXTRACTED_CHARS = 80_000;

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractReadableArticle({
  html,
  url
}) {
  if (typeof html !== "string" || !html.trim()) {
    throw new TypeError(
      "HTML source must be a non-empty string."
    );
  }

  const dom = new JSDOM(html, {
    url,
    runScripts: undefined,
    resources: undefined
  });

  const sourceDocument = dom.window.document;
  const documentClone =
    sourceDocument.cloneNode(true);

  const article =
    new Readability(
      documentClone,
      {
        charThreshold: 180,
        maxElemsToParse: 12_000
      }
    ).parse();

  const fallbackText =
    sourceDocument.body?.textContent ?? "";

  const text = normalizeText(
    article?.textContent || fallbackText
  );

  if (text.length < 40) {
    throw new Error(
      "AvaYar could not extract enough readable text from this page."
    );
  }

  const truncated =
    text.length > MAX_EXTRACTED_CHARS;

  return {
    title: normalizeText(
      article?.title ||
      sourceDocument.title ||
      ""
    ),
    byline: normalizeText(
      article?.byline || ""
    ),
    excerpt: normalizeText(
      article?.excerpt || ""
    ),
    text: truncated
      ? text.slice(0, MAX_EXTRACTED_CHARS)
      : text,
    length: Math.min(
      text.length,
      MAX_EXTRACTED_CHARS
    ),
    truncated
  };
}
