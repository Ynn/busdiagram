---
title: Store à lamelles
summary: "Un appui long déplace le store une fois les lamelles orientées ; un appui court oriente les lamelles ; consigne et retour de l'angle des lamelles."
covers: "DPT 1.008 · DPT 1.007 · DPT 5.001 lamelles"
translationOf: examples/03-venetian-blind.md
sourceHash: "1bdaefa689a1"
order: 3.2
---
# Store à lamelles

Un store à lamelles utilise un seul moteur pour deux choses : il oriente d'abord les lamelles, puis déplace le store. En descente, les lamelles se ferment avant que le store commence à descendre ; en montée, elles s'ouvrent avant qu'il monte.

- Un appui long sur la touche 1 ou 2 déplace le store (DPT 1.008 sur 2/1/1).
- Un appui court à l'arrêt oriente les lamelles d'un pas (DPT 1.007 sur 2/1/2) ; pendant un mouvement, il arrête le store.
- Les champs numériques du panneau de visualisation envoient une position (2/1/3) et un angle de lamelles (2/1/4), tous deux en DPT 5.001 : 0 % signifie ouvert ou en haut, 100 % fermé ou en bas.

L'actionneur n'a pas de capteur : il estime la position et l'angle des lamelles d'après ses durées configurées de course et d'orientation, et les renvoie sur 2/1/5 et 2/1/6 après chaque arrêt. Sélectionnez l'actionneur pour comparer l'estimation avec le store réel.

```knx
scenario: venetian-blind
```
