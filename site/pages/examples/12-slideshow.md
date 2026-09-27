---
title: reveal.js slideshow
group: Integration
summary: "Interactive diagrams inside presentation slides."
covers: "reveal.js · keyboard focus"
order: 12
---

# reveal.js slideshow

The offline [reveal.js](https://revealjs.com) slideshow embeds an interactive diagram. Arrow keys change slides. On a slide, use the mouse or focus a diagram control with Tab and activate it with Space or Enter.

<iframe src="slideshow-demo.html" title="Interactive KNX slideshow" style="width:100%;aspect-ratio:16/10;border:1px solid #dedbd2;border-radius:10px"></iframe>

[Open slideshow in full screen](slideshow-demo.html)

## Slide code

```html
<section>
  <h3>Status feedback</h3>
  <bus-diagram
    fit="contain"
    toolbar="compact"
    monitor="false"
    description="false"
    style="height:520px"
  >
    <script type="application/json">
      { "formatVersion": 2, "title": "Example", "lines": [{ "address": "1.1" }], "devices": [] }
    </script>
  </bus-diagram>
</section>
```

The page loads `reveal.css`, `reveal.js`, and `bus-diagram.js`. See the [slides guide](../guide/slides.html) for presentation options.
