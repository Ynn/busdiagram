---
title: Volets
translationOf: guide/06-shutters.md
sourceHash: "0d1f985b02e7"
order: 6
---
# Volets : course estimée et course réelle

Dans ce modèle, un actionneur de volets n'a pas de capteur de position. Il estime la position d'après sa **durée de course configurée**. S'il est réglé sur 20 secondes, 10 secondes de descente sont renvoyées comme 50 %. Le volet raccordé a sa propre **durée de course réelle**. Le modèle suit les deux positions séparément :

- **Position estimée :** la valeur de l'actionneur, transmise sur `positionStatus`.
- **Position réelle :** l'endroit où se trouve le volet raccordé, avec ses butées physiques.
- **Commande du moteur :** le sens appliqué en ce moment à la sortie.

```knx
scenario: shutter-calibration
```

Avec une cible de 50 % et une durée de course configurée de 20 secondes, l'actionneur descend pendant 10 secondes et renvoie 50 %. Un vrai volet qui met 30 secondes pour faire sa course n'atteint qu'environ 33 %. Comparez le résultat avec un actionneur correctement réglé :

```knx
scenario: shutter-calibrated
attrs: monitor="false" description="false"
tabs: json
```

## Ports des objets de communication

| Port | DPT | Effet |
| --- | --- | --- |
| `move` | 1.008 | 0 monte vers 0 % ; 1 descend vers 100 %. |
| `stopStep` | 1.007 | Arrête un volet en mouvement. À l'arrêt, oriente d'un pas les lamelles d'un store à lamelles ; sans effet sur un volet roulant, sauf si `stepPct` est défini. |
| `positionCommand` | 5.001 | Fixe une position cible. |
| `positionStatus` | 5.001 | Envoie la position estimée après un arrêt, avec un délai. |
| `scene` | 17.001 | Rappelle un préréglage de position du canal. |
| `slatCommand` / `slatStatus` | 5.001 | Consigne d'angle des lamelles et angle estimé d'un store à lamelles (0 % ouvert, 100 % fermé). |
| `windAlarm` | 1.005, 1.001 | 1 monte le volet et ignore les autres commandes ; 0 le libère là où il est. Sans `channel`, s'applique à tous les canaux. |
| `rainAlarm` / `frostAlarm` | 1.005, 1.001 | Alarmes pluie et gel, avec leurs réactions `rainReaction` (montée par défaut) et `frostReaction` (aucun mouvement par défaut) ; `windReaction` règle celle de l'alarme vent. |
| `forced` | 2.008, 2.001 | 3 force la descente, 2 force la montée ; 0 ou 1 termine le forçage (`afterForcing`). Le DPT 2.008 (commande de direction) est celui de la description d'application KNX des actionneurs de volets. |
| `lock` | 1.001 | 1 verrouille la sortie : les commandes sont ignorées ; `lockStart` (montée, descente, arrêt ou une position `lockPositionPct`) et `afterLock` (montée, descente ou retour à la position d'avant le verrouillage) règlent ses réactions. |
| `recallPosition12` / `recallPosition34` | 1.022, 1.001 | 0 ou 1 va à la position mémorisée 1 ou 2 (3 ou 4) : `preset1Pct` … `preset4Pct`. |
| `storePosition12` / `storePosition34` | 1.001 | 0 ou 1 mémorise la position actuelle comme position 1 ou 2 (3 ou 4), sauf si `presetStoring` vaut false. |
| `upperLimit` / `lowerLimit` | 1.002 | 1 quand le volet est estimé en haut ou en bas, envoyé à chaque changement. |

Quand plusieurs causes tiennent une sortie, la première active s'applique, dans l'ordre de `safetyPriority` (alarmes météo, puis verrouillage, puis forçage par défaut, comme sur les actionneurs de volets courants ; la description d'application KNX des actionneurs de stores place le forçage au-dessus des alarmes météo, ce que reproduit `"forced,alarms,lock"`), les alarmes météo dans l'ordre de `alarmPriority` (vent, pluie, gel par défaut). Une cause qui se termine passe la sortie à la suivante ; quand il n'en reste aucune, `afterAlarm`, `afterForcing` ou `afterLock` fixe le mouvement (aucun, montée, descente ou retour à la position d'avant la première cause). Avec `alarmMonitoringMs`, un objet d'alarme qui ne reçoit aucun télégramme dans ce délai est considéré comme actif, comme pour un capteur météo qui envoie ses alarmes cycliquement.

La convention de position est **0 % ouvert (en haut), 100 % fermé (en bas)**. Un moteur câblé à l'envers se décrit sur le volet par `"wiringReversed": true` dans les paramètres de son équipement ; le paramètre `invertOutput` de l'actionneur le compense sans changer la convention de sens du DPT. Quand les deux ne concordent pas, le volet va à l'inverse des commandes et un avertissement de configuration s'affiche au-dessus du schéma.

## Règles de l'actionneur

- Un volet monte généralement plus lentement qu'il ne descend. `estimatedTravelTimeUpMs` sur le canal de l'actionneur et `actualTravelTimeUpMs` sur le volet fixent les durées de montée ; sans eux, la durée de montée est égale à celle de descente.

- `startDelayMs` (300 ms par défaut) sépare un démarrage ou une inversion de la commande moteur précédente, pour éviter d'alimenter les deux sens à la fois.
- Une nouvelle commande remplace un démarrage, un arrêt ou un envoi d'état en attente.
- En butée estimée, une commande peut rester sans effet même si le vrai volet est ailleurs. `endSupplementPct` peut ajouter une course supplémentaire pour atteindre la butée physique ; il vaut 0 par défaut.
- Pendant une alarme vent, les commandes de mouvement, d'arrêt/pas, de position et de scène sont ignorées et notées dans le journal des événements. La fin de l'alarme ne rétablit pas la position précédente. Voir l'[exemple de protection météo](../examples/weather-protection.html).
- À la coupure de la tension bus, les moteurs s'arrêtent (`busFailure: "stop"`), ou vont vers une fin de course (`"up"`, `"down"`) jusqu'au retour de la tension, la position estimée suivant le temps écoulé ; au retour, la sortie reste telle quelle (`busRecovery: "none"`), monte ou descend, ou va à `busRecoveryPositionPct`, et la position estimée est renvoyée.
- Une commande arrêt/pas à l'arrêt oriente les lamelles d'un store à lamelles (voir plus bas). Sur un volet roulant sans lamelles, elle est sans effet, comme dans la fonction arrêt/pas de KNX et dans la plupart des manuels d'actionneurs. Certains actionneurs déplacent plutôt un volet roulant d'un petit pas ; mettez `stepPct` (par exemple 5) sur le canal pour les modéliser.

## Stores à lamelles

Un store à lamelles utilise le même moteur pour orienter ses lamelles et pour se déplacer. Indiquez `slatTravelMs`, la durée pour que les lamelles passent d'ouvertes à fermées, des deux côtés :

- sur le canal de l'actionneur (`parameters.slatTravelMs`) : la durée configurée, utilisée pour l'estimation ;
- sur l'équipement du volet (`equipment.parameters.slatTravelMs`) : la durée réelle du store.

Un mouvement oriente d'abord les lamelles : fermées (100 %) avant de descendre, ouvertes (0 %) avant de monter. Une commande arrêt/pas à l'arrêt oriente les lamelles de `slatStepPct` (20 % par défaut) au lieu de déplacer le store. Le port `slatCommand` (DPT 5.001) oriente les lamelles à un angle sans déplacer le store, et `slatStatus` renvoie l'angle estimé après chaque arrêt. Le schéma dessine les lamelles plus épaisses à mesure qu'elles se ferment. Voir l'[exemple du store à lamelles](../examples/venetian-blind.html).

## Paramètres

```json
"channels": [{
  "id": "s1",
  "label": "Shutter S1",
  "parameters": { "estimatedTravelTimeMs": 20000 },
  "initialState": { "estimatedPositionPct": 0 },
  "equipment": {
    "type": "shutter",
    "parameters": { "actualTravelTimeMs": 30000 },
    "initialState": { "positionPct": 0 }
  }
}]
```

Voir la [référence des comportements](../reference/behaviors.html) pour tous les paramètres.
