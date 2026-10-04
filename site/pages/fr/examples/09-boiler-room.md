---
title: Pompe à chaleur derrière une passerelle
summary: "Une pompe à chaleur et un ballon d'eau chaude commandés par leur propre système : une passerelle les relie à KNX, et un compteur indépendant les mesure."
covers: "Passerelle vers Modbus · compteur d'énergie · DPT 9.024 · DPT 13.013"
translationOf: examples/09-boiler-room.md
sourceHash: "604edc162e27"
order: 9.47
---
# Pompe à chaleur et eau chaude derrière une passerelle

Dans de nombreux bâtiments, la pompe à chaleur, le ballon d'eau chaude et le plancher chauffant sont commandés par leur propre système, relié à KNX par une passerelle (Modbus, BACnet ou M-Bus). KNX ne voit alors que les valeurs et les commandes que la passerelle échange. Le schéma montre cette frontière ; l'autre système n'est pas simulé.

- Saisissez les températures du ballon, de départ et de retour sur la passerelle : elles viennent de Modbus et sont envoyées sur 3/1/x (DPT 9.001). L'afficheur les montre.
- Les touches envoient le mode de chauffage (3/2/0, DPT 20.102) et une relance de l'eau chaude (3/2/1). La passerelle les reçoit et les transmet à Modbus ; le journal des événements le montre, mais la réaction de la pompe à chaleur n'est pas modélisée.
- Le compteur d'énergie mesure deux circuits qu'il ne commute pas. La pompe à chaleur utilise les kW et kWh (DPT 9.024 et 13.013), le chauffe-eau les W et Wh (DPT 14.056 et 13.010) : les mêmes grandeurs dans des unités différentes. Saisissez une puissance mesurée pour la modifier ; l'énergie est comptée 60 fois plus vite que le temps réel.

La ligne affiche son alimentation (640 mA) à côté de son nom.

```knx
scenario: boiler-room
```
