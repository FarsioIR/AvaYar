function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase().replaceAll("_", "-");
}

function preferenceScore(name, preference) {
  const normalized = String(name || "").toLowerCase();

  if (preference === "female" && /(female|woman|زن|مونث)/u.test(normalized)) {
    return 20;
  }

  if (preference === "male" && /(male|man|مرد|مذکر)/u.test(normalized)) {
    return 20;
  }

  return 0;
}

export function rankPersianVoices(voices, preference = "female") {
  return [...(voices || [])]
    .map((voice, index) => {
      const language = normalizeLanguage(voice?.lang);

      if (language !== "fa" && !language.startsWith("fa-")) {
        return null;
      }

      let score = 0;

      if (language === "fa-ir") {
        score += 100;
      } else if (language.startsWith("fa-")) {
        score += 70;
      } else {
        score += 50;
      }

      if (voice?.localService) {
        score += 5;
      }

      if (voice?.default) {
        score += 3;
      }

      score += preferenceScore(voice?.name, preference);

      return { voice, score, index };
    })
    .filter(Boolean)
    .sort((left, right) =>
      right.score - left.score || left.index - right.index
    )
    .map(({ voice }) => voice);
}

export function selectPersianVoice(voices, preference = "female") {
  return rankPersianVoices(voices, preference)[0] ?? null;
}

export class BrowserSpeechUnavailableError extends Error {
  constructor(code = "browser_speech_unavailable") {
    super("صدای فارسی جایگزین روی این مرورگر در دسترس نیست.");
    this.name = "BrowserSpeechUnavailableError";
    this.code = code;
  }
}

export class BrowserSpeechController {
  constructor({ synthesis, utteranceFactory } = {}) {
    this.synthesis = synthesis ?? null;
    this.utteranceFactory = utteranceFactory ?? null;
    this.active = false;
    this.paused = false;
    this.voice = null;
  }

  supported() {
    return Boolean(
      this.synthesis &&
      typeof this.synthesis.speak === "function" &&
      typeof this.synthesis.getVoices === "function" &&
      typeof this.utteranceFactory === "function"
    );
  }

  async voices() {
    if (!this.supported()) {
      return [];
    }

    const current = this.synthesis.getVoices();

    if (current.length > 0 || typeof this.synthesis.addEventListener !== "function") {
      return current;
    }

    return await new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        this.synthesis.removeEventListener?.("voiceschanged", finish);
        resolve(this.synthesis.getVoices());
      };

      this.synthesis.addEventListener("voiceschanged", finish, { once: true });
      setTimeout(finish, 500);
    });
  }

  async speak({ text, voicePreference = "female", onStart, onEnd, onError } = {}) {
    if (!this.supported()) {
      throw new BrowserSpeechUnavailableError();
    }

    const voice = selectPersianVoice(await this.voices(), voicePreference);

    if (!voice) {
      throw new BrowserSpeechUnavailableError("browser_persian_voice_unavailable");
    }

    this.cancel();

    const utterance = this.utteranceFactory(String(text || ""));
    utterance.lang = "fa-IR";
    utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.active = true;
      this.paused = false;
      onStart?.({ voice });
    };

    utterance.onend = () => {
      this.active = false;
      this.paused = false;
      onEnd?.({ voice });
    };

    utterance.onerror = (event) => {
      this.active = false;
      this.paused = false;
      onError?.(event);
    };

    this.voice = voice;
    this.active = true;
    this.paused = false;
    this.synthesis.speak(utterance);

    return { voice };
  }

  pause() {
    if (!this.active || this.paused) return false;
    this.synthesis.pause?.();
    this.paused = true;
    return true;
  }

  resume() {
    if (!this.active || !this.paused) return false;
    this.synthesis.resume?.();
    this.paused = false;
    return true;
  }

  cancel() {
    this.synthesis?.cancel?.();
    this.active = false;
    this.paused = false;
    this.voice = null;
  }
}
