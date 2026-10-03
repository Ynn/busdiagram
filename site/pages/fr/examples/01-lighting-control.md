---
title: Commander plusieurs sorties
summary: "Un bouton-poussoir et un actionneur à quatre sorties ; un seul télégramme commute plusieurs sorties."
covers: "DPT 1.001 · plusieurs adresses écoutées par objet"
translationOf: examples/01-lighting-control.md
sourceHash: ea8f6e01925a
order: 1
---
# Commander plusieurs sorties

Une interface de boutons-poussoirs à quatre touches et un actionneur de commutation à quatre sorties ont chacun une adresse individuelle. La touche 1 allume L1 et L2 ; la touche 2 les éteint. Les touches 3 et 4 font de même pour L1 à L4. Les canaux 1 et 2 écoutent les deux adresses de groupe, tandis que les canaux 3 et 4 n'écoutent que 1/1/2. Un seul télégramme peut commander plusieurs sorties. Les touches 1 et 2 partagent une adresse dans le même appareil : l'état local de leurs objets suit donc aussi leurs commandes.

```knx
scenario: lighting-control
```
