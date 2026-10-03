---
title: Variation et DALI
translationOf: guide/06-dali.md
sourceHash: 5e08452f772c
order: 6.2
---
# Variation et DALI

Ce chapitre traite des actionneurs de variation KNX et d'une passerelle KNX/DALI. Il s'intéresse à la commande de groupe et aux télégrammes échangés avec leurs objets de communication.

## Ports de l'actionneur de variation

Un canal `dimmerActuator/v1` accepte trois sortes de commandes :

| Port | DPT | Rôle |
| --- | --- | --- |
| `switch` | 1.001 | Allumer au niveau configuré, ou éteindre. |
| `dim` | 3.007 | Variation relative : sens, pas ou arrêt. |
| `value` | 5.001 | Luminosité absolue de 0 à 100 %. |
| `status` | 1.001 | État marche/arrêt réel après une transition. |
| `valueStatus` | 5.001 | Luminosité réelle après une transition. |
| `scene` | 17.001 | Rappeler un préréglage de luminosité du canal. |

Les paramètres de canal comprennent `onLevel` (`"fixed"` ou `"last"`), `onLevelPct`, `dimTimeMs`, `switchFadeMs`, `valueFadeMs`, `minLevelPct`, `maxLevelPct`, `dimSwitchesOn` et `dimSwitchesOff` pour la variation relative, et `valueSwitchesOn` et `valueSwitchesOff` pour les valeurs de luminosité. Avec `valueSwitchesOn: false`, une valeur reçue quand le canal est éteint est ignorée ; avec `valueSwitchesOff: false`, une valeur de 0 fait descendre au niveau minimal au lieu d'éteindre. Les deux options existent dans les manuels d'actionneurs de variation ; par défaut, les deux sont permises. Le niveau d'allumage reste entre les niveaux minimal et maximal. À la coupure de la tension bus, le niveau reste inchangé, passe à l'arrêt ou à `busFailureLevelPct` (`busFailure`) ; au retour, il revient au niveau d'avant la coupure, ou passe à l'arrêt ou en marche (`busRecovery`), et l'état est renvoyé. Les objets facultatifs de forçage et de verrouillage de la description KNX des actionneurs de variation ne sont pas modélisés. Voir la [référence des comportements](../reference/behaviors.html).

```json
{
  "id": "dimmer",
  "address": "1.1.3",
  "kind": "dimmerActuator",
  "behavior": "dimmerActuator/v1",
  "objects": [
    { "id": "switch", "ga": "1/1/1", "dpt": "1.001", "port": "switch", "channel": "s1", "flags": { "W": true, "T": false } },
    { "id": "dim", "ga": "1/2/1", "dpt": "3.007", "port": "dim", "channel": "s1", "flags": { "W": true, "T": false } }
  ],
  "channels": [{ "id": "s1", "label": "Ceiling light", "equipment": { "type": "dimmableLamp" } }]
}
```

## Blanc variable

Un canal d'actionneur de variation qui a un objet `colourTemperature` (DPT 7.600, K) commande aussi la température de couleur d'un éclairage à blanc variable. Les demandes sont ramenées à la plage du canal (de `minColourK`, 2700 K, à `maxColourK`, 6500 K, par défaut), et `colourTemperatureStatus` renvoie la valeur appliquée. La valeur initiale est `initialState.colourTemperatureK` (4000 K). Une charge `dimmableLamp` montre la couleur de sa lumière. Voir l'[exemple du blanc variable](../examples/tunable-white.html).

## Variation par bouton-poussoir

Une entrée d'interface de boutons-poussoirs avec la fonction de variation utilise un appui court pour commuter, un appui long pour la variation continue, et le relâchement pour l'arrêter. Avec une paire de touches, une entrée fait varier plus clair et l'autre plus sombre :

```json
{
  "id": "key1",
  "label": "Key 1 brighter",
  "parameters": { "function": "dim", "dimMode": "brighter", "dimStep": 1 }
}
```

L'appui long envoie la valeur 9 du DPT 3.007 : augmentation de la luminosité avec le plus grand pas (100 %). L'actionneur fait varier à sa vitesse configurée jusqu'à l'arrivée d'une valeur d'arrêt ; le temps de trajet des télégrammes peut donc influer sur le niveau final.

## Passerelle KNX/DALI

Une ligne DALI compte jusqu'à 64 appareillages adressés individuellement, 16 groupes et des commandes de diffusion générale. Dans ce modèle, chaque canal `daliGateway/v1` représente un groupe DALI (jusqu'à 16 par passerelle). Son équipement `daliGroup` contient les ballasts modélisés et leurs adresses courtes :

```json
"channels": [{
  "id": "g1",
  "label": "Office",
  "equipment": { "type": "daliGroup", "parameters": { "ballasts": 4, "firstAddress": 0 } }
}]
```

La passerelle ajoute ces ports aux commandes de variation :

| Port | DPT | Rôle |
| --- | --- | --- |
| `error` | 1.005 | Défaut dans un groupe. |
| `broadcastSwitch` | 1.001 | Commuter tous les groupes. |
| `broadcastValue` | 5.001 | Régler la valeur de tous les groupes. |
| `generalError` | 1.005 | Défaut n'importe où sur la ligne DALI. |

Chaque commande KNX produit une action DALI affichée dans le journal des événements et en mode pas à pas :

| Commande KNX | Action DALI modélisée |
| --- | --- |
| Allumage | `RECALL MAX LEVEL` ou `DAPC` au niveau d'allumage configuré. |
| Extinction | `OFF`. |
| Valeur DPT 5.001 | Niveau de puissance d'arc `DAPC`. |
| Variation DPT 3.007 | `UP` ou `DOWN`, suivi d'un arrêt. |
| Scène DPT 17.001 | La scène KNX 1 à 16 correspond à `GO TO SCENE 0` à `15` en DALI. |

La passerelle accepte jusqu'à 16 canaux de groupe. Dans ce modèle, les scènes KNX 1 à 16 correspondent directement aux scènes DALI 0 à 15 : configurez donc seulement les préréglages des scènes 1 à 16 ; les autres valeurs de scène KNX n'ont pas de préréglage et laissent la sortie inchangée. C'est une simplification : la description d'application KNX des passerelles DALI prend en charge jusqu'à 64 scènes KNX, que la configuration de la passerelle associe à ses canaux DALI, et laisse au fabricant la traduction des valeurs KNX en commandes DALI.

La passerelle interroge les ballasts toutes les `pollMs` (2 secondes par défaut). Cliquez sur un luminaire pour simuler un défaut de ballast ; la lampe s'éteint et la passerelle active les objets `error` de son groupe et `generalError`. Cliquez à nouveau pour le réparer. Les objets d'état et de défaut peuvent répondre aux lectures du [panneau de l'interface USB](usb-interface.html).

```knx
scenario: dali-gateway
tabs: json
```

## Limites du modèle

La mise en service DALI, l'attribution des adresses courtes et l'appartenance aux groupes sont fournies par le scénario au lieu d'être simulées. Le modèle accepte au plus 16 ballasts par groupe modélisé et exige des plages d'adresses courtes disjointes entre les groupes d'une même passerelle ; un appareillage DALI réel peut appartenir à plusieurs groupes, mais cet état partagé est hors du modèle. Le modèle gère la commande de groupe et la diffusion générale, mais pas les objets de ballast individuels, la commande de couleur, l'éclairage de sécurité ni la mesure d'énergie. Le schéma affiche les valeurs de puissance d'arc DALI comme données explicatives ; le niveau d'éclairement simulé suit le pourcentage configuré.
