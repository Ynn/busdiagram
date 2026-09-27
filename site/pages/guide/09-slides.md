---
title: Slides
group: Integrate
order: 9
---

# Slides

A browser-based presentation can embed an interactive diagram. Its controls remain interactive while the presentation is running.

## Recommended layout

```html
<bus-diagram fit="contain" toolbar="compact" monitor="false" description="false" style="height:520px">
  <script type="application/json">
    { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

`fit="contain"` scales the whole diagram into the given height. The compact toolbar keeps pause, step, and reset controls available. Hiding the monitor and description leaves room for the diagram. The designer offers a 16:9 preview and exports embeddable code.

## reveal.js

Place the component inside a slide `<section>`. A focused diagram button accepts Space or Enter without changing the slide. See the [slideshow example](../examples/slideshow.html).

```html
<link rel="stylesheet" href="reveal/reveal.css" />
<script src="bus-diagram.js"></script>
<section>
  <h3>Status feedback</h3>
  <bus-diagram fit="contain" toolbar="compact" monitor="false" description="false" style="height:520px">
    <script type="application/json">
      { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
    </script>
  </bus-diagram>
</section>
```

Other browser-based presentation systems can use the same component when they allow HTML and JavaScript.

## Presentation files and PDFs

PowerPoint, LibreOffice Impress, Google Slides, and PDF viewers do not execute this JavaScript component directly. Link to a [standalone browser page](viewer.html) for interaction, or insert a screenshot for a static slide. Pause or step the simulation to capture a specific moment, such as a telegram crossing a coupler.
