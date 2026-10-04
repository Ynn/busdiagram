---
title: Chauffage pièce par pièce
summary: "Régulation PI et tout ou rien par pièce, vanne commandée en MLI, contact de fenêtre et modes de fonctionnement."
covers: "DPT 9.001 · DPT 5.001 · DPT 20.102"
translationOf: examples/09-hvac.md
sourceHash: "d665b8b0f127"
order: 9.3
---
# Chauffage pièce par pièce

Cet exemple chauffe deux pièces de deux façons différentes :

- **Séjour :** un thermostat PI envoie une grandeur de commande DPT 5.001 sur 3/0/1 à un actionneur de chauffage. L'actionneur commande en MLI une vanne thermoélectrique. La température circule en DPT 9.001 sur 3/4/1 ; ouvrez le détail d'un télégramme pour examiner sa valeur sur deux octets.
- **Chambre :** une régulation tout ou rien envoie une commande sur un bit sur 3/0/2 à un actionneur de commutation.

Essayez ces manipulations :

- Ouvrez la fenêtre du séjour dans le panneau **Pièces**. Le contact envoie 1 sur 3/3/1 ; le thermostat passe en protection hors gel à 7 °C et ferme la vanne. La pièce refroidit alors.
- Dans le panneau de l'interface USB, écrivez 3 (mode économie) sur l'adresse du mode central 3/2/0. Les deux consignes baissent de 4 K. Appuyez sur la touche **Présence** du thermostat du séjour pour revenir au mode confort.
- Réglez le thermostat du séjour sur 22,5 °C et suivez sa consigne actuelle sur 3/4/2.
- Baissez la température extérieure et observez la vanne s'ouvrir davantage pour maintenir la consigne.

```knx
scenario: room-heating
```
