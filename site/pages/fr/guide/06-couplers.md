---
title: Coupleurs et répéteurs
translationOf: guide/06-couplers.md
sourceHash: "6b8d42dc4ebc"
order: 6.6
---
# Coupleurs et répéteurs

Les coupleurs relient les niveaux de la topologie et décident quels télégrammes de groupe les traversent. BusDiagram déduit la plupart des coupleurs des adresses déclarées dans le scénario ; les extensions de ligne sont déclarées explicitement.

## Types de coupleurs

| Appareil | Adresse | Relie | Télégrammes de groupe |
| --- | --- | --- | --- |
| Coupleur de ligne | `A.L.0` | La ligne `A.L` et la ligne principale `A.0` | Filtrés par sa table de filtrage, ou routés ou bloqués selon le réglage. |
| Coupleur de zone | `A.0.0` | La ligne principale `A.0` et la ligne de zone `0.0` | Même principe au niveau de la zone. |
| Routeur KNXnet/IP | `A.L.0` ou `A.0.0` | Une ligne ou une zone et le réseau IP | Remplace un coupleur de ligne ou de zone ; même principe de table de filtrage. |
| Répéteur de ligne | sur la ligne, par exemple `A.L.64` | Le segment principal d'une ligne et un second segment | Répétés sans filtrage. |
| Coupleur de segment | sur la ligne, par exemple `A.L.64` | Le segment principal d'une ligne et un second segment | Filtrés : le trafic propre à un segment n'atteint pas l'autre. |

Les coupleurs de ligne et de zone apparaissent automatiquement quand l'installation a plusieurs lignes ou plusieurs zones ; voir [topologie](topology.html). Les routeurs KNXnet/IP se choisissent avec `topology.ip`.

## Tables de filtrage et compteur de routage

La table de filtrage d'un coupleur liste les adresses de groupe qui franchissent la ligne : celles qui sont associées à des objets de ses deux côtés. Elle est déduite des associations déclarées dans le scénario, comme le fait le logiciel de mise en service à partir d'un projet : une adresse qui relie un appareil de la ligne 1.1 et un appareil de la ligne 15.15 entre dans les tables de 1.1.0, 1.0.0, 15.0.0 et 15.15.0. La même table s'applique dans les deux sens. Un télégramme dont la destination est dans la table traverse le coupleur ; les autres sont filtrés.

Un appareil qui envoie ou reçoit une adresse sans avoir d'objet dans le projet, comme une visualisation ou un outil raccordé par une interface bus, n'est pas pris en compte : ses télégrammes sur cette adresse sont filtrés au premier coupleur. Les versions récentes des logiciels de mise en service ne permettent plus de modifier les tables de filtrage à la main dans les nouveaux projets ; la pratique recommandée est de modéliser l'interface bus et de lui affecter les adresses de groupe qu'elle utilise, ou d'ajouter dans sa ligne un appareil fictif portant ces adresses. Dans un scénario, listez les adresses d'une interface USB dans son paramètre `groupAddresses`, et mettez `"inFilterTables": false` sur un superviseur pour montrer un appareil qui n'a pas été modélisé.

Chaque sens se règle indépendamment dans `topology.couplers` : `down` du primaire vers le secondaire, `up` en sens inverse, chacun avec `"filter"` (par défaut), `"route"` ou `"block"` :

```json
"topology": {
  "couplers": [{ "address": "1.1.0", "up": "route" }]
}
```

Tout télégramme part avec un compteur de routage de 6, la valeur par défaut usuelle (chaque appareil l'a comme paramètre de sa couche réseau). Chaque coupleur, répéteur de ligne ou routeur qui le transmet décrémente le compteur ; un télégramme qui arrive avec un compteur à 0 n'est pas retransmis. Les règles de routage actuelles ne donnent pas de sens particulier à 7 : il est décrémenté comme les autres valeurs. Un pont TP1 (bridge), autre type d'extension de ligne, transmet sans changer le compteur ; il n'est pas modélisé.

Sur le schéma, **Tables de filtrage** dans la barre d'outils affiche la table de chaque coupleur, et le détail d'un télégramme liste chaque coupleur traversé avec sa décision et le compteur de routage.

## Répéteurs de ligne et coupleurs de segment

Une ligne peut être prolongée par un second segment, relié à son segment principal :

```json
"lines": [
  { "address": "2.1", "extension": { "address": "2.1.64", "mode": "repeater" } }
]
```

- `address` est une adresse individuelle de la même ligne, utilisée par l'extension elle-même. Les répéteurs utilisent par convention `.64`, `.128` ou `.192`.
- `mode` vaut `"repeater"` (par défaut) ou `"segmentCoupler"`.
- `switchable: true` ajoute à la barre d'outils du schéma une commande qui fait passer l'extension de répéteur à coupleur de segment, pour comparer les deux comportements avec le même trafic.

Un appareil se place sur le second segment avec `"downstream": true` ; les autres appareils de la ligne restent sur le segment principal. Dans chaque segment, l'ordre des appareils suit l'ordre de `devices`.

Dans le [designer](designer.html), chaque ligne a un champ **Extension de ligne** (aucune, répéteur de ligne ou coupleur de segment) et un champ d'adresse. Le formulaire d'un appareil de cette ligne propose alors **Sur le segment derrière l'extension de ligne**.

## Règles et limites du modèle

Dans une installation à paire torsadée, jusqu'à trois répéteurs de ligne peuvent prolonger une ligne, chacun relié directement au segment principal. Les répéteurs ne sont jamais montés en série : une ligne compte donc au plus quatre segments. BusDiagram modélise une extension par ligne, toujours reliée au segment principal : les répéteurs ne peuvent pas être chaînés, et une ligne a au plus deux segments sur un schéma.

Les télégrammes à adresse individuelle, que les coupleurs de segment filtrent aussi dans les installations réelles, sont hors du modèle ; voir [modèle et limites](limits.html).

```knx
scenario: full-topology
attrs: monitor="false"
tabs: json
```
