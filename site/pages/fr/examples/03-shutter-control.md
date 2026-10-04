---
title: Commande de volets
summary: "Un appui long déplace le volet, un appui court l'arrête ou oriente les lamelles ; un superviseur IP affiche la position."
covers: "DPT 1.008 · DPT 1.007 · retour de position"
translationOf: examples/03-shutter-control.md
sourceHash: "e1af6676874a"
order: 3
---
# Commande de volets

Un appui long envoie montée/descente sur 2/1/1 ; un appui court envoie arrêt/pas sur 2/2/1. La touche 1 commande les deux sens depuis une seule touche. La touche 4 descend le volet et allume L1 avec un seul télégramme, parce que des objets compatibles en DPT 1.008 et 1.001 partagent une adresse. Un superviseur sur le réseau IP observe le retour de position à travers le routeur KNXnet/IP 1.1.0.

```knx
scenario: shutter-control
```
