import test from "node:test";
import assert from "node:assert/strict";
import { AzureTranslator } from "../server/providers/azure-translator.mjs";

test("Azure Translator sends target Persian request without leaking key in URL", async () => {
  let captured = null;

  const translator = new AzureTranslator({
    key: "test-key",
    region: "test-region",
    fetchImpl: async (url, options) => {
      captured = { url, options };

      return new Response(
        JSON.stringify([
          {
            translations: [
              {
                text: "سلام از آوا",
                to: "fa"
              }
            ]
          }
        ]),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }
  });

  const result = await translator.translateToPersian("Hello from Ava");

  assert.equal(result, "سلام از آوا");
  assert.match(captured.url, /api-version=3\.0&to=fa/u);
  assert.doesNotMatch(captured.url, /test-key/u);
  assert.equal(
    captured.options.headers["Ocp-Apim-Subscription-Key"],
    "test-key"
  );
  assert.equal(
    captured.options.headers["Ocp-Apim-Subscription-Region"],
    "test-region"
  );
});
