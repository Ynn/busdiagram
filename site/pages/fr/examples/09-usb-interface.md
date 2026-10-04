---
title: Outil interface USB
summary: "Écritures et lectures de groupe depuis un ordinateur de mise en service relié par une interface USB."
covers: "GroupValueRead · indicateurs R et U"
translationOf: examples/09-usb-interface.md
sourceHash: "6190d66c7019"
order: 9.5
---
# Panneau de l'interface USB : lectures et écritures de groupe

Une interface USB en 1.1.255 relie un ordinateur de mise en service à la ligne 1.1. Le panneau sous le schéma envoie `GroupValueWrite` ou `GroupValueRead` à l'adresse de groupe choisie.

- Écrivez `1/1/1 = Marche` : le télégramme part de 1.1.255 et traverse le coupleur de ligne 1.2.0, dont la table de filtrage contient 1/1/1.
- Lisez `1/4/1` : l'objet d'état de l'actionneur a l'indicateur R et utilise 1/4/1 comme adresse d'émission ; il répond donc par un `GroupValueResponse`.
- Lisez `1/1/1` : aucun objet associé à 1/1/1 n'a l'indicateur R ; la lecture reste sans réponse.

```knx
scenario: usb-interface
```
