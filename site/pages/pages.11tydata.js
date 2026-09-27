export default {
  layout: "layout.njk",
  eleventyComputed: {
    permalink: (data) =>
      data.page.filePathStem.endsWith("/search-index")
        ? "assets/search-index.js"
        : `${data.page.filePathStem.replace(/^\//, "").replace(/(^|\/)\d+-/, "$1")}.html`,
    section: (data) => {
      const section = data.page.filePathStem.split("/")[1];
      return ["guide", "examples", "reference"].includes(section) ? section : null;
    },
  },
};
