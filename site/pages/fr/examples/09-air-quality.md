---
title: Qualité de l'air
summary: "Un capteur de CO₂ commande un ventilateur en trois paliers et active des alarmes de CO₂ et d'humidité."
covers: "DPT 9.007 · DPT 9.008 · DPT 5.001 · DPT 1.005"
translationOf: examples/09-air-quality.md
sourceHash: "b262f6ce4f3b"
order: 9.45
---
# Qualité de l'air : CO₂ et humidité

Un capteur d'ambiance mesure la température (DPT 9.001), l'humidité relative (DPT 9.007) et la concentration de CO₂ (DPT 9.008). Saisissez des valeurs dans ses champs :

- **Ventilation :** le régulateur à paliers compare la concentration de CO₂ à trois seuils (800, 1000 et 1200 ppm, avec une bande d'hystérésis de 50 ppm) et envoie la grandeur de commande du palier actuel (0, 33, 66 ou 100 %) sur 4/2/1. Un actionneur de variation fait tourner le ventilateur à cette vitesse.
- **Alarmes :** au-delà de 1500 ppm, l'alarme CO₂ est activée sur 4/2/2 ; au-delà de 70 % d'humidité relative, l'alarme d'humidité est activée sur 4/2/3. Les deux se désactivent sous leur seuil moins une hystérésis et apparaissent sur l'afficheur d'alarmes.

Le profil du capteur est neutre : il rassemble des fonctions couramment proposées par les capteurs de CO₂ KNX, comme les valeurs mesurées, les seuils d'alarme et un régulateur à paliers avec une durée minimale par palier. Il n'y a pas de modèle de l'air : les valeurs sont saisies par le lecteur.

```knx
scenario: air-quality
```
