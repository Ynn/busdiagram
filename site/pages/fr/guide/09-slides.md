---
title: Diapositives
translationOf: guide/09-slides.md
sourceHash: a43c272279e9
order: 9
---
# Diapositives

Une présentation dans le navigateur peut intégrer un schéma interactif. Ses commandes restent utilisables pendant la présentation.

## Disposition recommandée

```html
<bus-diagram fit="contain" toolbar="compact" monitor="false" description="false" style="height:520px">
  <script type="application/json">
    { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

`fit="contain"` met tout le schéma à l'échelle de la hauteur donnée. La barre d'outils compacte garde les commandes de pause, de pas à pas et de réinitialisation. Masquer le moniteur et la description laisse de la place au schéma. Le designer propose un aperçu 16:9 et exporte un code à intégrer.

## reveal.js

Placez le composant dans une diapositive `<section>`. Un bouton du schéma qui a le focus accepte Espace ou Entrée sans changer de diapositive. Voir l'[exemple de diaporama](../examples/slideshow.html).

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

D'autres systèmes de présentation dans le navigateur peuvent utiliser le même composant s'ils acceptent du HTML et du JavaScript.

## Fichiers de présentation et PDF

PowerPoint, LibreOffice Impress, Google Slides et les lecteurs PDF n'exécutent pas directement ce composant JavaScript. Faites un lien vers une [page autonome](viewer.html) pour l'interaction, ou insérez une capture d'écran pour une diapositive statique. Mettez la simulation en pause ou en pas à pas pour capturer un moment précis, comme un télégramme qui traverse un coupleur.
