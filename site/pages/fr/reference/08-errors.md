---
title: Codes d'erreur
translationOf: reference/08-errors.md
sourceHash: "dda20c773df5"
order: 8
---
# Codes d'erreur

Chaque problème de validation a un `path` JSON, un `code` et un `message` traduit.

## Validation du scénario

| Code | Signification |
| --- | --- |
| `type` | Type de valeur incorrect. |
| `required` | Champ ou paramètre obligatoire manquant. |
| `unknown-field` | Champ du format 2 ou paramètre de comportement inconnu. |
| `enum` | Valeur hors des choix permis. |
| `range` | Nombre hors de sa plage permise. |
| `version` | `formatVersion` non pris en charge (seul 2 est pris en charge). |
| `id` | Syntaxe d'identifiant invalide. |
| `address` | Adresse individuelle, de ligne ou de groupe mal formée ou hors plage. |
| `duplicate` | Identifiant ou adresse en double. |
| `reference` | Référence à une ligne, un canal, un objet, un coupleur ou un niveau de topologie absent. |
| `port` | Port non accepté par un comportement, association de canal invalide, ou second objet sur un port qui n'en accepte qu'un. |
| `dpt` | DPT non pris en charge ou incompatible avec un port. |
| `association` | Tailles de données incompatibles sur une même adresse de groupe. |
| `toggle` | `"toggle"` utilisé avec un objet qui n'est pas sur un bit. |
| `conflict` | Actions ou réglages de topologie incompatibles entre eux. |
| `incompatible` | Touche, entrée ou équipement incompatible avec son comportement. |
| `unknown-behavior` | L'identifiant du comportement n'a pas été enregistré. |
| `unknown-equipment` | Le type d'équipement n'a pas été enregistré. |
| `unknown-room` | La pièce désignée n'est pas déclarée dans `rooms`. |
| `format` | Une valeur texte n'a pas le format attendu, comme `clock.start`. |

## Pendant la simulation

| Code | Signification |
| --- | --- |
| `extension-error` | Une extension a levé une exception ; la simulation se met en pause. |
| `cascade` | Trop d'événements au même instant simulé. |
| `incompatible-command` | Un équipement ne peut pas appliquer la commande de sortie d'un comportement. |
| `no-ga` | Un envoi a été demandé pour un objet sans adresse de groupe et a été ignoré. |
| `view-error` | La vue d'un équipement a échoué ; un cadre d'avertissement la remplace pendant que la simulation continue. |

## Avertissements de configuration

Ces avertissements n'arrêtent pas la simulation. Ils s'affichent au-dessus du schéma, et dans `getState().diagnostics`, quand un paramètre qui compense une propriété de la charge ne concorde pas avec cette propriété. Un scénario peut garder volontairement une telle discordance pour illustrer une erreur de mise en service.

| Code | Signification |
| --- | --- |
| `config-valve` | La sortie de l'actionneur de chauffage (`valveType`) et la vanne du radiateur ou du ventilo-convecteur raccordé (`normallyOpen`) ne concordent pas ; la vanne s'ouvre quand aucune chaleur n'est demandée. |
| `config-valve-mode` | Une grandeur de commande est liée à une sortie de l'actionneur de chauffage dont la fonction (`valveMode`) l'ignore : une grandeur de refroidissement sur une vanne de chauffage, une grandeur de chauffage sur une vanne de refroidissement, ou un objet chauffage/refroidissement sur une sortie qui n'est pas à changement de mode. |
| `config-emitter` | L'émetteur ne convient pas à la fonction de sa vanne : un radiateur sur une vanne de refroidissement, une batterie de ventilo-convecteur de l'autre sorte, ou un émetteur qui ne fait que chauffer ou que refroidir sur une vanne à changement de mode. |
| `config-slats` | La sortie de l'actionneur de volet et le volet raccordé ne sont pas d'accord sur les lamelles (`slatTravelMs` de la sortie et du volet) ; sur une sortie réglée pour un volet roulant, arrêt/pas au repos ne fait pas pivoter les lamelles. |
| `config-wiring` | L'inversion de sortie de l'actionneur de volets (`invertOutput`) et le câblage du moteur du volet (`wiringReversed`) ne concordent pas ; le volet va à l'inverse des commandes. |
| `config-contact` | Le type de contact de fenêtre (`contactType`) et l'inversion de l'entrée (`invert`) ne concordent pas, ou le contact d'un bouton-poussoir câblé sur une interface de boutons-poussoirs (`keyContact`) et le contact que son entrée attend à l'appui (`actuatedContact`) ne concordent pas ; ouvert et fermé, ou appuis et relâchements, sont vus à l'envers. |
| `config-value-range` | Une valeur d'une entrée d'interface de boutons-poussoirs (`shortValue`, `longValue`) est hors de la plage du DPT de son objet ; la valeur envoyée est ramenée à cette plage. |
| `config-no-power-supply` | Une ligne TP, ou le segment derrière son extension, ne déclare pas d'alimentation bus (`powerSupply`). Chaque segment TP a besoin de sa propre alimentation avec self ; la simulation fonctionne quand même. |
| `config-segment-size` | Plus de 64 raccordements sur un segment TP1 (une ligne, une ligne principale, la ligne de zone ou le segment derrière une extension) : les appareils, ainsi que les coupleurs, routeurs ou extensions de ligne, qui ont un raccordement TP1 sur chacun de leurs segments. La spécification KNX TP1 permet 64 appareils par segment, ou 256 avec des appareils TP1-256 ; sinon, utilisez un répéteur de ligne ou un coupleur de segment. |
| `config-datatype` | Une adresse de groupe relie des DPT de même taille mais de sens différent, comme un numéro de scène (17.001) et un pourcentage (5.001), ou 5.001 et 5.004. Les DPT sur un bit ne sont pas comparés. Un numéro de scène (17.001) et une commande de scène (18.001) concordent pour les rappels ; l'avertissement signale alors qu'un objet 17.001 lit un télégramme de mémorisation comme un rappel. |
| `config-program` | Une entrée du programme hebdomadaire d'un programmateur est illisible (jours, heure, valeur), ou sa valeur ne convient pas au DPT des objets de sortie ; l'entrée est ignorée. |
| `config-polarity` | Une adresse de groupe relie le DPT 1.009 (1 = fermé) et le DPT 1.019 (1 = ouvert), dont les valeurs ont des sens opposés. |
