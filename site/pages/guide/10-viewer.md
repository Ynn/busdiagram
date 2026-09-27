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
