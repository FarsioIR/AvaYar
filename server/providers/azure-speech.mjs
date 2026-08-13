export const AZURE_PERSIAN_VOICES = Object.freeze({
  female: Object.freeze({
    name: "fa-IR-DilaraNeural",
    gender: "Female",
    locale: "fa-IR"
  }),
  male: Object.freeze({
    name: "fa-IR-FaridNeural",
    gender: "Male",
    locale: "fa-IR"
  })
});

function assertText(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("Speech text must be a non-empty string.");
  }
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export class AzureSpeechSynthesizer {
  constructor({
    key,
    region,
    fetchImpl = globalThis.fetch,
    outputFormat = "audio-16khz-128kbitrate-mono-mp3"
  }) {
    if (!key) {
      throw new Error("AZURE_SPEECH_KEY is not configured.");
    }

    if (!region) {
      throw new Error("AZURE_SPEECH_REGION is not configured.");
    }

    if (typeof fetchImpl !== "function") {
      throw new TypeError("A fetch implementation is required.");
    }

    this.key = key;
    this.region = region;
    this.fetchImpl = fetchImpl;
    this.outputFormat = outputFormat;
  }

  async synthesize({ text, voicePreference = "female" }) {
    assertText(text);

    const voice = AZURE_PERSIAN_VOICES[voicePreference];

    if (!voice) {
      throw new TypeError(`Unsupported voice preference: ${voicePreference}`);
    }

    const endpoint =
      `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml =
      `<speak version="1.0" xml:lang="fa-IR">` +
      `<voice xml:lang="${voice.locale}" xml:gender="${voice.gender}" ` +
      `name="${voice.name}">${escapeXml(text.trim())}</voice>` +
      `</speak>`;

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": this.outputFormat,
        "User-Agent": "Ava-Farsio"
      },
      body: ssml
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure Speech failed (${response.status}): ${errorText.slice(0, 500)}`
      );
    }

    const audio = new Uint8Array(await response.arrayBuffer());

    if (audio.byteLength === 0) {
      throw new Error("Azure Speech returned an empty audio payload.");
    }

    return {
      audio,
      contentType: response.headers.get("content-type") ?? "audio/mpeg",
      voice
    };
  }
}
