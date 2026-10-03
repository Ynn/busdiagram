---
title: Boutons-poussoirs et actionneurs
translationOf: guide/05-devices.md
sourceHash: b741c4d7cd9b
order: 5
---
# Boutons-poussoirs et actionneurs

Les comportements intégrés couvrent les exemples de ce site. Voir la [référence des comportements](../reference/behaviors.html) pour leurs paramètres. Les réglages modélisés suivent les manuels de produits KNX courants d'ABB, Hager, Schneider Electric et Theben.

## Interface de boutons-poussoirs : `buttonInterface/v1`

Les boutons-poussoirs sont modélisés comme une interface de boutons-poussoirs (entrée binaire), placée derrière des boutons-poussoirs conventionnels comme les interfaces des valises de formation. Chaque **canal est une entrée de contact**, dessinée comme une touche sur le schéma ; la touche affiche `keyLabel`, le texte écrit sur le bouton-poussoir, ou à défaut le libellé de l'entrée. La touche signale quand elle est enfoncée et relâchée, comme un contact ; quand elle est maintenue au-delà de la durée d'appui long de son entrée (`longPressMs`, 0,5 s par défaut), une barre se remplit sous les touches et l'entrée reçoit l'appui long. Cliquez pour un appui court, maintenez pour un appui long ; au clavier, Tab donne le focus à une touche, qui reste enfoncée tant qu'Entrée ou Espace est maintenu.

Le paramètre `function` de chaque entrée décide de son comportement et de ses objets de groupe ; dans le designer, choisir une fonction crée ses objets :

| Fonction | Comportement | Ports |
| --- | --- | --- |
| `switch` | Une action à la fermeture du contact (`onPress`) et une à son ouverture (`onRelease`) : `on`, `off`, `toggle` ou `none`. Avec `switchLongPress`, une action pour un appui court (`onShort`) et une pour un appui long (`onLong`). | `switch` (1.001) |
| `dim` | `dimMode: "single"` : un appui court inverse, un appui long fait varier plus clair quand l'éclairage est éteint et sinon dans le sens inverse de la fois précédente, le relâchement arrête. `"brighter"` et `"darker"` répartissent le travail entre deux touches. `dimStep` fixe le code de pas (100 % fait varier jusqu'au relâchement). | `switch` (1.001), `dim` (3.007) |
| `blind` | Un appui long déplace, un appui court arrête ou fait un pas. `blindMode: "single"` alterne le sens à chaque mouvement ; `"up"` et `"down"` sont les touches d'une paire. Avec `stopOnRelease`, relâcher la touche arrête le store (maintenir pour déplacer). | `move` (1.008), `stopStep` (1.007) |
| `value` | Envoie `shortValue`, ou `longValue` après un appui long ; sans `longValue`, la valeur est envoyée immédiatement. | `value` (5.001, 5.004, 5.010, 7.600, 9.001, 20.102) |
| `scene` | Un appui court rappelle `sceneNumber` ; avec `sceneStore`, un appui long la mémorise (DPT 18.001 avec le bit d'apprentissage). | `value` (17.001 ou 18.001) |

Le bouton-poussoir câblé à une entrée est normalement ouvert (il se ferme à l'appui) ; un bouton normalement fermé se déclare sur le canal avec `"keyContact": "normallyClosed"`, comme élément de l'installation. L'entrée attend un contact fermé quand il est actionné (`actuatedContact: "closed"`), ou ouvert (`"open"`) pour un bouton-poussoir normalement fermé. Quand les deux ne concordent pas, appuis et relâchements sont vus à l'envers (au repos, l'entrée voit la touche maintenue, puis un appui long après son seuil), et un avertissement de configuration s'affiche.

`toggle` inverse la **valeur de l'objet de commutation**, qui peut différer de l'état réel de la lampe. Les objets `switch` et `move` ont l'indicateur W par défaut : quand ils écoutent aussi l'état de la charge, comme adresse supplémentaire en réception seule (`"ga": ["1/1/1", "1/4/1"]`), la bascule, la variation et le store sur une touche partent de l'état réel, et la LED de la touche le montre. L'[exemple des retours d'état](../examples/status-feedback.html) montre pourquoi c'est important.

```knx
scenario: status-feedback
```

Chaque entrée a aussi :

- **Verrouillage :** un objet `lock` (1 = verrouillé). Pendant le verrouillage, les appuis sont ignorés ; `lockStart` et `lockEnd` (ou `blindLockStart` et `blindLockEnd`) envoient une réaction au début et à la fin du verrouillage, `lockEnd: "update"` renvoie la valeur actuelle.
- **Retour de la tension bus :** `busRecovery` (ou `blindBusRecovery`) envoie une réaction au retour de la tension bus, après `busRecoveryDelayMs`. Voir [tension bus](#bus-voltage-failure-and-recovery).
- **Envoi cyclique :** `cyclicMs` renvoie l'objet de commutation à intervalle régulier ; `cyclicWhen` le limite à 1 ou à 0.
- **LED :** une touche n'a de LED qu'avec `ledShown: true`. La LED affiche l'objet `led` quand il est activé, sinon l'objet de commutation d'une entrée de commutation ou de variation ; `ledInverted` l'allume pour 0.

Les objets de chaque entrée forment un bloc fixe de sept numéros (commutation, variation, montée/descente, arrêt/pas, valeur, verrouillage, LED), quelle que soit sa fonction, comme dans les dialogues des produits. Le nombre d'entrées se règle dans la page Configuration du designer.

```knx
scenario: push-button-interface
```

## Actionneur de commutation : `switchActuator/v1`

Un actionneur a un canal par sortie. Les ports de ses objets comprennent `switch` (commande), `status` (retour d'état), `scene` et `forced`.

- **Alarmes :** un objet `intrusionAlarm` fait clignoter la sortie (`blinkMs`, 1 s par défaut), un objet `fireAlarm` la force en marche, sans clignotement ; l'incendie est prioritaire sur l'intrusion, et les deux sur le forçage et le verrouillage. Les commandes reçues entre-temps sont mémorisées sans effet ; à la fin de la dernière alarme, `afterAlarm` fixe l'état (la dernière commande par défaut). Reliez ces objets aux alarmes mémorisées d'un [module d'alarme](#alarm-module-alarmmodule-v1).

- **Retour d'état :** quand l'état de commutation change, l'objet `status` prend sa valeur et la transmet après `statusDelayMs` (300 ms par défaut).
- **Mesure et délestage :** des objets `power` (DPT 14.056 en W, ou 9.024 en kW) et `energy` (DPT 13.010 en Wh, ou 13.013 en kWh) sur un canal renvoient la puissance consommée par sa charge et l'énergie comptée ; des objets `totalPower` et `powerLimit` sans canal renvoient le total et une alarme de limite de puissance (`powerLimitW`). Les charges déclarent leur puissance nominale avec `powerW` (lampes, lampes à variation, ventilateurs, charges `appliance` et `siren`, la résistance d'un `waterHeater`, qui ne la consomme que pendant que son propre thermostat chauffe, et `electricPowerW` pour une `heatPump` pendant que son compresseur tourne). Un canal avec `"loadShedding": true` est coupé tant que la limite est dépassée, puis réenclenché après `sheddingTimeMs` si sa commande le demande toujours. L'énergie est comptée `energyTimeScale` fois plus vite que le temps réel (60 par défaut). Voir l'[exemple de mesure d'énergie](../examples/energy-metering.html).
- **Mode de fonctionnement du relais :** `"parameters": { "relayMode": "normallyClosed" }` sur un canal inverse le contact : la charge est alimentée quand l'état de commutation vaut 0, par exemple pour un éclairage qui doit rester allumé sauf si une commande l'éteint. L'état de commutation, le retour d'état, la minuterie, les scènes et le forçage gardent leur sens habituel ; seul le contact est inversé. Le schéma marque une telle sortie par un cercle d'inversion et le libellé **NC** sur le fil de la charge.
- **Minuterie d'escalier :** `"parameters": { "timerMs": 10000 }` sur un canal. Une écriture de 1 ferme le relais et lance une temporisation. `timerRetrigger` choisit `"restart"` (par défaut), `"none"` ou `"add"` (chaque nouveau 1 ajoute une période, jusqu'à cinq). Avec `timerOffAllowed: false`, une écriture de 0 ne peut pas annuler la minuterie. `timerWarningMs` ouvre brièvement la sortie avant l'expiration, en guise d'avertissement.
- **Scènes :** `"scenes": { "1": 1, "2": 0 }` sur un canal définit ses états. Un objet `scene` sans canal s'applique à tous les canaux. Un objet de commande de scène (DPT 18.001) accepte aussi la mémorisation : un télégramme avec le bit d'apprentissage (valeur + 128) mémorise l'état actuel de chaque canal comme scène, jusqu'au redémarrage de la simulation ; `sceneLearning: false` la refuse.
- **Forçage prioritaire :** les valeurs 2 et 3 du DPT 2.001 forcent l'arrêt et la marche ; 0 ou 1 termine le forçage. Les commandes normales sont mémorisées pendant le forçage. `afterForcing` règle ce qui se passe ensuite : `"lastCommand"` (par défaut), `"on"`, `"off"`, `"unchanged"`, `"previous"` ou `"toggle"`.
- **Verrouillage :** un objet `lock` (1 = verrouillé) maintient la sortie dans l'état défini par `lockStart` (`"unchanged"`, `"on"` ou `"off"`) ; les commandes sont mémorisées entre-temps, et `afterLock` prend les mêmes valeurs que `afterForcing`. Le forçage est prioritaire sur le verrouillage.
- **Temporisations :** `onDelayMs` et `offDelayMs` retardent les commandes de l'objet `switch` ; la commande inverse reçue pendant une temporisation l'annule. Les scènes, le forçage et le verrouillage agissent immédiatement.
- **Liaison logique :** un objet `logic` est combiné avec la commande de commutation par `logicOperation` : `"and"` n'enclenche que tant qu'il vaut 1 (une validation), `"or"` enclenche tant que l'un des deux vaut 1. Tant qu'il n'a reçu aucune valeur, la commande agit seule.
- **Tension bus :** `busFailure` fixe la sortie à la coupure de la tension bus (`"unchanged"`, `"off"`, `"on"`) ; `busRecovery` la fixe au retour de la tension (`"previous"` : l'état d'avant la coupure, `"off"`, `"on"`), puis l'état est envoyé.

```knx
scenario: timers
attrs: monitor="false"
```

## Coupure et retour de la tension bus

Cliquez sur l'étiquette **Alim.** d'une ligne ou d'un segment sur le schéma pour couper sa tension bus, et à nouveau pour la rétablir ; par programme, `sim.setBusVoltage("L1.2", false)` (`L1.2b` pour le segment derrière une extension). La ligne est dessinée en gris et en pointillés, et ses appareils sont grisés :

- chaque appareil applique d'abord son comportement à la coupure du bus (`busFailure` d'un actionneur de commutation, d'un canal de variateur ou DALI, ou d'un actionneur de volets, qui arrête ses moteurs par défaut), puis s'arrête : ses temporisations sont annulées, il ne reçoit ni n'envoie plus rien, et ses touches sont sans effet ;
- les coupleurs ne transmettent plus de télégrammes vers le segment ; le journal indique pourquoi ;
- les coupleurs vérifient la tension quand un télégramme les atteint : un télégramme déjà en route ne traverse pas un segment coupé avant son passage, et n'atteint pas ce qui se trouve derrière ;
- au retour de la tension, chaque appareil applique son comportement au retour (`busRecovery` d'un actionneur de commutation, d'un canal de variateur ou DALI, d'un actionneur de volets ou d'une interface de boutons-poussoirs) et redémarre ; les actionneurs renvoient leur état. Un appareil garde ce qu'il mémorise (alarmes mémorisées, commandes reçues, index du compteur, scènes apprises) : ses tâches périodiques reprennent (envoi cyclique, diffusion de l'heure, MLI, comptage), une échéance en attente repart pour une période entière (temporisation de présence, prolongation de confort, délai de pluie), un programmateur applique un point de commutation passé pendant la coupure, et un forçage, un verrouillage ou une alarme toujours actifs agissent à nouveau sur leur sortie. Ces réactions sont des choix du modèle : la description d'application KNX des actionneurs de volets, par exemple, laisse au fabricant le comportement à la coupure et au retour de la tension bus.

La simulation démarre avec l'installation déjà en service : les réactions au retour ne s'exécutent qu'après une coupure faite sur le schéma, pas au démarrage. Voir l'[exemple de la tension bus](../examples/bus-voltage.html).

```knx
scenario: bus-voltage
```

Un actionneur à six sorties reste un seul appareil KNX. Déclarez six canaux, avec `"equipment": null` pour les sorties inutilisées. Une sortie qui alimente plusieurs charges les liste : `"equipment": [{ "type": "lamp" }, { "type": "lamp" }]` ; voir [notions](concepts.html#channel-and-connected-equipment).

## Compteur d'énergie : `energyMeter/v1`

Un compteur d'énergie indépendant mesure des circuits qu'il ne commute pas : l'alimentation d'une pompe à chaleur ou d'un chauffe-eau, un groupe de prises, ou un circuit commuté par un autre actionneur. Chaque canal est un circuit mesuré, avec un objet `power` (DPT 14.056 en W, ou 9.024 en kW) et un objet `energy` (DPT 13.010 en Wh, ou 13.013 en kWh) ; un objet `totalPower` sans canal envoie la somme.

La puissance mesurée d'un circuit est donnée au démarrage par `initialState.powerW` et modifiée par une entrée numérique sur son objet `power`, saisie dans l'unité de cet objet. `initialState.energyWh` fixe l'index du compteur. L'énergie est intégrée avec la même échelle de temps que la mesure des actionneurs (`energyTimeScale`, 60 par défaut) ; la puissance est envoyée quand elle change de `powerSendDeltaW`, et l'énergie toutes les `meterIntervalMs`. Le compteur n'ajoute pas la puissance des circuits qu'il mesure à celle des actionneurs : un sous-compteur et l'actionneur qui commute la même charge renvoient la même puissance. Voir l'[exemple de la pompe à chaleur](../examples/boiler-room.html).

## Détecteur de présence : `presenceDetector/v1`

Une détection envoie 1 par l'objet `input`. Chaque nouvelle détection relance la temporisation (`"parameters": { "holdMs": 10000 }`) ; à son expiration, l'objet envoie 0. Mettez `retrigger: false` pour ne pas la relancer ou `sendOnEnd: false` pour supprimer le 0 final. Pour modéliser un détecteur qui n'envoie que 1 et compte sur la minuterie de l'actionneur, mettez `sendOnEnd: false` avec une temporisation courte, comme dans l'[exemple des minuteries](../examples/timers.html). L'objet de présence peut utiliser le DPT 1.001 ou 1.018 (occupation).

Un objet `lock` à 1 fait ignorer au détecteur ses détections. `lockStart` et `lockEnd` fixent le télégramme envoyé au début et à la fin du verrouillage : aucun (par défaut), 0 ou 1 (maintenu pendant le verrouillage ; à la fin, suivi de la temporisation).

Plusieurs détecteurs peuvent surveiller une pièce en maître et esclaves. Un esclave (`"slave": true`) envoie 1 à chacune de ses détections ; relié à l'objet `slaveTrigger` du maître, il compte comme une détection du maître (enclenchement, ou relance de la temporisation), dont le seuil de luminosité et le 0 final s'appliquent.

Un objet `brightness` (DPT 9.004) envoie la luminosité mesurée par le détecteur, saisie par le lecteur sur une entrée numérique. Avec `brightnessThresholdLux`, une détection n'enclenche que tant que cette luminosité est sous le seuil ; une présence déjà active est quand même prolongée. Il n'y a pas de modèle d'éclairement : la luminosité ne dépend ni des lampes ni de la lumière du jour, et la régulation à luminosité constante n'est pas modélisée.

## Station météo : `weatherStation/v1`

Une station météo envoie les mesures extérieures saisies dans ses `inputs` numériques : la vitesse du vent sur un objet `wind` (DPT 9.005 en m/s, ou 9.028 en km/h ; les seuils restent en m/s ; la description KNX des données météo code la vitesse du vent en 9.005 et n'admet 9.028 qu'en datapoint supplémentaire à côté), la luminosité sur `brightness` (DPT 9.004, lux) et la température sur `outdoorTemp` (DPT 9.001). Deux sorties sur un bit suivent des seuils avec hystérésis ; une sortie n'est désactivée que strictement au-delà du seuil et de l'hystérésis, pour qu'une valeur au seuil la garde activée même sans hystérésis :

| Port de sortie | Activé quand | Désactivé quand | Paramètres |
| --- | --- | --- | --- |
| `windAlarm` | vent ≥ `windThreshold` (10 m/s) | vent < seuil − `windHysteresis` (2 m/s) | `windThreshold`, `windHysteresis` |
| `sunProtection` | luminosité ≥ `brightnessThreshold` (40 000 lx) | luminosité < seuil − `brightnessHysteresis` (5 000 lx) | `brightnessThreshold`, `brightnessHysteresis` |
| `frostAlarm` | température extérieure ≤ `frostThresholdC` (3 °C) | température > seuil + `frostHysteresisK` (2 K) | `frostThresholdC`, `frostHysteresisK` |
| `rainAlarm` | pluie saisie pendant `rainOnDelayMs` (20 s) | `rainOffDelayMs` (5 min) après l'arrêt de la pluie | `rainOnDelayMs`, `rainOffDelayMs` |

La pluie se saisit sur l'entrée numérique de l'objet `rainAlarm` (0 ou 1) : les délais évitent de signaler une courte averse ou une courte interruption, comme sur les détecteurs de pluie courants. Une sortie est transmise quand son état change ; avec `alarmCyclicMs`, les alarmes vent, pluie et gel sont aussi renvoyées à cette période, pour les actionneurs qui les surveillent (`alarmMonitoringMs` d'un actionneur de volets). Reliez les alarmes aux ports `windAlarm`, `rainAlarm` et `frostAlarm` d'un [actionneur de volets](shutters.html).

## Capteur de qualité de l'air : `airQualitySensor/v1`

Un capteur de qualité de l'air envoie la température (`temperature`, DPT 9.001), l'humidité relative (`humidity`, DPT 9.007, ou 5.001 sur un octet comme beaucoup de capteurs) et la concentration de CO₂ (`co2`, DPT 9.008) saisies dans ses `inputs` numériques. Il active `co2Alarm` et `humidityAlarm` à leurs seuils, avec hystérésis, et son régulateur à paliers envoie une grandeur de commande `ventilation` (DPT 5.001) :

| Paramètre | Défaut | Signification |
| --- | --- | --- |
| `step1Ppm`, `step2Ppm`, `step3Ppm` | 800, 1000, 1200 | Seuils entre les paliers 0–1, 1–2 et 2–3. |
| `stepHysteresisPpm` | 50 | Un palier change au-dessus de seuil + hystérésis ou en dessous de seuil − hystérésis. |
| `step0Pct` … `step3Pct` | 0, 33, 66, 100 | Grandeur de commande envoyée à chaque palier. |
| `minStepTimeMs` | 0 | Durée minimale avant le changement de palier suivant. |
| `co2AlarmPpm`, `humidityAlarmPct` | 1500, 70 | Seuils d'alarme. |

Reliez la grandeur de ventilation à un canal d'actionneur de variation qui commande une charge `fan`. Voir l'[exemple de qualité de l'air](../examples/air-quality.html).

## Module logique : `logicGate/v1`

Un module logique combine les objets sur un bit de son port `logicIn` et envoie le résultat sur son objet `logicOut`. Le paramètre `operation` choisit `and`, `or`, `xor` ou `not` (qui utilise la première entrée). Une entrée qui n'a reçu aucune valeur compte pour 0. Par défaut, le résultat n'est envoyé que lorsqu'il change (`sendOnChangeOnly`).

Une plage horaire quotidienne restreint la sortie : avec `activeFrom` et `activeTo` (HH:MM, la plage peut passer minuit) et un objet `time` (DPT 10.001) qui reçoit l'heure d'une horloge maître, la sortie ne vaut 1 qu'à l'intérieur de la plage. Le module logique dépend de l'heure reçue sur le bus : sans horloge maître, la plage reste fermée. Un module logique sans entrées suit simplement la plage.

`invertInput1` … `invertInput8` inversent les entrées logiques, dans l'ordre de leurs objets, et `invertOutput` inverse le résultat (NON-ET, NON-OU, NON-OU exclusif).

Un objet `enable` facultatif (DPT 1.003) bloque la sortie tant qu'il vaut 0 (`enablePolarity: "inverted"` : tant qu'il vaut 1) ; le valider à nouveau envoie le résultat actuel. Avant son premier télégramme, la sortie est validée (`enableAtStart`). L'[exemple de protection météo](../examples/weather-protection.html) utilise un ET pour n'appliquer la protection solaire qu'en mode automatique.

## Horloge maître : `clockMaster/v1`

Une horloge maître envoie l'heure sur un objet `time` (DPT 10.001 : jour de la semaine et heure) et la date sur un objet `date` (DPT 11.001), d'après l'[horloge simulée](time.html#simulated-clock) du scénario. Elle envoie peu après le démarrage (`sendOnStart`, `startDelayMs`), toutes les `sendPeriodMin` minutes d'horloge (10 par défaut, la période standard d'une horloge système KNX ; 0 désactive l'envoi périodique), à la seconde 30 de la minute, comme l'exige l'horloge système KNX pour que l'heure reçue ne saute pas au passage d'une minute, et après le réglage de l'horloge. Ses objets ont l'indicateur R par défaut, pour que d'autres appareils puissent lire l'heure actuelle, comme sur les horloges des valises de formation.

## Module d'alarme : `alarmModule/v1`

Un module d'alarme a un canal par zone. Pour l'intrusion et pour l'incendie, un objet déclencheur (`intrusionTrigger`, `fireTrigger`) active une alarme mémorisée (`intrusionState`, `fireState`), envoyée à chaque changement. L'alarme reste mémorisée quand le déclencheur revient à 0, jusqu'à ce qu'une réinitialisation (`intrusionReset`, `fireReset`, DPT 1.015) reçoive 1 ; la réinitialisation est refusée, et le journal dit pourquoi, tant que le déclencheur vaut encore 1. Les alarmes sont conservées pendant une coupure de la tension bus et renvoyées au retour de la tension. Voir l'[exemple des alarmes](../examples/alarms.html).

## Programmateur hebdomadaire : `timeSwitch/v1`

Un programmateur envoie des valeurs programmées sur ses objets `output` (DPT 1.001, 1.002, 1.003, 1.008, 5.001, 5.010, 17.001 ou 20.102) aux heures programmées de l'horloge simulée. Le paramètre `program` liste des points de commutation séparés par des points-virgules :

```json
"parameters": { "program": "Mon-Fri 07:00 = 1; Mon-Fri 22:00 = 0; Sat,Sun 08:30 = 1; Sat,Sun 23:00 = 0" }
```

Les jours sont `Mon` … `Sun`, des intervalles comme `Mon-Fri`, des listes comme `Sat,Sun`, ou `Daily`. Les entrées illisibles sont ignorées et listées dans le journal des événements.

Trois dérogations, comme sur les programmateurs courants : un objet `override` envoie une valeur immédiatement et la maintient jusqu'au prochain point de commutation ; un objet `overrideTimed` la maintient pendant `overrideDurationMin` minutes d'horloge (60 par défaut), les points de commutation étant suspendus entre-temps ; un objet `overridePermanent` à 1 suspend le programme, et à 0 le reprend avec sa valeur actuelle. Au démarrage et après le réglage de l'horloge, le programmateur envoie la valeur du point de commutation le plus récent (`sendOnStart`). Il utilise directement l'horloge simulée ; il ne se synchronise pas sur une horloge maître.

## Afficheur et superviseur : `display/v1`

Un afficheur reçoit et affiche des valeurs par son port `display` sans émettre de commandes. Avec `"kind": "supervisor"`, il est dessiné comme un logiciel de supervision, ses valeurs écrites sous les noms des objets ; sur le réseau IP, il déclare `"medium": "IP"`. Son accès et son filtrage sont expliqués dans le [guide de la topologie](topology.html).

## Interface USB : `usbInterface/v1`

Cet appareil virtuel relie le [panneau de l'interface USB](usb-interface.html) à une ligne pour lire et écrire des adresses de groupe.

## Appareil passif et panneau de visualisation : `passive/v1`

Un appareil passif mémorise les valeurs de ses objets de communication sans autre comportement. Utilisez-le pour représenter un appareil KNX dont la logique interne est hors de la simulation.

Des valeurs saisies sur le schéma en font un panneau de visualisation : chaque entrée numérique écrit son objet `input` et l'envoie, par exemple un niveau de variation ou une position de volet, et les objets `display` affichent les valeurs reçues.

```json
"inputs": [{ "id": "position", "type": "number", "label": "Setpoint (%)", "object": "target", "min": 0, "max": 100, "step": 1 }]
```

Un appareil passif ou un afficheur peut aussi utiliser un DPT standard que BusDiagram ne simule pas, comme 12.001 (compteur), 229.001 (valeur de comptage) ou 235.001 (tarif), pour dessiner fidèlement une installation réelle. Sa taille vient du format KNX du numéro principal : la cohérence des adresses de groupe est donc toujours vérifiée. Sa valeur reste inconnue jusqu'à la réception d'un télégramme, puis s'affiche en octets bruts. De tels objets ne peuvent pas être écrits depuis le panneau de l'interface USB.

## Passerelle vers un autre système : `systemGateway/v1`

Les pompes à chaleur, ballons d'eau chaude, chaudières et planchers chauffants sont souvent commandés par leur propre système (Modbus, BACnet, M-Bus) et reliés à KNX par une passerelle. Un appareil `systemGateway/v1` représente cette frontière ; seul son côté KNX est modélisé.

- Les objets `value` portent les valeurs lues dans l'autre système, comme une température de ballon. Saisissez-les avec des `inputs` numériques, comme sur un panneau de visualisation ; elles sont envoyées sur KNX.
- Les objets `command` reçoivent les commandes KNX destinées à l'autre système, comme un mode de fonctionnement ou une relance de l'eau chaude. Le journal des événements montre qu'elles sont transmises ; la réaction de l'autre système n'est pas simulée.
- Le paramètre `system` nomme l'autre système (`"Modbus"` par défaut) ; la carte de l'appareil l'affiche à côté de l'adresse.

Voir l'[exemple de la chaufferie](../examples/boiler-room.html).
