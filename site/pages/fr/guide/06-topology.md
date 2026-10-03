---
title: Topologie et supervision
translationOf: guide/06-topology.md
sourceHash: 60ce6615e8c8
order: 6.5
---
# Topologie et supervision

Le modèle représente les lignes à paire torsadée, les coupleurs, les routeurs KNXnet/IP et le filtrage des adresses de groupe. Les tables de filtrage, les réglages de routage, les répéteurs de ligne et les coupleurs de segment sont décrits dans [coupleurs et répéteurs](couplers.html).

## Niveaux de la topologie

| Niveau | Adresses des appareils | Coupleur vers le niveau suivant |
| --- | --- | --- |
| Ligne `A.L` | `A.L.1` à `A.L.255` | Coupleur de ligne `A.L.0` |
| Ligne principale de zone `A.0` | `A.0.1` à `A.0.255` | Coupleur de zone `A.0.0` |
| Ligne de zone (backbone) `0.0` | `0.0.1` à `0.0.255` | — |

Déclarez les lignes dans `lines` avec des numéros de zone et de ligne de 1 à 15. Une ligne principale apparaît quand une zone a plus d'une ligne ; une ligne de zone apparaît quand l'installation a plus d'une zone. Pour montrer l'un de ces niveaux avec une installation plus petite, indiquez :

```json
"topology": { "mainLines": true, "backbone": true }
```

Des appareils peuvent alors se raccorder à une ligne principale (`1.0.5`) ou à la ligne de zone (`0.0.3`). Nommez les zones avec `"areas": [{ "address": 1, "name": "Bâtiment A" }]`.

## Alimentations

Chaque ligne à paire torsadée, et chaque segment derrière un répéteur de ligne ou un coupleur de segment, a besoin de sa propre alimentation KNX avec self. `powerSupply` la dessine sur le schéma, à côté du nom de la ligne :

```json
"lines": [
  { "address": "1.1", "powerSupply": { "name": "PSU 1.1", "currentMa": 640 },
    "extension": { "address": "1.1.64", "powerSupply": { "currentMa": 320 } } }
]
```

`currentMa` est le courant nominal (les valeurs courantes sont 160, 320, 640 et 1280 mA) ; les deux champs sont facultatifs. L'alimentation modélisée n'a ni adresse individuelle ni objets de communication (certaines alimentations avec diagnostic sont elles-mêmes des appareils KNX). BusDiagram ne calcule pas la charge du bus : la consommation de chaque appareil n'est pas modélisée. Le designer règle l'alimentation de chaque ligne dans sa section **Topologie**.

## Routeurs KNXnet/IP

Un routeur KNXnet/IP remplace un coupleur et utilise son adresse individuelle :

| `topology.ip` | Remplace | Adresses des routeurs | Niveau du réseau IP |
| --- | --- | --- | --- |
| `"areaCouplers"` | Les coupleurs de zone | `A.0.0` | Ligne de zone |
| `"lineCouplers"` | Les coupleurs de ligne | `A.L.0` | Lignes principales et ligne de zone |

Le modèle route à travers le réseau IP et applique la table de filtrage de chaque routeur comme pour un coupleur à paire torsadée. Un appareil avec `"medium": "IP"`, comme un superviseur, se raccorde à ce réseau.

```knx
scenario: full-topology
attrs: monitor="false"
tabs: json
```

Pour une installation à un seul routeur, l'ancienne forme `"ipRouter": { "address": "1.1.0" }` est aussi acceptée quand cette adresse est celle d'un coupleur.

## Ce que voit un superviseur

Un superviseur IP reçoit les télégrammes que les coupleurs routent vers le réseau IP. Un superviseur sur une ligne à paire torsadée (`"medium": "TP"`) voit le trafic de sa propre ligne. Les tables de filtrage des coupleurs sont déduites des associations d'adresses de groupe déclarées. Si un superviseur est omis de ces tables, le trafic de groupe qu'il attend peut être filtré ; `"inFilterTables": false` reproduit cette situation.

Un coupleur peut aussi router ou bloquer tous les télégrammes de groupe dans un sens :

```json
"topology": {
  "ip": "lineCouplers",
  "couplers": [{ "address": "1.1.0", "up": "route" }]
}
```

`down` règle le trafic du côté primaire vers le côté secondaire ; `up` règle le sens inverse. Chacun accepte `"filter"` (par défaut), `"route"` ou `"block"`. Utilisez **Tables de filtrage** dans la barre d'outils du schéma pour examiner chaque coupleur.

## Configurer la topologie dans le designer

La section **Topologie** du designer modifie les zones, les lignes, le routage IP, la ligne de zone et les lignes principales sans écrire de JSON à la main. Son panneau de coupleur donne accès au routage par sens et aux tables de filtrage. La carte d'un superviseur règle son support et son inclusion dans les tables de filtrage. Voir le [guide du designer](designer.html).
