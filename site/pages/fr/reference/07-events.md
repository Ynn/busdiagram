---
title: Événements
translationOf: reference/07-events.md
sourceHash: c9e571d49866
order: 7
---
# Événements

`<bus-diagram>` émet des événements DOM avec `bubbles` et `composed` activés. `diagram.on("telegram", handler)` est une méthode d'abonnement pratique.

## `bd-telegram`

Émis une fois à l'envoi de chaque télégramme, y compris les retours d'état automatiques.

| Champ de `detail` | Signification |
| --- | --- |
| `id` | Numéro du télégramme. |
| `timeMs` | Instant d'envoi simulé. |
| `source` | Adresse individuelle de l'émetteur. |
| `destination` | Adresse de groupe destinataire. |
| `value` | Valeur décodée. |
| `raw` | Bits ou octets des données codées. |
| `dpt` | DPT de l'objet émetteur. |
| `service` | Service de groupe, comme `GroupValueWrite`. |
| `kind` | `"cmd"` pour une commande ou `"state"` pour un retour d'état. |
| `causeId` | Identifiant de l'entrée ou de l'événement interne à l'origine du télégramme. |

## `bd-select`

Émis quand la carte d'un appareil est sélectionnée. `detail.deviceId` identifie l'appareil ; le designer utilise cet événement pour ouvrir son formulaire.

## `bd-ready`

Émis après le chargement réussi d'un scénario. Il n'a pas de données `detail`.

## `bd-error`

Émis quand un scénario ne peut pas être chargé. `detail.message` est le message affiché ; `detail.details` est un tableau d'entrées `{ path, code, message }`. `String(event.detail)` renvoie le message.
