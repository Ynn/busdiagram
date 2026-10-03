---
title: Variation
summary: "Un actionneur de variation commandé par commutation, variation relative et niveau absolu."
covers: "DPT 1.001 · DPT 3.007 · DPT 5.001"
translationOf: examples/03-dimming.md
sourceHash: a994893ac087
order: 3.5
---
# Actionneur de variation

Une interface de boutons-poussoirs à deux touches et un panneau de visualisation commandent une lampe à variation par trois adresses de groupe, chacune avec son propre DPT :

- Un appui court sur la touche 1 ou 2 envoie marche ou arrêt (DPT 1.001) sur 1/1/1.
- Maintenir une touche envoie un pas de variation relative (DPT 3.007) sur 1/2/1 ; la relâcher envoie la valeur d'arrêt 0.
- Le champ numérique du panneau de visualisation envoie un niveau absolu (DPT 5.001) sur 1/3/1.

L'actionneur renvoie son état de commutation sur 1/4/1 et son niveau sur 1/5/1 après chaque transition. Le panneau reçoit l'état du niveau et l'affiche sur son objet.

Les trois objets de commande sont des entrées indépendantes. Un niveau de 100 % sur 1/3/1 allume la lampe et met l'état de commutation 1/4/1 à 1, mais l'objet de commande de commutation sur 1/1/1 garde sa dernière valeur reçue, 0. Les manuels d'actionneurs de variation décrivent la même séparation : l'objet de commutation reçoit les commandes (indicateurs C, W, T), et l'objet d'état de commutation signale « marche » dès que la luminosité n'est pas nulle (indicateurs C, R, T). L'état de la lampe se lit ou se surveille donc sur 1/4/1 ; l'objet de commande n'a pas l'indicateur R, si bien qu'une lecture de 1/1/1 ne reçoit aucune réponse de l'actionneur. Voir [indicateurs R et U](../guide/usb-interface.html#r-and-u-flags).

```knx
scenario: dimming
```
