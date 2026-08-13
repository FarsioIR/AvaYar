export function createServerSpeaker({
  fetchImpl = globalThis.fetch,
  audioFactory = () => new Audio()
} = {}) {
  let audio = null;
  let objectUrl = null;

  function revokeObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  return {
    async speak({ text, rate = 1, voicePreference = "female" }) {
      if (audio) {
        audio.pause();
      }

      revokeObjectUrl();

      const response = await fetchImpl("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          voicePreference
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Persian speech synthesis failed.");
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      audio = audioFactory();
      audio.src = objectUrl;
      audio.playbackRate = Number(rate);

      await audio.play();

      return {
        voiceName:
          response.headers.get("x-ava-voice-name") ??
          (voicePreference === "female"
            ? "fa-IR-DilaraNeural"
            : "fa-IR-FaridNeural"),
        voiceGender:
          response.headers.get("x-ava-voice-gender") ??
          (voicePreference === "female" ? "Female" : "Male"),
        exactGenderGuaranteed: true
      };
    },

    pause() {
      audio?.pause();
    },

    async resume() {
      if (audio) {
        await audio.play();
      }
    },

    stop() {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      revokeObjectUrl();
      audio = null;
    },

    setRate(rate) {
      if (audio) {
        audio.playbackRate = Number(rate);
      }
    }
  };
}
