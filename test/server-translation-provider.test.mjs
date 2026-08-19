import test from "node:test";
import assert from "node:assert/strict";
import {
  ServerTranslationProvider
} from "../src/providers/server-translation.mjs";

test(
  "server translation binds browser fetch to the global receiver",
  async () => {
    let observedReceiver = null;
    let observedUrl = "";
    let observedBody = null;

    const fetchImpl = async function (
      url,
      options
    ) {
      observedReceiver = this;
      observedUrl = url;
      observedBody =
        JSON.parse(options.body);

      return {
        ok: true,
        async json() {
          return {
            text: "سلام از آوایار"
          };
        }
      };
    };

    const provider =
      new ServerTranslationProvider({
        fetchImpl
      });

    const translated =
      await provider.translateToPersian(
        "Example Domain"
      );

    assert.equal(
      observedReceiver,
      globalThis
    );

    assert.equal(
      observedUrl,
      "/api/translate"
    );

    assert.deepEqual(
      observedBody,
      {
        text: "Example Domain"
      }
    );

    assert.equal(
      translated,
      "سلام از آوایار"
    );
  }
);
