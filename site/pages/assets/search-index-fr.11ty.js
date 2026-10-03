// Search index of the French pages; the pages not yet translated are searched in English.
import SearchIndex from "./search-index.11ty.js";

export default class FrenchSearchIndex extends SearchIndex {
  render(data) {
    return super
      .render({ collections: { docs: data.collections.docsFr } })
      .replace("window.BUSDIAGRAM_SEARCH=", "window.BUSDIAGRAM_SEARCH_FR=");
  }
}
