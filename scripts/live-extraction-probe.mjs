import {
  WebpageExtractor
} from "../server/extraction/webpage-extractor.mjs";

const extractor = new WebpageExtractor();

const result =
  await extractor.extract(
    "https://example.com/"
  );

if (!result.url.startsWith("https://")) {
  throw new Error(
    "Live extraction did not preserve an HTTPS final URL."
  );
}

if (result.provider !== "server-readability") {
  throw new Error(
    "Live extraction returned an unexpected provider."
  );
}

if (
  typeof result.title !== "string" ||
  !/Example Domain/i.test(result.title)
) {
  throw new Error(
    "Live extraction did not recover the example.com title."
  );
}

if (
  typeof result.text !== "string" ||
  result.text.length < 40
) {
  throw new Error(
    "Live extraction returned insufficient readable body text."
  );
}

if (
  /<html|<body|<script|<!doctype/i.test(
    result.text
  )
) {
  throw new Error(
    "Live extraction leaked raw HTML into the plain-text result."
  );
}

if (
  typeof result.length !== "number" ||
  result.length !== result.text.length
) {
  throw new Error(
    "Live extraction length metadata is inconsistent."
  );
}

let privateTargetBlocked = false;

try {
  await extractor.extract(
    "https://127.0.0.1/"
  );
} catch (error) {
  privateTargetBlocked =
    error instanceof Error &&
    /private|local|reserved|non-public/i.test(
      error.message
    );
}

if (!privateTargetBlocked) {
  throw new Error(
    "Live extraction security gate did not block a loopback target."
  );
}

console.log(
  `Extraction PASS: ${result.url} / ${result.length} chars / title=${result.title}`
);

console.log(
  "Private-target block PASS: https://127.0.0.1/"
);

console.log(
  "M4 LIVE EXTRACTION PROBE PASS"
);
