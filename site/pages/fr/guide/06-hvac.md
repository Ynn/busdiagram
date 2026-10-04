---
title: Chauffage
translationOf: guide/06-hvac.md
sourceHash: "afe231bfee1c"
order: 6.3
---
# Chauffage et climatisation (CVC)

Ce chapitre modélise la régulation de la température des pièces avec un thermostat, un actionneur de chauffage, une vanne thermoélectrique, un radiateur ou un ventilo-convecteur, et un contact de fenêtre. La puissance de chauffage ou de refroidissement est supposée disponible : il n'y a ni chaudière ni circuit d'eau ; une pompe à chaleur est une charge qui chauffe ou refroidit sa pièce (voir [limites du modèle](#model-limits)). Le temps de simulation est compressé : un changement qui prendrait des heures dans un bâtiment devient visible en quelques minutes.

## Pièces et modèle thermique

Chaque entrée de `rooms` mémorise la température d'une pièce, la température extérieure et la constante de temps thermique. La température tend vers la température extérieure pendant que les équipements de chauffage ou de refroidissement ajoutent ou retirent de la chaleur. Le `powerK` d'un radiateur n'est pas une puissance en watts : c'est l'écart de température, en K, que le radiateur seul pourrait maintenir au-dessus de la température extérieure, vanne entièrement ouverte. Une fenêtre ouverte multiplie les pertes thermiques par huit. La valeur par défaut de `timeConstantMs` est de 300 secondes dans le modèle accéléré.

```json
"rooms": [
  { "id": "living", "name": "Living room", "temperatureC": 18, "outsideTemperatureC": 5 }
]
```

Affectez un thermostat, un contact de fenêtre ou une sonde de température à une pièce avec `"room": "living"`. Un canal de radiateur utilise `"equipment": { "type": "radiator", "room": "living" }`. Le panneau **Pièces** affiche la température, les consignes, les positions des vannes et l'état des fenêtres. `roomAction(roomId, "window" | "outside", value)` offre les mêmes commandes depuis JavaScript. Une température extérieure saisie sur une [station météo](devices.html#weather-station-weatherstation-v1) devient aussi la température extérieure de toutes les pièces, sauf si son paramètre `setsRoomOutdoorTemperature` vaut `false`.

La fenêtre physique et le bus sont distincts. Ouvrir la fenêtre dans le panneau **Pièces** change les pertes thermiques et fait envoyer un télégramme au contact de fenêtre. Un télégramme écrit directement sur l'objet de fenêtre d'un thermostat, par exemple depuis le panneau de l'interface USB, change le mode du thermostat mais n'ouvre pas la fenêtre physique ; cela peut représenter un défaut du contact.

## DPT utiles

| DPT | Taille | Signification |
| --- | --- | --- |
| 9.001 | 2 octets | Température en °C, codée en flottant KNX sur deux octets. |
| 9.002 | 2 octets | Différence de température en K. |
| 20.102 | 1 octet | Mode CVC : 0 auto, 1 confort, 2 veille, 3 économie, 4 protection du bâtiment. |
| 1.019 | 1 bit | État de la fenêtre ; 1 signifie ouverte. |
| 1.009 | 1 bit | Ouvert/fermé ; 1 signifie fermé. |
| 1.100 | 1 bit | 1 signifie chauffage, 0 refroidissement. |
| 5.001 | 1 octet | Grandeur de commande continue de 0 à 100 %. |

Une valeur DPT 9.001 utilise deux octets de données après l'APCI. Tant qu'un objet n'a pas reçu ou mesuré de valeur, un objet 9.xxx peut rester inconnu.

## Thermostat d'ambiance

`roomThermostat/v1` mesure une pièce et commande le chauffage ou le refroidissement. Son afficheur montre la température mesurée, le mode, la consigne et la demande. Des touches et des entrées numériques facultatives agissent sur les objets de présence et de consigne.

Le thermostat comprend un gestionnaire de consignes avec une politique fixe. Cette politique est un choix du modèle, pas une règle du DPT 20.102. Le mode est choisi par priorité : un mode forcé (`forcedMode`, 1 à 4) l'emporte sur tout, un contact de fenêtre défaillant compris, jusqu'à ce qu'il reçoive 0 (auto) ; une fenêtre ouverte demande la protection du bâtiment ; une protection du bâtiment présélectionnée (absence, vacances) reste en vigueur ; sinon la présence demande le confort ; sinon la présélection s'applique. La présélection vient de l'objet `hvacMode` sur un octet ou des objets sur un bit `comfortMode`, `nightMode` et `protectionMode`, selon ceux qui ont reçu un télégramme en dernier : parmi les objets sur un bit, la protection l'emporte sur le confort, le confort sur la nuit, et la veille s'applique quand tous valent 0, comme sur les régulateurs d'ambiance qui les proposent. Avant tout télégramme, les objets sur un bit décident quand l'un d'eux démarre à 1, et la présélection sinon. Le mode auto utilise le confort dans ce modèle. La consigne de confort en chauffage vaut par défaut `comfortC: 21`. Les modes veille et économie l'abaissent de `standbyShiftK` et `economyShiftK` ; la protection hors gel vaut par défaut `frostProtectionC: 7`. Le refroidissement utilise `deadZoneK` entre les consignes de chauffage et de refroidissement, et une consigne de protection contre les fortes chaleurs. Voir [chauffage et refroidissement](#heating-and-cooling) pour la façon dont le thermostat choisit entre les deux.

Pour la **régulation PI**, `controlType: "pi"` utilise `proportionalBandK` et `integralTimeMs`. Il envoie une valeur DPT 5.001 sur `heatingValue` ou `coolingValue` quand la variation atteint `valueSendDeltaPct` ; une sortie sur un bit `heatingSwitch` ou `coolingSwitch` utilise la MLI sur `pwmCycleMs`. Pour la **régulation tout ou rien**, `controlType: "twoPoint"` coupe une sortie sur un bit à la consigne et la réenclenche `hysteresisK` en dessous (au-dessus en refroidissement). Certains régulateurs d'ambiance centrent plutôt l'hystérésis sur la consigne : avec 21 °C et 2 K, marche à 20 °C et arrêt à 22 °C.

| Port | DPT | Sens | Rôle |
| --- | --- | --- | --- |
| `actualTemp` | 9.001 | Émission | Température mesurée. |
| `externalTemp` | 9.001 | Réception | Remplace la sonde interne. Avec `externalTempTimeoutMs`, la sonde interne est de nouveau utilisée quand aucune valeur n'arrive dans ce délai. |
| `baseSetpoint` | 9.001 | Réception | Consigne de base de confort. Avec l'indicateur T, une valeur saisie sur l'appareil est aussi envoyée : deux thermostats qui partagent cette adresse gardent la même base, chacun appliquant ses propres abaissements. Ne reliez pas `setpointStatus` à la place : il porte la consigne actuelle, abaissement compris. |
| `setpointShift` | 9.002 | Réception | Décalage de consigne. |
| `setpointStatus` | 9.001 | Émission | Consigne actuelle. |
| `hvacMode` / `hvacModeStatus` | 20.102 | Réception / émission | Mode demandé et mode actuel. |
| `comfortMode`, `nightMode`, `protectionMode` | 1.001 | Réception | Présélection du mode par objets sur un bit (nuit : 1 économie, 0 veille). |
| `forcedMode` | 20.102 | Réception | Mode forcé, au-dessus de toute autre entrée ; 0 (auto) le termine. |
| `presence` | 1.018 ou 1.001 | Réception | La présence demande le confort, sauf pendant la protection du bâtiment. Avec `presenceType: "button"`, chaque 1 prolonge le mode confort de `comfortExtensionMs` (2 h par défaut), comme un poussoir de présence. |
| `window` | 1.019, 1.001 ou 1.009 | Réception | Une fenêtre ouverte demande la protection ; avec 1.009, 0 signifie ouverte. |
| `heatCool` / `heatCoolStatus` | 1.100 | Réception / émission | Choix du chauffage ou du refroidissement, et mode en cours. `heatCool` est inconnu tant qu'il n'a pas reçu de valeur : le thermostat démarre en chauffage. Il n'est pas utilisé avec `changeover: "automatic"`. |
| `heatingValue` / `coolingValue` | 5.001 | Émission | Grandeur de commande continue. |
| `heatingSwitch` / `coolingSwitch` | 1.001 | Émission | Commande sur un bit ou MLI. |
| `sensorFault` | 1.005 ou 1.001 | Émission | 1 quand aucune température n'est utilisable (température externe trop ancienne, pas de sonde d'ambiance) ; la grandeur de commande vaut alors `sensorFaultValuePct` (0 % par défaut) jusqu'au retour d'une température. |

## Actionneur de chauffage et vanne

`heatingActuator/v1` commande une vanne thermoélectrique sur chaque sortie. Une commande continue `value` est convertie en MLI avec `cycleMs` ; une commande sur un bit `switch` est appliquée directement. Le `valveMode` d'une sortie en fait une vanne de chauffage (par défaut), de refroidissement ou à changement de mode : voir [chauffage et refroidissement](#heating-and-cooling). `valveType` indique à l'actionneur si sa vanne est normalement fermée ou normalement ouverte ; le paramètre `normallyOpen` du radiateur décrit la vanne réellement installée. Quand ils ne concordent pas, la vanne s'ouvre quand aucune chaleur n'est demandée, et un avertissement de configuration s'affiche au-dessus du schéma. Sans nouvelle commande pendant `monitoringMs`, l'actionneur applique `emergencyPct` et signale un défaut (`fault`). Son objet `valueStatus` renvoie la grandeur de commande appliquée. Quand la surveillance est activée, le `valueCyclicMs` du thermostat doit envoyer assez souvent pour éviter un faux défaut.

Une charge `radiator` ouvre et ferme sa vanne en `openingTimeMs`, puis chauffe la pièce affectée ; un radiateur ne fait que chauffer. Des cycles MLI courts peuvent empêcher la vanne de s'ouvrir entièrement : choisissez un cycle adapté à la durée de course modélisée. Un actionneur de commutation peut aussi commander un radiateur en régulation tout ou rien.

```json
{
  "id": "heat",
  "address": "1.1.3",
  "kind": "heatingActuator",
  "behavior": "heatingActuator/v1",
  "objects": [
    { "id": "value", "ga": "3/0/1", "dpt": "5.001", "port": "value", "channel": "h1", "flags": { "W": true, "T": false } },
    { "id": "status", "ga": "3/4/4", "dpt": "5.001", "port": "valueStatus", "channel": "h1", "flags": { "W": false, "T": true } }
  ],
  "channels": [{
    "id": "h1", "label": "H1 living room",
    "parameters": { "cycleMs": 20000 },
    "equipment": { "type": "radiator", "room": "living" }
  }]
}
```

## Chauffage et refroidissement

Le même thermostat chauffe ou refroidit. En mode confort, il a deux consignes :
- la consigne de chauffage, `comfortC` (21 °C par défaut) ;
- la consigne de refroidissement, plus haute de `deadZoneK` (24 °C par défaut).

Entre les deux se trouve la zone neutre. Les modes veille et économie élargissent l'écart : ils abaissent la consigne de chauffage et relèvent celle de refroidissement.

`changeover` choisit qui décide entre chauffage et refroidissement :

- `"object"`, par défaut : l'objet `heatCool` (DPT 1.100, 1 chauffage, 0 refroidissement). Il vient d'un basculement central, par exemple un commutateur de saison, ou de la production qui indique à un système 2 tubes si elle fournit de l'eau chaude ou froide. Un thermostat en chauffage ne fait rien en été, aussi chaude que soit la pièce.
- `"automatic"` : le thermostat bascule lui-même. Il refroidit quand la pièce dépasse la consigne de refroidissement et chauffe de nouveau quand elle passe sous la consigne de chauffage. Dans la zone neutre, il garde son mode. Dans ce modèle, la régulation PI conserve son terme intégral tant que le mode ne change pas : une demande peut persister après le franchissement de la consigne, puis diminuer jusqu'à 0, et ce 0 est envoyé pour que la vanne se ferme. La zone entre les consignes sert au basculement des modes ; elle n'impose pas immédiatement une sortie nulle, comme le font certains régulateurs d'ambiance. Les régulateurs d'ambiance KNX décrivent ce fonctionnement comme la séquence de régulation automatique (DPT 20.107).

`heatCoolStatus` envoie le mode en cours. À chaque basculement, le thermostat envoie la valeur de son nouveau mode et met l'autre à 0.

Côté actionneur, `valveMode` reprend les fonctions de vanne d'un actionneur de vanne CVC KNX :

| `valveMode` | Vanne | Grandeurs liées |
| --- | --- | --- |
| `"heating"` (par défaut) | Eau chaude : radiateur, batterie chaude. | `value` ou `switch`. |
| `"cooling"` | Eau froide : batterie froide. | `coolingValue` ou `coolingSwitch`. |
| `"changeover"` | Une seule vanne pour les deux, sur un système 2 tubes. | Les deux : la vanne suit celle qui n'est pas nulle. Ou une grandeur commune et l'objet `heatCool` de la sortie. |

Liez les grandeurs de chauffage et de refroidissement du thermostat à deux objets distincts d'une sortie à changement de mode, pas à une seule adresse de groupe : lors d'un basculement, le 0 envoyé sur l'autre grandeur fermerait sinon la vanne.

Un système 2 tubes peut aussi utiliser une seule grandeur de commande, comme le proposent de nombreux régulateurs et actionneurs. Le thermostat envoie la valeur de son mode actif sur `controlValue` (ou `controlSwitch` sur un bit), et `heatCoolStatus` indique de quel mode il s'agit. Sur la sortie à changement de mode de l'actionneur, liez cette valeur à `value` et l'information chauffage/refroidissement à `heatCool` (DPT 1.100). L'eau vient alors de cet objet, et la dernière grandeur reçue s'applique : les mêmes 60 % chauffent avec de l'eau chaude et refroidissent avec de l'eau froide. Tant que l'objet n'a pas reçu de télégramme, la sortie prend la valeur avec laquelle il démarre, ou l'eau chaude s'il n'en a pas ; lisez ou envoyez la saison au démarrage pour que la vanne reçoive la bonne eau. Dans un bâtiment, cet objet vient de la production qui fournit l'eau, ou d'un basculement central qui atteint aussi les thermostats. Un avertissement de configuration apparaît dans deux cas :
- une grandeur est liée à une sortie qui l'ignore ;
- l'émetteur ne convient pas à la vanne.

Une charge `fanCoil` est un ventilo-convecteur : une batterie à eau derrière une vanne thermoélectrique, et un ventilateur qui tourne tant que l'eau circule dans la batterie (`fanPowerW`, 40 W par défaut, vu par un actionneur avec mesure). Son paramètre `coil` prend trois valeurs :

- `"changeover"` : la batterie d'un appareil 2 tubes, qui chauffe avec de l'eau chaude et refroidit avec de l'eau froide, selon ce que donne la vanne à changement de mode ;
- `"heating"` : la batterie chaude d'un appareil 4 tubes, sur sa propre vanne ;
- `"cooling"` : la batterie froide d'un appareil 4 tubes, sur sa propre vanne.

Son `powerK` fonctionne comme celui d'un radiateur, mais dans les deux sens. La vitesse du ventilateur n'est pas modélisée.

```json
"channels": [{
  "id": "h1", "label": "H1 office fan coil",
  "parameters": { "valveMode": "changeover" },
  "equipment": { "type": "fanCoil", "room": "office", "parameters": { "coil": "changeover" } }
}]
```

L'[exemple chauffage et refroidissement](../examples/heating-cooling.html) montre les deux cas :
- dans le bureau, un basculement automatique avec un ventilo-convecteur 2 tubes ;
- dans la salle de réunion, un radiateur et une batterie froide, le choix entre chauffage et refroidissement se faisant par une touche de saison qui écrit un objet DPT 1.100.

## Capteurs

`windowContact/v1` envoie les changements sur son objet `contact`. La valeur transmise suit toujours le DPT : avec le DPT 1.019 ou 1.001, 1 signifie ouverte ; avec le DPT 1.009, 1 signifie fermée. `contactType` décrit le contact physique (normalement ouvert par défaut) et `invert` indique à l'entrée d'interpréter un contact normalement fermé ; quand ils ne concordent pas, ouvert et fermé sont signalés à l'envers et un avertissement de configuration s'affiche. Par défaut, il envoie aussi son état initial après `startDelayMs`, pour qu'un thermostat apprenne qu'une fenêtre est ouverte dès le départ. Mettez `sendOnStart: false` pour supprimer ce télégramme. `temperatureSensor/v1` transmet la température de la pièce quand elle change et, en option, à intervalle fixe.

## Exemple

L'[exemple de chauffage pièce par pièce](../examples/hvac.html) associe une régulation PI dans le séjour, une régulation tout ou rien dans la chambre, un contact de fenêtre et un mode central réglé depuis le panneau de l'interface USB.

```knx
scenario: room-heating
```

## Limites du modèle

Le modèle thermique utilise une constante de temps par pièce. Il ne simule pas les échanges de chaleur entre pièces, les apports solaires, l'inertie des équipements, un circuit d'eau ou une chaudière, les températures d'eau, l'humidité, la condensation ou la protection au point de rosée, ni BACnet. Une charge `heatPump` chauffe ou refroidit sa pièce tant que sa sortie la valide, après la durée minimale d'arrêt de son compresseur (`minOffMs`) ; son coefficient de performance (`cop`) donne la chaleur affichée, et le modèle de la pièce utilise `powerK`. Voir l'[exemple de pompe à chaleur](../examples/heat-pump.html). Le thermostat n'a pas de programme horaire interne : les horaires viennent du bus, par exemple d'un [programmateur hebdomadaire](devices.html#weekly-time-switch-timeswitch-v1) qui envoie des modes CVC. L'humidité et le CO₂ sont des valeurs saisies sur un [capteur de qualité de l'air](devices.html#air-quality-sensor-airqualitysensor-v1) ; la ventilation commande une charge `fan` mais ne change ni la température de la pièce ni la qualité de l'air. Dans un système 2 tubes, l'eau d'un ventilo-convecteur à changement de mode suit la grandeur que sa vanne applique, comme si la production fournissait toujours l'eau que la pièce demande. Un ventilo-convecteur fait tourner son ventilateur à une seule vitesse, sans les objets de vitesse d'un régulateur de ventilo-convecteur. Le mode de fonctionnement d'une pompe à chaleur est un paramètre : le bus la met en marche et l'arrête, mais ne la fait pas basculer. Le mode auto choisit le confort ; un télégramme du bus peut changer la présélection de mode. Le mode de fonctionnement se choisit avec la présélection DPT 20.102, les objets de mode sur un bit ou le mode forcé ; la priorité entre eux est fixe (pas de paramètre pour choisir un autre ordre).
