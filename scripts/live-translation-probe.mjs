import {
  getProviderConfig
} from "../server/config.mjs";
import {
  LocalM2M100Translator
} from "../server/providers/local-m2m100-translator.mjs";

const config = getProviderConfig();

const translator = new LocalM2M100Translator({
  config: config.translation
});

const translated = await translator.translateToPersian(
  "AvaYar converts useful web content into a clear Persian listening experience.",
  { sourceLanguage: "en" }
);

if (!/[\u0600-\u06ff]/u.test(translated)) {
  throw new Error(
    "Live local translation did not return Persian-script text."
  );
}

console.log(
  `Translation PASS: local M2M100 -> fa / ${translated.length} chars`
);
console.log("LOCAL TRANSLATION LIVE PROBE PASS");
