---
title: Extension
summary: "Ajouter un comportement et une vue d'équipement sans modifier la bibliothèque."
covers: "registerBehavior · registerEquipmentView"
translationOf: examples/17-extension.md
sourceHash: "59602fd02c50"
order: 17
scripts: assets/extensions/delayed-switch.js, assets/extensions/led-lamp-view.js
---
# Extension : commutation temporisée

Deux scripts enregistrent un comportement `delayedSwitch/v1` et une vue `ledStrip` sans modifier la bibliothèque. La touche 1 envoie 1 : L1 s'allume après 2 secondes et L2, dessinée comme un ruban de LED, après 1 seconde. La touche 2 envoie 0 pour les éteindre aussitôt et annuler les allumages en attente.

```knx
file: site/samples/extensions/delayed-switch.json
```

## Charger les scripts

```html
<script src="bus-diagram.js"></script>
<script src="extensions/delayed-switch.js"></script>
<script src="extensions/led-lamp-view.js"></script>
```

## Source

La source TypeScript `site/samples/extensions/delayed-switch.ts` est compilée en script classique par `npm run build`. Voir le [guide des extensions](../guide/extensions.html) pour l'API des comportements.
