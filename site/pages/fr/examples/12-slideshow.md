---
title: Diaporama reveal.js
summary: "Des schémas interactifs dans des diapositives de présentation."
covers: "reveal.js · focus clavier"
translationOf: examples/12-slideshow.md
sourceHash: "fcbf399155ed"
order: 12
---
# Diaporama reveal.js

Le diaporama [reveal.js](https://revealjs.com) hors ligne intègre un schéma interactif. Les flèches changent de diapositive. Sur une diapositive, utilisez la souris, ou donnez le focus à une commande du schéma avec Tab et activez-la avec Espace ou Entrée.

<iframe src="slideshow-demo.html" title="Diaporama KNX interactif" style="width:100%;aspect-ratio:16/10;border:1px solid #dedbd2;border-radius:10px"></iframe>

[Ouvrir le diaporama en plein écran](slideshow-demo.html)

## Code d'une diapositive

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

La page charge `reveal.css`, `reveal.js` et `bus-diagram.js`. Voir le [guide des diapositives](../guide/slides.html) pour les options de présentation.
