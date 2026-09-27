---
title: Standalone page and link
group: Integrate
order: 10
---

# Standalone page and viewer link

## Standalone export

The designer's **Export → Standalone page** command creates one HTML file containing the library and scenario. Open it in a browser without a server or network connection.

## Viewer link and iframe

**Export → Viewer link** creates a URL like this:

```text
https://example.org/docs/player.html#d=compressed-scenario
```

The fragment after `#` contains the compressed scenario and display options. The server does not receive that fragment. The link works wherever `player.html` is available, including a published documentation site. The player fills the window and fits the diagram to its frame.

To embed the player in another page:

```html
<iframe src="https://example.org/docs/player.html#d=compressed-scenario" style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```

An uncompressed form, `player.html#json=<percent-encoded JSON>`, is accepted as well; it is intended for links produced by scripts or [language models](language-models.html). The designer accepts the same `#json=` fragment.

The player can also load a JSON file over HTTP: `player.html?src=scenarios/status-feedback.json`. Published example scenarios live in `docs/scenarios/`.

## Publish the static site

`docs/` is the generated static site: documentation, examples, designer, player, and scenario JSON. Its links are relative, so it can be hosted at a domain root or under a subpath. It also opens locally through `docs/index.html` for pages that do not fetch external JSON files.

| Hosting | Configuration |
| --- | --- |
| GitHub Pages | Select **GitHub Actions** as the Pages source. The workflow in `.github/workflows/pages.yml` checks and builds pushes to `main`. Run it manually with **Run workflow** to deploy after the release review. |
| Cloudflare Pages | Build with `npm run build` and publish the `docs` directory. |
| Another static server | Copy the contents of `docs/`. |

`docs/.nojekyll` tells GitHub Pages to serve these files without Jekyll processing. Browser tests cover offline pages and subpath hosting.
