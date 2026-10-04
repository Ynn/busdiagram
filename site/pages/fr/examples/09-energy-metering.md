---
title: Mesure d'énergie
summary: "Un actionneur de commutation avec mesure renvoie la puissance et l'énergie de chaque sortie, et déleste une charge au-delà d'une limite de puissance."
covers: "DPT 14.056 · DPT 13.010 · délestage"
translationOf: examples/09-energy-metering.md
sourceHash: "a3a91a9d5222"
order: 9.46
---
# Mesure d'énergie et délestage

L'actionneur de commutation mesure la puissance consommée par chaque sortie et la renvoie sur 5/2/x (DPT 14.056, W), l'énergie comptée par sortie sur 5/3/x (DPT 13.010, Wh) et sa puissance totale sur 5/4/0.

- Allumez le four (2500 W) et le chauffe-eau (1500 W) : la puissance totale dépasse la limite de 3500 W.
- L'actionneur active son objet de limite de puissance sur 5/4/1 et coupe le chauffe-eau, marqué pour le délestage. Sa commande est mémorisée entre-temps.
- Après 20 secondes, le chauffe-eau est réenclenché si sa commande le demande toujours ; il est délesté à nouveau si la limite est toujours dépassée.

La puissance de chaque charge vient de sa puissance nominale dans le schéma. L'énergie est comptée 60 fois plus vite que le temps réel (`energyTimeScale`), pour que les compteurs avancent visiblement pendant une démonstration.

```knx
scenario: energy-metering
```
