---
title: Interface de boutons-poussoirs
summary: "Une interface de boutons-poussoirs mesure elle-même les appuis : variation et store sur une touche, et scène mémorisée par un appui long."
covers: "DPT 3.007 · DPT 1.008 · DPT 18.001 · entrées de contact"
translationOf: examples/03-push-button-interface.md
sourceHash: e67dc46ab65e
order: 3.8
---
# Interface de boutons-poussoirs

L'interface a quatre entrées câblées à des boutons-poussoirs conventionnels. Chaque touche du schéma est un contact : elle signale quand elle est enfoncée et quand elle est relâchée, et l'interface décide si l'appui est court ou long, comme un vrai appareil.

- **L'entrée 1** inverse L1. Son objet de commutation écoute aussi l'adresse d'état 1/4/1 : la bascule suit la lampe.
- **L'entrée 2** fait varier L2 sur une seule touche : un appui court la commute, un appui long fait varier plus clair quand la lampe est éteinte et sinon dans le sens inverse de la fois précédente ; relâcher la touche arrête la variation.
- **L'entrée 3** commande le store sur une seule touche : un appui long le déplace, dans l'autre sens à chaque fois ; un appui court l'arrête.
- **L'entrée 4** rappelle la scène 1 par un appui court. Un appui long mémorise la scène (DPT 18.001, bit d'apprentissage) : chaque actionneur garde son état actuel comme nouvelle scène 1. Changez les éclairages, mémorisez, changez-les à nouveau, puis rappelez.

```knx
scenario: push-button-interface
```
