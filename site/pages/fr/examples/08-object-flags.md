---
title: Indicateurs W et T
summary: "Écritures ignorées et émissions bloquées sur un actionneur à six sorties."
covers: "Indicateurs W et T · examen des objets"
translationOf: examples/08-object-flags.md
sourceHash: 00bf6c7ff3ff
order: 8
---
# Indicateurs W et T

La touche 1 envoie un télégramme à L1 et L2. Les deux objets le reçoivent, mais L2 a son indicateur **W** désactivé et ignore l'écriture : sa sortie ne change pas. La touche 2 a son indicateur **T** désactivé : sa valeur locale change sans qu'un télégramme soit transmis. Sélectionnez l'actionneur pour examiner ses six canaux déclarés, y compris ses trois sorties inutilisées.

```knx
scenario: object-flags
```
