import {
  fetchPublicHtml
} from "./fetch-public-html.mjs";
import {
  extractReadableArticle
} from "./readable.mjs";

export class WebpageExtractor {
  constructor({
    htmlFetcher = fetchPublicHtml,
    articleExtractor = extractReadableArticle
  } = {}) {
    this.htmlFetcher = htmlFetcher;
    this.articleExtractor = articleExtractor;
  }

  async extract(url) {
    const fetched =
      await this.htmlFetcher(url);

    const article =
      this.articleExtractor({
        html: fetched.html,
        url: fetched.finalUrl
      });

    return {
      ...article,
      url: fetched.finalUrl,
      provider: "server-readability"
    };
  }
}
