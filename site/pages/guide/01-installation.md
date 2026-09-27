---
title: Installation
group: Getting started
order: 1
---

# Installation

The library ships as one file, `bus-diagram.js`. It does not load external resources or contact a server. It works offline, including when a page is opened directly from disk with `file://`.

## Get the file

- **Download:** use the Download button at the top of this page or **Export → Library** in the [designer](../designer/index.html).
- **Build from source:** run `npm install` and `npm run build`. The bundle is written to `dist/bus-diagram.js` and copied to `demo/` and `docs/assets/`.

## Add it to a page

Load the script once, preferably in `<head>`:

```html
<script src="bus-diagram.js"></script>
```

The path is relative to your HTML file. For a page in `example/` and a bundle in `example/assets/`, use `src="assets/bus-diagram.js"`.

The `defer` attribute is supported. Load [extension scripts](extensions.html) after the library.

## Check the result

Copy an example from the [gallery](../examples/index.html) using its HTML tab, then open the page. If the diagram does not appear:

| Symptom | What to check |
| --- | --- |
| Nothing appears | Check the path to `bus-diagram.js` in the browser console (F12). |
| A red “Invalid scenario” panel appears | The JSON was parsed but failed validation. Each error shows its field path; see [Errors](errors.html). |
| “Invalid JSON … line N” appears | Check for a missing comma or quote. The [designer](designer.html) highlights the location. |

## Browsers

Use a current version of Chrome, Edge, Firefox, or Safari. The library uses Web Components and modern JavaScript. Internet Explorer and PowerPoint slides are unsupported; see [Slides](slides.html) for web-based presentations.
