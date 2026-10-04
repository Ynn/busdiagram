---
title: Blanc variable
summary: "Un actionneur de variation règle le niveau et la température de couleur d'un éclairage à blanc variable."
covers: "DPT 5.001 · DPT 7.600"
translationOf: examples/03-tunable-white.md
sourceHash: "689405d68366"
order: 3.7
---
# Blanc variable

Un éclairage à blanc variable a deux réglages : son niveau (DPT 5.001) et sa température de couleur en kelvins (DPT 7.600). Les touches 1 à 3 envoient 2700 K (chaud), 4000 K (neutre) et 6500 K (froid) sur 1/6/1 ; les champs numériques du panneau de visualisation envoient un niveau ou une température de couleur quelconques.

L'actionneur ramène la température de couleur à la plage de son canal, ici 2700–6500 K, et renvoie la valeur appliquée sur 1/6/2. Saisissez 7000 K pour voir la limitation dans le journal des événements. La lampe affiche le niveau et la température de couleur.

```knx
scenario: tunable-white
```
