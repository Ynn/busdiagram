---
title: Pompe à chaleur et eau chaude
summary: "Commuter une pompe à chaleur depuis un thermostat d'ambiance ; chauffer un ballon d'eau chaude avec son propre thermostat."
covers: "Pompe à chaleur · durée minimale d'arrêt · ballon d'eau chaude · sorties mesurées"
translationOf: examples/09-heat-pump.md
sourceHash: c036d62ba7ec
order: 9.67
---
# Pompe à chaleur et eau chaude

Le thermostat d'ambiance régule le séjour en tout ou rien : sa sortie de chauffage valide la pompe à chaleur par l'actionneur de commutation. L'actionneur mesure ses deux sorties.

- Au départ, la pièce est à 17 °C : la pompe à chaleur tourne et consomme 1500 W ; avec un coefficient de performance de 3,5, elle fournit environ 5 kW de chaleur.
- Montez la consigne sur la visualisation, puis baissez-la : quand le thermostat arrête et relance rapidement la pompe à chaleur, le compresseur attend sa durée minimale d'arrêt avant de redémarrer.
- Appuyez sur **Eau chaude** : la résistance du ballon chauffe l'eau jusqu'à 60 °C, la consigne de son propre thermostat, puis ne consomme plus rien bien que l'actionneur l'alimente toujours. Cliquez sur le ballon pour puiser de l'eau chaude : dès que l'eau est 5 K sous la consigne, la résistance chauffe à nouveau.

```knx
scenario: heat-pump
```
