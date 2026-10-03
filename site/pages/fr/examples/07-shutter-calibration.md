---
title: Volet mal calibré
summary: "L'actionneur estime la position du volet d'après sa durée de course configurée ; comparez-la avec la position réelle."
covers: "Position estimée et position réelle"
translationOf: examples/07-shutter-calibration.md
sourceHash: 95521dfe432f
order: 7
---
# Volet mal calibré

L'actionneur est réglé sur une durée de course de 20 secondes, mais le vrai volet met 30 secondes. Pour une cible de 50 %, l'actionneur fait tourner le moteur pendant 10 secondes et renvoie une position estimée de 50 % ; le vrai volet n'a parcouru qu'environ 33 %. Sélectionnez l'actionneur pour comparer les deux positions. Essayez ensuite le [bon réglage à 30 secondes](#correct-setting).

```knx
scenario: shutter-calibration
```

## Bon réglage

```knx
scenario: shutter-calibrated
```
