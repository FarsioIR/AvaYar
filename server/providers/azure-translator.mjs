function assertText(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("Translation text must be a non-empty string.");
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/u, "");
}

export class AzureTranslator {
  constructor({
    key,
    region = null,
    endpoint = "https://api.cognitive.microsofttranslator.com",
    fetchImpl = globalThis.fetch
  }) {
    if (!key) {
      throw new Error("AZURE_TRANSLATOR_KEY is not configured.");
    }

    if (typeof fetchImpl !== "function") {
      throw new TypeError("A fetch implementation is required.");
    }

    this.key = key;
    this.region = region;
    this.endpoint = trimTrailingSlash(endpoint);
    this.fetchImpl = fetchImpl;
  }

  async translateToPersian(text) {
    assertText(text);

    const url =
      `${this.endpoint}/translate?api-version=3.0&to=fa`;

    const headers = {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": this.key
    };

    if (this.region) {
      headers["Ocp-Apim-Subscription-Region"] = this.region;
    }

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify([{ Text: text.trim() }])
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure Translator failed (${response.status}): ${errorText.slice(0, 500)}`
      );
    }

    const body = await response.json();
    const translated = body?.[0]?.translations?.[0]?.text;

    if (typeof translated !== "string" || translated.trim().length === 0) {
      throw new Error("Azure Translator returned no Persian text.");
    }

    return translated.trim();
  }
}
