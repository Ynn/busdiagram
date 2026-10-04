---
title: Structure d'un scénario
translationOf: guide/04-scenario.md
sourceHash: "d4dc398a6941"
order: 4
---
# Structure d'un scénario

Un scénario est un document JSON au format version 2. La [référence JSON](../reference/json.html) liste tous les champs ; cette page explique comment ils s'articulent.

```json
{
  "formatVersion": 2,
  "title": "Example installation",
  "lines": [{ "address": "1.1" }],
  "groupAddresses": [],
  "devices": [],
  "options": { "speed": 1, "filterTables": false }
}
```

Seuls `formatVersion`, `lines` et `devices` sont obligatoires. Les champs facultatifs sont `title` et `description` (affichés au-dessus du schéma), `groupAddresses` (noms et DPT pour le moniteur), `groupRanges` (noms des groupes principaux et médians, affichés dans l'arborescence des adresses de groupe), `topology` (routage IP et réglages des coupleurs), `rooms` (pièces chauffées), `clock` (date et heure simulées, voir [temps](time.html#simulated-clock)) et `options` (vitesse initiale de la simulation et affichage des tables de filtrage). Pour la complétion dans l'éditeur, mettez dans `$schema` le schéma publié, `https://ynn.github.io/busdiagram/schema/scenario-v2.schema.json`, ou `schema/scenario-v2.schema.json` dans une copie locale.

## Topologie

La disposition du schéma découle des adresses ; vous n'avez pas à saisir de coordonnées de dessin.

| Déclaration | Schéma |
| --- | --- |
| Une ligne, comme `1.1` | Cette ligne et ses appareils. |
| Plusieurs lignes dans une zone (`1.1`, `1.2`) | La ligne principale et les coupleurs de ligne `1.1.0` et `1.2.0`. |
| Plusieurs zones (`1.1`, `2.1`) | Une ligne de zone (backbone) et les coupleurs de zone `1.0.0` et `2.0.0`. |
| `topology` | Routage KNXnet/IP et réglages des coupleurs ; voir [topologie](topology.html). |
| Une `extension` sur une ligne | Un segment en aval avec un répéteur ou un coupleur de segment. |

```knx
scenario: full-topology
attrs: monitor="false"
tabs: json
```

Les coupleurs déduisent leurs tables de filtrage des associations de groupe : une adresse traverse un coupleur quand on en a besoin de l'autre côté. Le compteur de routage part de 6 et diminue à chaque coupleur traversé par le télégramme.

## Pièces

`rooms` décrit les pièces chauffées, avec leurs températures initiale et extérieure et l'état de la fenêtre. Affectez un thermostat, un contact de fenêtre ou une sonde de température par son champ `room` ; affectez un radiateur par `"equipment": { "type": "radiator", "room": "living" }`. Voir [chauffage](hvac.html).

## Ordre des appareils et propagation

L'ordre des appareils dans `devices` suit leur ordre sur le câble. Il influe sur le temps de propagation : des appareils voisins sont à 250 ms l'un de l'autre dans la simulation. Voir [temps et cadence](time.html).

## Identifiants et références

Chaque appareil a un `id` unique. Chaque objet, touche, entrée et canal a un `id` unique dans son appareil. Les touches et les entrées désignent les objets par leur identifiant ; les objets désignent les canaux par `channel`. Une référence inconnue produit une [erreur de validation](errors.html) avec son chemin JSON.

## Adresses de groupe

Les adresses de groupe ont trois niveaux : groupe principal 0 à 31, groupe médian 0 à 7 et sous-groupe 0 à 255. `0/0/0` est la destination de diffusion générale et elle est refusée, comme dans les logiciels de mise en service.

Un objet peut écouter plusieurs adresses : `"ga": ["1/1/1", "1/4/1"]`. La première est son adresse d'émission ; les autres sont seulement en réception. `"ga": []` laisse un objet sans association ; c'est permis, sauf si une commande a besoin qu'il émette.

Les objets associés à une même adresse de groupe doivent avoir des tailles de données compatibles. Par exemple, un objet DPT 5.001 sur un octet ne peut pas partager une adresse avec un objet DPT 1.001 sur un bit. Des objets de même taille mais de sens différent, comme un numéro de scène (17.001) et un pourcentage (5.001), sont acceptés mais signalés par un [avertissement de configuration](../reference/errors.html#configuration-warnings) : les octets passent tels quels, et chaque récepteur les lit avec son propre DPT.
