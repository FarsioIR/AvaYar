import {
  assertListeningMode,
  assertNonEmptyText,
  assertVoicePreference
} from "./contracts.mjs";
import { detectLanguage } from "./language.mjs";
import { summarizePersian } from "./summary.mjs";

export async function prepareListening({
  text,
  mode = "full",
  voicePreference = "female",
  translator
}) {
  assertNonEmptyText(text);
  assertListeningMode(mode);
  assertVoicePreference(voicePreference);

  const sourceText = text.trim();
  const language = detectLanguage(sourceText);
  let persianText = sourceText;
  let translated = false;

  if (language.code !== "fa") {
    if (!translator || typeof translator.translateToPersian !== "function") {
      throw new TypeError(
        "A translator implementing translateToPersian(text) is required for non-Persian input."
      );
    }

    persianText = String(
      await translator.translateToPersian(sourceText)
    ).trim();

    assertNonEmptyText(persianText);
    translated = true;
  }

  const listeningText =
    mode === "summary" ? summarizePersian(persianText) : persianText;

  return {
    sourceLanguage: language.code,
    languageConfidence: language.confidence,
    translated,
    mode,
    voicePreference,
    persianText,
    listeningText
  };
}
