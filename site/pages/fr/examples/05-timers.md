---
title: Minuteries
summary: "Sorties temporisées, horloge et détecteur de présence gérés par l'actionneur."
covers: "Minuterie d'escalier · redéclenchement · présence"
translationOf: examples/05-timers.md
sourceHash: 570b2e2ad560
order: 5
---
# Minuteries

L'actionneur gère la temporisation : un seul télégramme de marche lance la minuterie, et la sortie s'éteint localement. Utilisez le retour d'état dans le moniteur de bus pour mesurer la durée. Chaque nouvelle détection relance la temporisation de L3 : le détecteur de présence envoie 1 à chaque passage et laisse l'extinction à l'actionneur. Un programmateur hebdomadaire allume le canal A à 08:00 et l'éteint à 08:05 ; l'horloge simulée démarre à 07:59:30 et va dix fois plus vite. L'[exemple de programme horaire](time-schedule.html) ajoute une horloge maître qui envoie l'heure.

```knx
scenario: timers
```
