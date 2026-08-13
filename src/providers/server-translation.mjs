export class ServerTranslationProvider {
  constructor({ fetchImpl = globalThis.fetch } = {}) {
    this.fetchImpl = fetchImpl;
  }

  async translateToPersian(text) {
    const response = await this.fetchImpl("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.error ?? "Persian translation failed.");
    }

    if (typeof body?.text !== "string" || body.text.trim().length === 0) {
      throw new Error("Translation provider returned no Persian text.");
    }

    return body.text.trim();
  }
}
