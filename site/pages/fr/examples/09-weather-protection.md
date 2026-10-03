---
title: Protection météo
summary: "Une station météo monte le volet en cas de vent ; un module logique applique la protection solaire en mode automatique."
covers: "DPT 9.004 · DPT 9.005 · DPT 1.005 · ET logique"
translationOf: examples/09-weather-protection.md
sourceHash: 3a907a9275e1
order: 9.4
---
# Protection météo et module logique

Une station météo, un module logique et un actionneur de volets partagent la ligne de la façade. Saisissez des valeurs dans les champs de la station :

- **Touches du volet :** un appui long sur la touche 1 ou 2 déplace le volet ; un appui court l'arrête ou oriente les lamelles.
- **Alarme vent :** une vitesse du vent de 10 m/s ou plus active l'alarme sur 2/6/1 (DPT 1.005). L'actionneur monte le volet et ignore les autres commandes. L'alarme se désactive sous 8 m/s (seuil moins une hystérésis de 2 m/s) ; le volet reste alors où il est.
- **Protection solaire :** une luminosité de 40 000 lx ou plus active la demande sur 2/6/2. Le module logique la combine par un ET avec le mode automatique de la touche 3 (DPT 1.003), et envoie le résultat comme commande montée/descente sur 2/1/1.
- **Module logique :** mode automatique désactivé, la demande reste dans le module logique. Appuyez sur la touche 3 pour l'activer et suivez le télégramme qui en résulte.

La vitesse du vent (DPT 9.005) et la luminosité (DPT 9.004) sont des valeurs en virgule flottante sur deux octets ; ouvrez un télégramme pour examiner leur codage.

```knx
scenario: weather-protection
```
