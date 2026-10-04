---
title: Scènes
summary: "Une adresse de scène rappelle un préréglage sur chaque canal d'actionneur."
covers: "DPT 17.001 · préréglages des canaux"
translationOf: examples/04-scenes.md
sourceHash: "064cf421d645"
order: 4
---
# Scènes

Une adresse de groupe d'un octet (DPT 17.001) transporte le numéro de scène moins un. Chaque canal d'actionneur mémorise son propre préréglage. La scène 1 (Arrivée) allume L1 et L2 et ouvre le volet ; la scène 2 (Départ) éteint les éclairages et ferme le volet.

```knx
scenario: scenes
```
