---
title: Coupure de la tension bus
summary: "Couper et rétablir la tension bus d'une ligne ; verrouiller une sortie et temporiser sa commutation."
covers: "Coupure et retour du bus · verrouillage · temporisations"
translationOf: examples/09-bus-voltage.md
sourceHash: "534c22a61ddc"
order: 9.6
---
# Coupure de la tension bus, verrouillage et temporisations

L'interface de boutons-poussoirs est sur la ligne 1.1, l'actionneur de commutation sur la ligne 1.2. Chaque ligne a sa propre alimentation.

- Allumez L1 avec l'entrée 1, puis cliquez sur **Alim. 640 mA** sur la ligne 1.2. L'actionneur éteint L1, comme réglé pour une coupure de la tension bus (`busFailure: "off"`). La ligne devient grise : ses appareils ne reçoivent ni n'envoient plus rien, et le coupleur de ligne ne lui transmet plus de télégrammes.
- Cliquez à nouveau sur l'étiquette. L1 revient à son état d'avant la coupure (`busRecovery: "previous"`) et l'actionneur envoie son état.
- Coupez plutôt la tension de la ligne 1.1 : l'entrée 1 renvoie sa valeur actuelle 2 secondes après le retour de la tension (`busRecovery: "update"`).
- L'entrée 2 verrouille L1, comme pour le ménage : L1 s'éteint et ignore les commandes jusqu'à la fin du verrouillage ; la dernière commande reçue est alors appliquée.
- L'entrée 3 commute L2 avec une temporisation à l'enclenchement de 2 secondes et une temporisation au déclenchement de 5 secondes.

```knx
scenario: bus-voltage
```
