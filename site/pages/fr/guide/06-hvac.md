---
title: Chauffage
translationOf: guide/06-hvac.md
sourceHash: 2e9c8554468d
order: 6.3
---
# Chauffage et climatisation (CVC)

Ce chapitre modélise la régulation de la température des pièces avec un thermostat, un actionneur de chauffage, une vanne thermoélectrique et un contact de fenêtre. La puissance de chauffage ou de refroidissement est supposée disponible : il n'y a ni chaudière ni circuit d'eau ; une pompe à chaleur est une charge qui chauffe ou refroidit sa pièce (voir [limites du modèle](#model-limits)). Le temps de simulation est compressé : un changement qui prendrait des heures dans un bâtiment devient visible en quelques minutes.

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

Le thermostat comprend un gestionnaire de consignes avec une politique fixe. Cette politique est un choix du modèle, pas une règle du DPT 20.102. Le mode est choisi par priorité : une fenêtre ouverte demande la protection du bâtiment ; une protection du bâtiment présélectionnée par `hvacMode` (absence, vacances) reste en vigueur ; sinon la présence demande le confort ; sinon la présélection `hvacMode` s'applique. Le mode auto utilise le confort dans ce modèle. La consigne de confort en chauffage vaut par défaut `comfortC: 21`. Les modes veille et économie l'abaissent de `standbyShiftK` et `economyShiftK` ; la protection hors gel vaut par défaut `frostProtectionC: 7`. Le refroidissement utilise `deadZoneK` entre les consignes de chauffage et de refroidissement, et une consigne de protection contre les fortes chaleurs.

Pour la **régulation PI**, `controlType: "pi"` utilise `proportionalBandK` et `integralTimeMs`. Il envoie une valeur DPT 5.001 sur `heatingValue` ou `coolingValue` quand la variation atteint `valueSendDeltaPct` ; une sortie sur un bit `heatingSwitch` ou `coolingSwitch` utilise la MLI sur `pwmCycleMs`. Pour la **régulation tout ou rien**, `controlType: "twoPoint"` commute une sortie sur un bit à la consigne et se réenclenche sous le seuil `hysteresisK`.

| Port | DPT | Sens | Rôle |
| --- | --- | --- | --- |
| `actualTemp` | 9.001 | Émission | Température mesurée. |
| `externalTemp` | 9.001 | Réception | Remplace la sonde interne. Avec `externalTempTimeoutMs`, la sonde interne est de nouveau utilisée quand aucune valeur n'arrive dans ce délai. |
| `baseSetpoint` | 9.001 | Réception | Consigne de base de confort. |
| `setpointShift` | 9.002 | Réception | Décalage de consigne. |
| `setpointStatus` | 9.001 | Émission | Consigne actuelle. |
| `hvacMode` / `hvacModeStatus` | 20.102 | Réception / émission | Mode demandé et mode actuel. |
| `presence` | 1.018 ou 1.001 | Réception | La présence demande le confort, sauf pendant la protection du bâtiment. Avec `presenceType: "button"`, chaque 1 prolonge le mode confort de `comfortExtensionMs` (2 h par défaut), comme un poussoir de présence. |
| `window` | 1.019, 1.001 ou 1.009 | Réception | Une fenêtre ouverte demande la protection ; avec 1.009, 0 signifie ouverte. |
| `heatCool` / `heatCoolStatus` | 1.100 | Réception / émission | Choix chauffage ou refroidissement. |
| `heatingValue` / `coolingValue` | 5.001 | Émission | Grandeur de commande continue. |
| `heatingSwitch` / `coolingSwitch` | 1.001 | Émission | Commande sur un bit ou MLI. |
| `sensorFault` | 1.005 ou 1.001 | Émission | 1 quand aucune température n'est utilisable (température externe trop ancienne, pas de sonde d'ambiance) ; la grandeur de commande vaut alors `sensorFaultValuePct` (0 % par défaut) jusqu'au retour d'une température. |

## Actionneur de chauffage et vanne

`heatingActuator/v1` commande une vanne thermoélectrique. Une commande continue `value` est convertie en MLI avec `cycleMs` ; une commande sur un bit `switch` est appliquée directement. `valveType` indique à l'actionneur si sa vanne est normalement fermée ou normalement ouverte ; le paramètre `normallyOpen` du radiateur décrit la vanne réellement installée. Quand ils ne concordent pas, la vanne s'ouvre quand aucune chaleur n'est demandée, et un avertissement de configuration s'affiche au-dessus du schéma. Sans nouvelle commande pendant `monitoringMs`, l'actionneur applique `emergencyPct` et signale un défaut (`fault`). Son objet `valueStatus` renvoie la grandeur de commande appliquée. Quand la surveillance est activée, le `valueCyclicMs` du thermostat doit envoyer assez souvent pour éviter un faux défaut.

Une charge `radiator` ouvre et ferme sa vanne en `openingTimeMs`, puis chauffe ou refroidit la pièce affectée. Des cycles MLI courts peuvent empêcher la vanne de s'ouvrir entièrement : choisissez un cycle adapté à la durée de course modélisée. Un actionneur de commutation peut aussi commander un radiateur en régulation tout ou rien.

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

## Capteurs

`windowContact/v1` envoie les changements sur son objet `contact`. La valeur transmise suit toujours le DPT : avec le DPT 1.019 ou 1.001, 1 signifie ouverte ; avec le DPT 1.009, 1 signifie fermée. `contactType` décrit le contact physique (normalement ouvert par défaut) et `invert` indique à l'entrée d'interpréter un contact normalement fermé ; quand ils ne concordent pas, ouvert et fermé sont signalés à l'envers et un avertissement de configuration s'affiche. Par défaut, il envoie aussi son état initial après `startDelayMs`, pour qu'un thermostat apprenne qu'une fenêtre est ouverte dès le départ. Mettez `sendOnStart: false` pour supprimer ce télégramme. `temperatureSensor/v1` transmet la température de la pièce quand elle change et, en option, à intervalle fixe.

## Exemple

L'[exemple de chauffage pièce par pièce](../examples/hvac.html) associe une régulation PI dans le séjour, une régulation tout ou rien dans la chambre, un contact de fenêtre et un mode central réglé depuis le panneau de l'interface USB.

```knx
scenario: room-heating
```

## Limites du modèle

Le modèle thermique utilise une constante de temps par pièce. Il ne simule pas les échanges de chaleur entre pièces, les apports solaires, l'inertie des équipements, un circuit d'eau ou une chaudière, le basculement été/hiver, les ventilo-convecteurs ni BACnet. Une charge `heatPump` chauffe ou refroidit sa pièce tant que sa sortie la valide, après la durée minimale d'arrêt de son compresseur (`minOffMs`) ; son coefficient de performance (`cop`) donne la chaleur affichée, et le modèle de la pièce utilise `powerK`. Voir l'[exemple de pompe à chaleur](../examples/heat-pump.html). Le thermostat n'a pas de programme horaire interne : les horaires viennent du bus, par exemple d'un [programmateur hebdomadaire](devices.html#weekly-time-switch-timeswitch-v1) qui envoie des modes CVC. L'humidité et le CO₂ sont des valeurs saisies sur un [capteur de qualité de l'air](devices.html#air-quality-sensor-airqualitysensor-v1) ; la ventilation commande une charge `fan` mais ne change ni la température de la pièce ni la qualité de l'air. Un radiateur avec `emitter: "cooling"` retire de la chaleur sans aucun modèle de condensation ni protection au point de rosée ; ne l'utilisez que comme émetteur de froid simplifié. Le mode auto choisit le confort ; un télégramme du bus peut changer la présélection de mode. Le mode de fonctionnement se choisit seulement avec un objet DPT 20.102 : l'objet de mode forcé séparé et les objets de mode sur un bit (confort, nuit, hors gel) proposés par de nombreux régulateurs d'ambiance ne sont pas modélisés.
