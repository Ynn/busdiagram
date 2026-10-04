---
title: Premier schéma
translationOf: guide/02-first-diagram.md
sourceHash: "d5d0d66740ab"
order: 2
---

# Premier schéma

Cet exemple comporte une interface de boutons-poussoirs à quatre touches et un actionneur de commutation à quatre sorties. Les touches 1 et 2 allument et éteignent L1 et L2 ; les touches 3 et 4 font de même pour L1 à L4.

```knx
scenario: lighting-control
```

## 1. Intégrer le scénario

```html
<script src="bus-diagram.js"></script>

<bus-diagram>
  <script type="application/json">
    { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

Placez le JSON de l'installation dans un élément `<script type="application/json">` à l'intérieur de `<bus-diagram>`. Le navigateur n'exécute ni n'affiche ce script ; le composant le lit comme des données.

## 2. Déclarer la ligne et les adresses de groupe

```json
{
  "formatVersion": 2,
  "title": "Control multiple outputs",
  "lines": [{ "address": "1.1", "name": "Example line" }],
  "groupAddresses": [
    { "address": "1/1/1", "name": "L1–L2 lighting", "dpt": "1.001" },
    { "address": "1/1/2", "name": "L1–L4 lighting", "dpt": "1.001" }
  ],
  "devices": []
}
```

`lines` déclare les lignes à paire torsadée. L'adresse individuelle de chaque appareil appartient à une ligne déclarée. `groupAddresses` fournit les noms et les DPT affichés dans le moniteur de bus. L'exemple complet ajoute les appareils à ce squelette.

## 3. Ajouter l'interface de boutons-poussoirs

```json
{
  "id": "pushButton",
  "name": "Push-button interface",
  "address": "1.1.1",
  "kind": "buttonInterface",
  "behavior": "buttonInterface/v1",
  "objects": [
    { "id": "key1", "name": "Key 1", "ga": "1/1/1", "dpt": "1.001", "port": "switch", "channel": "in1", "flags": { "W": true, "T": true } },
    { "id": "key2", "name": "Key 2", "ga": "1/1/1", "dpt": "1.001", "port": "switch", "channel": "in2", "flags": { "W": true, "T": true } }
  ],
  "channels": [
    { "id": "in1", "label": "Input 1", "keyLabel": "Key 1", "parameters": { "function": "switch", "onPress": "on" } },
    { "id": "in2", "label": "Input 2", "keyLabel": "Key 2", "parameters": { "function": "switch", "onPress": "off" } }
  ]
}
```

L'appareil a une seule adresse individuelle, quel que soit son nombre d'entrées. Chaque entrée est câblée à une touche et dessinée comme une touche sur le schéma, qui affiche `keyLabel`, le texte écrit sur le bouton-poussoir (l'entrée garde son `label`) ; sa `function` décide de l'effet d'un appui, ici allumer ou éteindre. Chaque objet de communication a une adresse de groupe (`ga`), un DPT, un port du comportement, l'entrée à laquelle il appartient (`channel`) et des indicateurs ; l'objet émet quand son indicateur T est activé.

## 4. Ajouter l'actionneur de commutation

```json
{
  "id": "switchActuator",
  "name": "Four-output switching actuator",
  "address": "1.1.2",
  "kind": "switchActuator",
  "behavior": "switchActuator/v1",
  "objects": [
    { "id": "c1", "name": "Channel 1", "ga": ["1/1/1", "1/1/2"], "dpt": "1.001", "port": "switch", "channel": "s1", "flags": { "W": true, "T": false } }
  ],
  "channels": [{ "id": "s1", "label": "L1", "equipment": { "type": "lamp" } }]
}
```

La première adresse de `ga` est l'adresse d'émission de l'objet ; il écoute aussi les adresses suivantes. Le canal `s1` est une sortie de l'actionneur, et l'équipement qui y est raccordé est la lampe dessinée sur le schéma. Le scénario complet déclare les autres objets et voies.

## 5. Manipuler le schéma

Le schéma est dessiné à partir de ces déclarations. Pour suivre son comportement, appuyez sur la touche 1. Un télégramme va de l'interface de boutons-poussoirs à l'actionneur sur 1/1/1. Les canaux 1 et 2 l'acceptent et allument L1 et L2. Le moniteur de bus affiche le télégramme ; sélectionnez sa ligne pour examiner la trame. Ouvrez le [designer](../designer/index.html) pour modifier le scénario.
