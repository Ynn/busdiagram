---
title: Outil interface USB
translationOf: guide/07-usb-interface.md
sourceHash: "57a9f5cfa8b5"
order: 7.5
---
# Panneau de l'interface USB

Le panneau intégré de l'interface USB représente un ordinateur de mise en service relié au bus par une interface USB. Il envoie des lectures et des écritures d'adresses de groupe dans la même topologie simulée que tous les autres appareils. Le panneau n'apparaît que lorsque le scénario déclare une interface.

## Ajouter une interface USB

Placez `usbInterface/v1` sur la ligne voulue. Son adresse se trouve souvent en haut de la plage d'adresses de la ligne :

```json
{
  "id": "usbInterface",
  "name": "USB interface",
  "address": "1.1.255",
  "kind": "interface",
  "behavior": "usbInterface/v1",
  "objects": []
}
```

Le designer peut ajouter cet appareil par son sélecteur d'appareils guidé.

## Lire et écrire

| Action | Service KNX | Effet |
| --- | --- | --- |
| Écrire | `GroupValueWrite` | Envoie la valeur saisie à l'adresse de groupe choisie. |
| Lire | `GroupValueRead` | Demande une réponse aux objets associés à l'adresse dont l'indicateur R est activé ; chacun répond sur sa propre adresse d'émission. |

Le panneau utilise le DPT déclaré du groupe, ou un DPT déduit des objets associés. Ses télégrammes suivent les mêmes coupleurs et tables de filtrage que ceux des appareils et apparaissent dans le moniteur de bus.

Une interface USB n'a pas d'objets de communication : ses adresses ne figurent donc pas dans les tables de filtrage des coupleurs, sauf si elles lui sont affectées, comme pour une interface bus modélisée dans un projet. Listez-les dans le paramètre `groupAddresses`, par exemple `"parameters": { "groupAddresses": "1/1/1 1/4/1" }`. Sans lui, une écriture sur une adresse utilisée seulement sur une autre ligne est filtrée par le premier coupleur, et la réponse à une lecture ne peut pas revenir. Voir [tables de filtrage](couplers.html#filter-tables-and-routing-counter).

Une demande de lecture peut utiliser n'importe quelle adresse associée à l'objet qui doit répondre ; la réponse est toujours envoyée sur l'adresse d'émission de cet objet, sa première adresse. Si l'adresse d'émission n'est pas celle qui a été lue, la réponse peut agir sur d'autres appareils ; la documentation de formation KNX recommande donc de lire sur l'adresse d'émission.

```knx
scenario: usb-interface
tabs: json
```

## Indicateurs R et U

| Indicateur | Rôle | Par défaut dans ce modèle |
| --- | --- | --- |
| `R` lecture | Répondre à une lecture sur n'importe quelle adresse associée ; la réponse utilise l'adresse d'émission de l'objet. | Activé pour les objets d'état usuels, comme `status` et `positionStatus`. |
| `U` mise à jour | Appliquer à l'objet une réponse reçue. | Activé pour les objets d'affichage. |

```json
"flags": { "W": false, "T": true, "R": true }
```

L'indicateur U d'un objet de commande est normalement désactivé, pour qu'une réponse à une lecture n'agisse pas par accident comme une nouvelle commande. Vous pouvez activer U explicitement pour observer ce comportement.

Pour connaître l'état d'une sortie, lisez son adresse d'**état**, pas son adresse de commande. Les objets de commande des actionneurs n'ont généralement pas l'indicateur R, comme dans les manuels des produits (par exemple, l'objet de commutation d'un actionneur de variation est C, W, T, et son objet d'état de commutation C, R, T). Une lecture de l'adresse de commande ne reçoit donc aucune réponse de l'actionneur, et l'objet de commande garde la dernière commande reçue même quand une autre commande, comme une valeur de luminosité, a changé la sortie depuis.

## API JavaScript

```js
const diagram = document.querySelector("bus-diagram");
diagram.groupWrite("1/1/1", 1);
diagram.groupRead("1/4/1");
```

L'API sans DOM expose aussi `groupWrite(interfaceId, groupAddress, value)` et `groupRead(interfaceId, groupAddress)` par `createSimulator`. Les valeurs invalides sont refusées avant la transmission. Par exemple, `NaN`, l'infini, des valeurs hors plage ou une fraction pour un DPT entier font lever une `RangeError` à `groupWrite`. Les valeurs acceptées sont envoyées sous leur forme codée selon le DPT ; 30 % en DPT 5.001 devient environ 30,196 % après codage sur un octet.
