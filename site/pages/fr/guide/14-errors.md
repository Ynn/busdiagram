---
title: Diagnostiquer une erreur
translationOf: guide/14-errors.md
sourceHash: 53bcb44aed94
order: 14
---
# Diagnostiquer les erreurs

Un scénario invalide ne démarre pas. Le composant liste chaque erreur de validation avec son chemin JSON.

```text
Scénario invalide :
• devices[1].objects[0].dpt : DPT 5.001 incompatible avec le port « switch » (attendu : 1.001)
• devices[1].channels[0].parameters.estimatedTravelTimeMs : paramètre requis
• devices[0].behavior : comportement inconnu « delayedSwitch/v1 » (extension non chargée ?)
```

## Lire un chemin

`devices[1].objects[0].dpt` désigne le deuxième appareil, son premier objet et le champ `dpt` de cet objet. Le [designer](../designer/index.html) met le champ en évidence et peut y placer le curseur.

## Causes fréquentes

| Symptôme | À vérifier |
| --- | --- |
| JSON invalide à la ligne N | Virgule ou guillemet fermant manquant. |
| Ligne non déclarée | Ajoutez son adresse à `lines` ou corrigez l'adresse de l'appareil. |
| Identifiant d'objet inconnu | Une touche ou un voyant désigne l'objet d'un autre appareil, ou contient une faute de frappe. |
| Le port demande un canal | Ajoutez `"channel": "s1"` et déclarez le canal `s1`. |
| DPT incompatible | Utilisez un DPT accepté par le [port](../reference/ports.html). |
| Tailles de données mélangées sur un groupe | N'associez pas des objets sur un bit et sur un octet à la même adresse. |
| Champ inconnu | Vérifiez le nom du champ du format 2. |
| Comportement inconnu | Vérifiez son identifiant et chargez son script d'extension avant le composant. |

Voir la [référence des codes d'erreur](../reference/errors.html) pour tous les codes.

## Erreurs pendant la simulation

Une exception d'extension ou une cascade d'événements met en pause le schéma concerné et affiche un bandeau d'erreur. **Réinitialiser** rétablit l'état initial.

```js
diagram.addEventListener("bd-error", (event) => {
  console.log(event.detail.message);
  console.table(event.detail.details); // Array of { path, code, message }.
});
```
