---
title: API JavaScript
translationOf: guide/11-api.md
sourceHash: "efb12bef2d98"
order: 11
---
# API JavaScript

Le fichier expose `window.BusDiagram`. La [référence de l'API](../reference/api.html) liste toutes les méthodes ; ce chapitre montre les tâches courantes.

## Créer un schéma

```js
const diagram = BusDiagram.create("#diagram", scenario, { toolbar: "compact" });
```

La cible peut être un sélecteur ou un élément. Une cible `<bus-diagram>` est réutilisée ; pour un autre élément, la méthode ajoute un composant à l'intérieur. Le scénario peut être un objet JSON, l'URL d'un JSON ou une référence `#id` vers un bloc JSON. La valeur renvoyée est le composant lui-même. Voir la [référence des options](../reference/options.html).

## Piloter le temps simulé

```js
diagram.pause();
diagram.advance(1300); // Advance 1.3 simulated seconds, even while paused.
diagram.play();
diagram.reset();
diagram.setSpeed(0.35);
diagram.stepToNextEvent();
```

Voir l'[exemple de pilotage par programme](../examples/programmatic-control.html).

## Lire l'état

```js
const state = diagram.getState();
state.timeMs;
state.objects["pushButton/key1"].value;
state.channels["shutter/s1"].state.estimatedPositionPct;
state.equipment["shutter/s1"].state.positionPct;
```

`getState()` renvoie une copie sérialisable. La modifier ne change pas la simulation.

## S'abonner aux événements

```js
diagram.on("telegram", (telegram) => {
  console.log(telegram.source, telegram.destination, telegram.value);
});
diagram.on("error", (error) => console.warn(error.message, error.details));
```

Chaque télégramme produit un événement, y compris les retours d'état automatiques. Le composant émet aussi des événements DOM comme `bd-telegram`, `bd-ready` et `bd-error`. Voir l'[exemple des événements](../examples/events.html).

## Utiliser l'interface USB

Si le scénario contient une interface USB, ces méthodes envoient des télégrammes de groupe depuis elle :

```js
diagram.groupWrite("1/1/1", 1);
diagram.groupRead("1/4/1");
```

Voir le [guide de l'interface USB](usb-interface.html).

## Agir sur une pièce

Dans un [scénario de chauffage](hvac.html), `roomAction` peut ouvrir une fenêtre ou changer la température extérieure :

```js
diagram.roomAction("living", "window", 1);
diagram.getState().rooms.living.temperatureC;
```

## Régler l'horloge simulée

Dans un scénario avec une [horloge simulée](time.html#simulated-clock), `setClock` la règle sur une autre date et heure locales ; `getState().clock` renvoie l'heure actuelle de l'horloge et sa vitesse :

```js
diagram.setClock("2026-10-01T06:59:30");
new Date(diagram.getState().clock.nowMs).toISOString(); // clock time, read as UTC fields
```

## Couper la tension bus

`setBusVoltage` coupe ou rétablit la tension bus d'un segment de ligne, comme un clic sur son alimentation ; voir [coupure de la tension bus](devices.html#bus-voltage-failure-and-recovery) :

```js
diagram.setBusVoltage("L1.2", false);
diagram.getState().unpoweredSegments; // ["L1.2"]
diagram.setBusVoltage("L1.2", true);
```

## Utiliser le moteur sans page

`createSimulator(json)` de `src/core.ts` crée une simulation sans DOM pour des tests ou des outils. Elle expose `input()`, `groupWrite()`, `groupRead()`, `setBusVoltage()`, `advance()`, `getState()` et `subscribe()`. Pour une entrée de contact d'une interface de boutons-poussoirs, `input(deviceId, channelId, "down")` enfonce la touche et `"up"` la relâche.
