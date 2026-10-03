---
title: API JavaScript
translationOf: reference/06-api.md
sourceHash: ee4eb08018a2
order: 6
---
# API JavaScript

Chargez `bus-diagram.js` pour exposer `window.BusDiagram`.

## Fonctions globales

| Fonction | Rôle |
| --- | --- |
| `version` | Version de la bibliothèque, par exemple `"{{version}}"` ; voir [versions](../guide/versions.html). |
| `create(target, scenario?, options?)` | Créer ou réutiliser un `<bus-diagram>` sur un sélecteur ou un élément ; renvoie le composant. |
| `registerBehavior(id, definition)` | Enregistrer un comportement d'extension ; les identifiants en double sont refusés. |
| `registerEquipment(id, definition)` | Enregistrer un modèle d'équipement. |
| `registerEquipmentView(id, { size, render })` | Enregistrer le dessin d'un équipement. |
| `buildScenario(json, registry?, t?)` | Valider et normaliser un JSON ; lève une `ScenarioError` avec des détails `{ path, code, message }` en cas d'échec. |
| `toV2(scenario)` | Écrire un scénario normalisé en JSON minimal au format 2 (les valeurs égales à leur valeur par défaut sont omises). |
| `createSimulator(json, options?)` | Créer une simulation sans composant DOM. |
| `registerMessages(language, messages)` | Ajouter ou compléter un catalogue de langue ; voir [langues](../guide/languages.html). |
| `availableLanguages()` | Lister les codes de langue disponibles. |
| `translator(language)` | Obtenir une fonction de traduction pour les messages de validation et du moteur. |
| `html`, `svg`, `nothing` | Utilitaires Lit pour les vues d'extension. |
| `OPTION_DOCS`, `DEFAULT_OPTIONS` | Métadonnées et valeurs par défaut des options d'affichage. |

## Élément `<bus-diagram>`

### Attributs et propriétés

| Nom | Rôle |
| --- | --- |
| Attribut `scenario` | Choisir un bloc JSON `<script>` par `#id`. |
| Attribut `src` | Charger un fichier JSON par son URL, en HTTP. |
| Propriété `options` | Options d'affichage JavaScript, qui l'emportent sur les attributs. |
| Propriété `view` | Options d'affichage effectives. |
| Propriété `simulation` | Simulation sous-jacente, pour un usage avancé. |

### Méthodes

| Méthode | Rôle |
| --- | --- |
| `load(json)` | Valider et remplacer le scénario, ou afficher ses erreurs. |
| `reset()` | Rétablir l'état initial et le temps zéro. |
| `play()`, `pause()` | Reprendre ou mettre en pause le temps simulé. |
| `advance(ms)` | Avancer d'un nombre positif ou nul de millisecondes simulées, même en pause. |
| `stepToNextEvent()` | Avancer jusqu'au prochain événement explicatif ; renvoie `{ timeMs, events }` ou `null`. |
| `setSpeed(n)` | Fixer une vitesse de simulation positive. |
| `getState()` | Renvoyer une copie sérialisable de l'état actuel. |
| `on(name, handler)` | S'abonner à `telegram`, `ready` ou `error` ; renvoie une fonction de désabonnement. |
| `groupWrite(address, value, interface?)` | Écrire une valeur de groupe par l'interface USB du scénario. |
| `groupRead(address, interface?)` | Lire une valeur de groupe par l'interface USB. |
| `roomAction(roomId, action, value)` | Régler l'état de la fenêtre ou la température extérieure d'une pièce. |
| `setClock(value)` | Régler l'horloge simulée sur une date et une heure locales (`YYYY-MM-DDTHH:MM[:SS]`). |
| `setBusVoltage(segment, on)` | Couper (`false`) ou rétablir (`true`) la tension bus d'un segment de ligne : `L1.1`, ou `L1.1b` derrière son extension. |

### Exemple de `getState()`

```json
{
  "timeMs": 11639,
  "paused": false,
  "faulted": false,
  "objects": {
    "panel/feedback": {
      "value": 50.19607843137255,
      "updatedAtMs": 11939,
      "flags": { "W": true, "T": false, "R": false, "U": true }
    }
  },
  "channels": {
    "shutter/s1": {
      "output": { "type": "motor", "direction": "stop" },
      "state": { "estimatedPositionPct": 50.19607843137255, "phase": "idle" }
    }
  },
  "equipment": {
    "shutter/s1": {
      "type": "shutter",
      "state": { "positionPct": 33.46, "drive": "stop", "moving": false, "limit": null }
    }
  },
  "rooms": {
    "living": { "temperatureC": 20.8, "outsideTemperatureC": 5, "windowOpen": false }
  },
  "telegramsInFlight": 0,
  "unpoweredSegments": [],
  "diagnostics": []
}
```

La table `objects` utilise des identifiants `deviceId/objectId`. `channels` et `equipment` utilisent `deviceId/channelId` ; `rooms` utilise les identifiants des pièces. `unpoweredSegments` liste les segments dont la tension bus est coupée. Les valeurs inconnues valent `null`.
