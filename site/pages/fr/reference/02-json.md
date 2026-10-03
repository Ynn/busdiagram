---
title: Scénario JSON
translationOf: reference/02-json.md
sourceHash: 2969adf456b6
order: 2
---
# Scénario JSON (format 2)

Cette référence est générée à partir du schéma de rédaction `schema/scenario-v2.schema.json`. Le composant valide en plus les références entre objets, canaux, adresses et ports des comportements. Voir les [codes d'erreur](errors.html).

## Racine

{{json:root}}

## Ligne

{{json:line}}

## Alimentation

{{json:powerSupply}}

## Pièce

{{json:room}}

Voir le [guide CVC](../guide/hvac.html) pour le modèle thermique et des exemples.

## Adresse de groupe

{{json:groupAddress}}

## Appareil

{{json:device}}

Les paramètres propres à chaque comportement figurent dans la [référence des comportements](behaviors.html).

## Objet de communication

{{json:object}}

## Touche

{{json:button}}

Une action de touche (`press`, `short` ou `long`) désigne un objet et lui donne un nombre ou `"toggle"`, par exemple `{ "object": "key1", "value": 1 }`.

## Entrée numérique

{{json:input}}

## Canal

{{json:channel}}

## Équipement

{{json:equipment}}
