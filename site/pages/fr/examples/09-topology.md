---
title: Topologie complète
summary: "Deux zones couplées par des routeurs KNXnet/IP, avec des coupleurs de ligne, une extension de ligne et un superviseur."
covers: "Filtrage · compteur de routage · KNXnet/IP"
translationOf: examples/09-topology.md
sourceHash: 2ee3b021eb7e
order: 9
---
# Topologie complète

Deux zones sont reliées par un réseau IP. Les routeurs KNXnet/IP 1.0.0 et 2.0.0 servent de coupleurs de zone ; l'installation comprend aussi quatre lignes, une extension de ligne commutable et un superviseur IP. Comparez une commande locale de la touche 3 depuis 1.1.10, filtrée par le coupleur de ligne, avec une commande de volet sur 2/1/1, qui traverse le réseau IP. Suivez le compteur de routage qui passe de 6 à 1. Faites passer l'extension en mode coupleur de segment et examinez la table de filtrage de chaque coupleur.

```knx
scenario: full-topology
```
