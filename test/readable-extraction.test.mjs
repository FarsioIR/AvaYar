import test from "node:test";
import assert from "node:assert/strict";
import {
  extractReadableArticle
} from "../server/extraction/readable.mjs";

test(
  "Readability extracts article text without returning raw HTML",
  () => {
    const article =
      extractReadableArticle({
        url: "https://example.com/story",
        html: `
          <!doctype html>
          <html>
            <head>
              <title>Test story</title>
            </head>
            <body>
              <nav>Navigation noise</nav>
              <article>
                <h1>Readable story</h1>
                <p>
                  This is the first meaningful paragraph
                  with enough content for the reader.
                </p>
                <p>
                  This is the second meaningful paragraph
                  and it should remain in plain text.
                </p>
              </article>
              <script>
                globalThis.__AVAYAR_BAD = true;
              </script>
            </body>
          </html>
        `
      });

    assert.match(
      article.text,
      /Readable story/
    );

    assert.match(
      article.text,
      /first meaningful paragraph/
    );

    assert.equal(
      article.text.includes("<script>"),
      false
    );

    assert.equal(
      article.text.includes("__AVAYAR_BAD"),
      false
    );
  }
);
