---
title: Embed in a page
group: Integrate
order: 8
---

# Embed in a page

Load `bus-diagram.js` once, then supply a scenario in one of three ways.

## Inline JSON

```html
<bus-diagram>
  <script type="application/json">
    { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

Inline JSON keeps the scenario with the component and works offline. The browser treats the script as data rather than executable JavaScript.

## Another JSON block or a file

```html
<bus-diagram scenario="#example-scenario"></bus-diagram>
<script type="application/json" id="example-scenario">
  { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
</script>

<bus-diagram src="scenarios/status-feedback.json"></bus-diagram>
```

A `src` file requires an HTTP server in browsers that restrict local `file://` reads. If `src` changes repeatedly, only the latest request is applied.

## JavaScript

```js
const diagram = BusDiagram.create("#example", scenario, {
  monitor: false,
  toolbar: "compact",
});
diagram.on("telegram", (telegram) => console.log(telegram.destination));
```

The `scenario` argument can be an object, a JSON URL, or a `#id` selector for a JSON block. See the [JavaScript API](api.html).

## Display options

Options can be set as HTML attributes or JavaScript properties. See the [options reference](../reference/options.html).

```html
<bus-diagram toolbar="compact" monitor="false" description="false" speed="0.35"></bus-diagram>
```

```knx
scenario: shutter-control
attrs: toolbar="compact" monitor="false" description="false"
tabs: html
```

## Several diagrams

A page can show several instances, even with the same scenario. Each has an independent clock and state. See the [two-instance example](../examples/two-instances.html).

## Static-site Markdown

Most static-site generators allow HTML elements in Markdown, although some require an explicit setting. Keep the `<bus-diagram>` and its nested JSON `<script>` in the same HTML block. Load the bundle once from the site layout:

```html
<script defer src="assets/bus-diagram.js"></script>
```

If a content platform removes scripts, publish a [standalone page](viewer.html) and link to it or embed it in an iframe.
