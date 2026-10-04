---
title: DPT
translationOf: reference/05-dpt.md
sourceHash: "57265a3e2d03"
order: 5
---
# DPT pris en charge

Un télégramme ne transmet **pas** son DPT. Chaque objet récepteur interprète les données selon son propre DPT. L'état d'un objet mémorise la valeur décodée : pour le DPT 5.001, une valeur saisie de 50 % se code en octet `0x80` et se décode en environ 50,196 %. Le schéma l'arrondit, tandis que l'inspecteur affiche plus de précision.

{{dpts}}

Les valeurs de 1, 2 ou 4 bits occupent les bits de poids faible de l'octet APCI. Les valeurs plus longues le suivent sur 1 à 4 octets de données supplémentaires, comme l'indique la colonne Taille ; la longueur de la trame augmente d'autant.

D'autres DPT standard peuvent être utilisés sur les objets des appareils passifs et des afficheurs, qui les affichent sans les simuler : voir les [appareils passifs](../guide/devices.html#passive-device-and-visualization-panel-passive-v1).

En JSON, une heure (10.001) est un nombre de secondes comptées depuis 00:00 du jour donné par le jour de la semaine : 0 signifie aucun jour, 86400 × n + secondes signifie le jour n (1 = lundi, 7 = dimanche). Une date (11.001) s'écrit sous la forme du nombre `AAAAMMJJ`.

Une commande de scène (18.001) s'écrit comme l'octet du bus : 0 à 63 rappelle les scènes 1 à 64, et ajouter 128 (le bit d'apprentissage) mémorise la scène à la place ; le bit 6 est réservé.
