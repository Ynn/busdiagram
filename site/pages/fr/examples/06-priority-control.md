---
title: Commande prioritaire
summary: "Une commande prioritaire l'emporte sur la commutation normale jusqu'à sa levée."
covers: "DPT 2.001 · marche/arrêt forcés"
translationOf: examples/06-priority-control.md
sourceHash: "dbeb054373b5"
order: 6
---
# Commande prioritaire

Un appui court sur la touche 3 force L4 à l'arrêt avec la valeur 2 du DPT 2.001 ; un appui long lève le forçage avec la valeur 0. La touche 4 continue d'envoyer des télégrammes de bascule pendant le forçage. L'actionneur mémorise ces commandes, mais L4 reste éteinte jusqu'à la fin du forçage. Il applique alors la dernière commande reçue, selon son réglage `afterForcing`.

```knx
scenario: priority-control
```
