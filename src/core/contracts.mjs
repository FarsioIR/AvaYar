export const LISTENING_MODES = Object.freeze(["full", "summary"]);
export const VOICE_PREFERENCES = Object.freeze(["female", "male"]);

export function assertListeningMode(mode) {
  if (!LISTENING_MODES.includes(mode)) {
    throw new TypeError(`Unsupported listening mode: ${mode}`);
  }
}

export function assertVoicePreference(voicePreference) {
  if (!VOICE_PREFERENCES.includes(voicePreference)) {
    throw new TypeError(`Unsupported voice preference: ${voicePreference}`);
  }
}

export function assertNonEmptyText(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("Text must be a non-empty string.");
  }
}
