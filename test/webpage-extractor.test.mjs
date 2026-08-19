import test from "node:test";
import assert from "node:assert/strict";
import {
  WebpageExtractor
} from "../server/extraction/webpage-extractor.mjs";

test(
  "webpage extractor connects fetched HTML to plain-text article output",
  async () => {
    const extractor =
      new WebpageExtractor({
        htmlFetcher: async () => ({
          finalUrl:
            "https://example.com/story",
          html: `
            <html>
              <head>
                <title>AvaYar fixture</title>
              </head>
              <body>
                <main>
                  <h1>AvaYar fixture</h1>
                  <p>
                    A sufficiently long fixture paragraph
                    for secure webpage extraction testing.
                  </p>
                  <p>
                    Another paragraph provides enough text
                    to exercise the article fallback safely.
                  </p>
                </main>
              </body>
            </html>
          `
        })
      });

    const result =
      await extractor.extract(
        "https://example.com/story"
      );

    assert.equal(
      result.url,
      "https://example.com/story"
    );

    assert.equal(
      result.provider,
      "server-readability"
    );

    assert.match(
      result.title,
      /AvaYar fixture/
    );

    assert.match(
      result.text,
      /sufficiently long fixture paragraph/
    );

    assert.match(
      result.text,
      /Another paragraph provides enough text/
    );
  }
);
