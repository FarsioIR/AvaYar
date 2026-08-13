const FEMALE_HINTS = ["female", "woman", "زن", "dilara", "darya"];
const MALE_HINTS = ["male", "man", "مرد", "farid", "reza"];

function getSpeechSynthesis() {
  if (!("speechSynthesis" in globalThis)) {
    throw new Error("Speech synthesis is not available in this browser.");
  }

  return globalThis.speechSynthesis;
}

export function listPersianVoices() {
  const synth = getSpeechSynthesis();

  return synth
    .getVoices()
    .filter((voice) => /^fa(?:-|_)/i.test(voice.lang) || /persian|farsi/i.test(voice.name));
}

function scoreVoice(voice, preference) {
  const haystack = `${voice.name} ${voice.voiceURI}`.toLocaleLowerCase("en-US");
  const hints = preference === "female" ? FEMALE_HINTS : MALE_HINTS;

  return hints.reduce(
    (score, hint) => score + (haystack.includes(hint) ? 10 : 0),
    /^fa(?:-|_)/i.test(voice.lang) ? 3 : 0
  );
}

export function pickPersianVoice(preference) {
  const voices = listPersianVoices();

  if (voices.length === 0) {
    return null;
  }

  return [...voices].sort(
    (a, b) => scoreVoice(b, preference) - scoreVoice(a, preference)
  )[0];
}

export function createBrowserSpeaker() {
  let currentUtterance = null;

  return {
    speak({ text, rate = 1, voicePreference = "female" }) {
      const synth = getSpeechSynthesis();
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fa-IR";
      utterance.rate = Number(rate);

      const voice = pickPersianVoice(voicePreference);
      if (voice) {
        utterance.voice = voice;
      }

      synth.speak(utterance);
      currentUtterance = utterance;

      return {
        voiceName: voice?.name ?? "Browser default fa-IR voice",
        exactGenderGuaranteed: false
      };
    },

    pause() {
      getSpeechSynthesis().pause();
    },

    resume() {
      getSpeechSynthesis().resume();
    },

    stop() {
      getSpeechSynthesis().cancel();
      currentUtterance = null;
    },

    get isActive() {
      return currentUtterance !== null;
    }
  };
}
