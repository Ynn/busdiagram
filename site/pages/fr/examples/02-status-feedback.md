---
title: Retour d'état
summary: "Deux touches en bascule sur la même sortie, avec et sans retour d'état."
covers: "Bascule · objet d'état · touches désynchronisées"
translationOf: examples/02-status-feedback.md
sourceHash: "aacb801bde2a"
order: 2
---
# Retour d'état

Les touches 1 et 3 inversent L1 ; la touche 2 inverse le groupe L1–L4. La touche 1 n'écoute que 1/1/1. Après que la touche 2 a changé L1, la touche 1 est désynchronisée et son appui suivant peut sembler sans effet. La touche 3 écoute aussi le retour d'état sur 1/4/1 : son état reste synchronisé. Le canal 2 écoute aussi ce retour : un message d'état est un télégramme ordinaire du bus que d'autres objets peuvent utiliser.

```knx
scenario: status-feedback
```
