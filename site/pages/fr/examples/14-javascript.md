---
title: Créer un schéma en JavaScript
summary: "Créer un schéma dans un élément depuis un script."
covers: "BusDiagram.create"
translationOf: examples/14-javascript.md
sourceHash: e2ce2635c7ff
order: 14
---
# Créer un schéma en JavaScript

`BusDiagram.create(target, scenario, options)` crée un schéma dans l'élément choisi.

```html live
<div id="js-root"></div>
<script>
  const scenario = {
    formatVersion: 2,
    title: "Créé en JavaScript",
    lines: [{ address: "1.1" }],
    devices: [
      {
        id: "pushButton",
        name: "Interface de boutons-poussoirs",
        address: "1.1.1",
        kind: "buttonInterface",
        behavior: "buttonInterface/v1",
        objects: [
          {
            id: "b1",
            name: "Touche 1",
            ga: "1/1/1",
            dpt: "1.001",
            port: "switch",
            channel: "key1",
            flags: { W: true, T: true },
          },
        ],
        channels: [
          {
            id: "key1",
            label: "Entrée 1",
            keyLabel: "Touche 1",
            parameters: { function: "switch", ledShown: true },
          },
        ],
      },
      {
        id: "switchActuator",
        name: "Actionneur de commutation",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [
          {
            id: "c1",
            name: "Canal 1",
            ga: "1/1/1",
            dpt: "1.001",
            port: "switch",
            channel: "s1",
            flags: { W: true, T: false },
          },
        ],
        channels: [{ id: "s1", label: "L1", equipment: { type: "lamp" } }],
      },
    ],
  };
  BusDiagram.create("#js-root", scenario, {
    toolbar: "compact",
    monitor: false,
  });
</script>
```

Le deuxième argument peut aussi être l'URL d'un fichier (`"../scenarios/lighting-control.json"`, page servie en HTTP) ou le sélecteur d'un bloc JSON (`"#scenario-json"`).
