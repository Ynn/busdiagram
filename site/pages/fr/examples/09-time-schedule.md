---
title: Programme horaire
summary: "Une horloge simulée pilote une horloge maître, un programmateur hebdomadaire et une plage horaire de nuit dans un module logique."
covers: "DPT 10.001 · DPT 11.001 · programmateur · plage horaire"
translationOf: examples/09-time-schedule.md
sourceHash: "cf303a1f91c0"
order: 9.47
---
# Programme horaire

Le scénario déclare une [horloge simulée](../guide/time.html#simulated-clock) qui démarre le lundi à 21:57 et va 60 fois plus vite que le temps simulé. Sa date et son heure apparaissent dans une barre en haut à gauche de la zone du schéma.

- **Horloge maître :** envoie l'heure (DPT 10.001 sur 6/0/1) et la date (DPT 11.001 sur 6/0/2) à chaque minute de l'horloge. L'afficheur de l'heure reçoit les deux.
- **Programmateur hebdomadaire :** son programme allume l'éclairage du couloir à 07:00 et l'éteint à 22:00 les jours de semaine, à 08:30 et 23:00 le week-end. Regardez l'éclairage du couloir s'éteindre à 22:00.
- **Logique de nuit :** le module logique ne transmet le détecteur de présence du jardin à l'éclairage du jardin qu'entre 22:00 et 06:00, d'après l'heure reçue de l'horloge maître. Appuyez sur **Mouvement** avant 22:00, puis après.

Utilisez **Régler l'heure** sur le badge de l'horloge pour passer, par exemple, à 06:59 un jour de semaine et voir l'éclairage du couloir s'allumer.

```knx
scenario: time-schedule
```
