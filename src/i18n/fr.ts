// French locale catalog for English source messages.
export const frMessages: Record<string, string> = {
  "Clock master: the scenario declares no clock":
    "Horloge maîtresse : le scénario ne déclare pas d'horloge",
  "Time switch: program of {0} applies ({1})":
    "Programmateur : le programme de {0} s'applique ({1})",
  "Time switch: the scenario declares no clock":
    "Programmateur : le scénario ne déclare pas d'horloge",
  "Time switch: entries ignored: {0}": "Programmateur : entrées ignorées : {0}",
  "Time switch: {0} → {1}": "Programmateur : {0} → {1}",
  "Time of day": "Heure",
  Date: "Date",
  "{0} is not a valid date (YYYYMMDD)":
    "{0} n'est pas une date valide (AAAAMMJJ)",
  Mon: "lun.",
  Tue: "mar.",
  Wed: "mer.",
  Thu: "jeu.",
  Fri: "ven.",
  Sat: "sam.",
  Sun: "dim.",
  "“{0}” is not a local date and time (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)":
    "« {0} » n'est pas une date et heure locale (AAAA-MM-JJTHH:MM ou AAAA-MM-JJTHH:MM:SS)",
  "number > 0 and ≤ 3600 expected": "nombre > 0 et ≤ 3600 attendu",
  "Clock set to {0}": "Horloge réglée à {0}",
  "Simulated clock (×{0})": "Horloge simulée (×{0})",
  "Clock time": "Heure de l'horloge",
  Set: "Régler",
  "Set the simulated clock": "Régler l'horloge simulée",
  "Set time": "Régler l'heure",
  "Time window from": "Plage horaire à partir de",
  "Time window to": "Plage horaire jusqu'à",
  "Clock master: sends the time of day (10.001) and the date (11.001) of the simulated clock at a fixed period and after the clock is set.":
    "Horloge maîtresse : émet l'heure (10.001) et la date (11.001) de l'horloge simulée à période fixe et après un réglage de l'horloge.",
  "Send period": "Période d'envoi",
  "Weekly time switch: sends the programmed value on its output objects at the programmed times of the simulated clock.":
    "Programmateur hebdomadaire : émet la valeur programmée sur ses objets de sortie aux heures programmées de l'horloge simulée.",
  "Weekly program": "Programme hebdomadaire",
  "Send current state on start": "Émettre l'état courant au démarrage",
  "{0}: no slats configured, slat command ignored":
    "{0} : aucune lamelle configurée, commande de lamelles ignorée",
  "Slat angle estimated by the actuator ({0} %)":
    "Angle des lamelles estimé par l'actionneur ({0} %)",
  "Slats est.": "Lamelles est.",
  "Actual blind: {0} %, slats {1} %": "Store réel : {0} %, lamelles {1} %",
  slats: "lamelles",
  "Slat angle setpoint": "Consigne d'angle des lamelles",
  "Slat angle feedback": "Retour d'angle des lamelles",
  "Configured slat rotation time": "Durée de rotation des lamelles paramétrée",
  "Slat step": "Pas de lamelle",
  "Estimated slat angle at start": "Angle des lamelles estimé au départ",
  "Actual slat rotation time": "Durée réelle de rotation des lamelles",
  "Actual slat angle at start": "Angle réel des lamelles au départ",
  "{0}: output shed, command stored without effect":
    "{0} : sortie délestée, commande mémorisée sans effet",
  "Total power {0} W reaches the limit {1} W":
    "La puissance totale {0} W atteint la limite {1} W",
  "Total power {0} W is back below {1} W":
    "La puissance totale {0} W repasse sous {1} W",
  "{0}: switched off by load shedding": "{0} : coupée par délestage",
  "{0}: load shedding ended, stored command applied":
    "{0} : fin du délestage, commande mémorisée appliquée",
  shed: "délestée",
  "Appliance: {0} W rated": "Appareil : {0} W nominaux",
  "Switch actuator: each channel drives a relay; optional timer, status feedback, and power and energy metering.":
    "Actionneur de commutation : chaque voie commande un relais ; minuterie, retour d'état et mesure de puissance et d'énergie en option.",
  Energy: "Énergie",
  "Total power": "Puissance totale",
  "Power limit": "Limite de puissance",
  "Metering send interval": "Intervalle d'envoi des mesures",
  "Power send threshold": "Seuil d'envoi de la puissance",
  "Energy time scale": "Échelle de temps de l'énergie",
  "Total power limit": "Limite de puissance totale",
  "Minimum shedding time": "Durée minimale de délestage",
  "Power limit hysteresis": "Hystérésis de la limite de puissance",
  "Shed on power limit": "Délester sur limite de puissance",
  "Rated power": "Puissance nominale",
  Appliance: "Appareil",
  "{0} reaches the alarm threshold {1}: alarm set":
    "{0} atteint le seuil d'alarme {1} : alarme activée",
  "{0} is below {1}: alarm reset": "{0} est sous {1} : alarme désactivée",
  "Ventilation step kept for its minimum time":
    "Palier de ventilation maintenu pendant sa durée minimale",
  "CO₂ {0} ppm: ventilation step {1}":
    "CO₂ {0} ppm : palier de ventilation {1}",
  "{0}: {1} K limited to {2} K by the channel range":
    "{0} : {1} K limité à {2} K par la plage de la voie",
  State: "État",
  Humidity: "Humidité",
  "Power (kW)": "Puissance (kW)",
  "Wind speed (km/h)": "Vitesse du vent (km/h)",
  "Active energy (kWh)": "Énergie active (kWh)",
  "Percentage (0–255)": "Pourcentage (0–255)",
  "Air quality": "Qualité de l'air",
  "Colour temperature": "Température de couleur",
  "Active energy": "Énergie active",
  Active: "Actif",
  Inactive: "Inactif",
  Inverted: "Inversé",
  "Not inverted": "Non inversé",
  "Fan: {0} %": "Ventilateur : {0} %",
  "Dimmer: switching, relative (3.007) and absolute (5.001) dimming, tunable white (7.600), status feedback.":
    "Variateur : commutation, variation relative (3.007) et absolue (5.001), blanc réglable (7.600), retours d'état.",
  "Colour temperature status": "Retour de température de couleur",
  "Warmest colour temperature": "Température de couleur la plus chaude",
  "Coldest colour temperature": "Température de couleur la plus froide",
  "Initial colour temperature": "Température de couleur initiale",
  "Air quality sensor: sends measured temperature, relative humidity, and CO₂; sets alarms at thresholds and controls ventilation in three steps.":
    "Capteur de qualité d'air : émet la température, l'humidité relative et le CO₂ mesurés ; active des alarmes à des seuils et commande la ventilation en trois paliers.",
  "Relative humidity": "Humidité relative",
  "CO₂": "CO₂",
  "CO₂ alarm": "Alarme CO₂",
  "Humidity alarm": "Alarme humidité",
  "Ventilation control value": "Valeur de commande de ventilation",
  "CO₂ alarm threshold": "Seuil d'alarme CO₂",
  "CO₂ alarm hysteresis": "Hystérésis de l'alarme CO₂",
  "Humidity alarm threshold": "Seuil d'alarme humidité",
  "Humidity alarm hysteresis": "Hystérésis de l'alarme humidité",
  "Threshold step 0 ↔ 1": "Seuil palier 0 ↔ 1",
  "Threshold step 1 ↔ 2": "Seuil palier 1 ↔ 2",
  "Threshold step 2 ↔ 3": "Seuil palier 2 ↔ 3",
  "Step hysteresis": "Hystérésis des paliers",
  "Control value step 0": "Valeur de commande palier 0",
  "Control value step 1": "Valeur de commande palier 1",
  "Control value step 2": "Valeur de commande palier 2",
  "Control value step 3": "Valeur de commande palier 3",
  "Minimum time per step": "Durée minimale par palier",
  Fan: "Ventilateur",
  "Relay operating mode": "Mode de fonctionnement du relais",
  "Normally closed relay: the load is powered while the channel is off.":
    "Relais normalement fermé : la charge est alimentée tant que la voie est à l'arrêt.",
  "{0} · {1}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.":
    "{0} · {1} : l'actionneur attend une vanne normalement ouverte, mais la vanne est normalement fermée ; elle s'ouvre quand aucune chaleur n'est demandée.",
  "{0} · {1}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.":
    "{0} · {1} : l'actionneur attend une vanne normalement fermée, mais la vanne est normalement ouverte ; elle s'ouvre quand aucune chaleur n'est demandée.",
  "{0} · {1}: the motor is wired in reverse and the actuator does not compensate it; the shutter moves opposite to the commands.":
    "{0} · {1} : le moteur est câblé à l'envers et l'actionneur ne le compense pas ; le volet se déplace à l'inverse des commandes.",
  "{0} · {1}: the actuator inverts its output, but the motor is wired normally; the shutter moves opposite to the commands.":
    "{0} · {1} : l'actionneur inverse sa sortie, mais le moteur est câblé normalement ; le volet se déplace à l'inverse des commandes.",
  "{0}: the contact is normally closed, but the input is not inverted; open and closed are reported the wrong way round.":
    "{0} : le contact est normalement fermé, mais l'entrée n'est pas inversée ; ouvert et fermé sont signalés à l'envers.",
  "{0}: the input is inverted, but the contact is normally open; open and closed are reported the wrong way round.":
    "{0} : l'entrée est inversée, mais le contact est normalement ouvert ; ouvert et fermé sont signalés à l'envers.",
  "{0} links DPT {1} and DPT {2}, whose values 0 and 1 have opposite meanings; check the receiving objects.":
    "{0} relie le DPT {1} et le DPT {2}, dont les valeurs 0 et 1 ont des sens opposés ; vérifiez les objets récepteurs.",
  "thermostat: no external temperature for {0} s: internal sensor used":
    "thermostat : aucune température externe depuis {0} s : sonde interne utilisée",
  "thermostat: external temperature received again":
    "thermostat : température externe à nouveau reçue",
  "Outdoor temperature of the rooms set to {0} °C":
    "Température extérieure des pièces réglée à {0} °C",
  "Configuration check": "Contrôle de configuration",
  "External temperature timeout": "Délai de la température externe",
  "Contact type": "Type de contact",
  "Normally open": "Normalement ouvert",
  "Normally closed": "Normalement fermé",
  "Invert input": "Inverser l'entrée",
  "Outdoor temperature applies to the rooms":
    "La température extérieure s'applique aux pièces",
  "Motor wired in reverse": "Moteur câblé à l'envers",
  "Heating effect (K)": "Effet de chauffage (K)",
  Command: "Commande",
  "Status feedback": "Retour d'état",
  Scene: "Scène",
  Forcing: "Forçage",
  "Up/down": "Montée/descente",
  "Stop/step": "Arrêt/pas",
  "Position setpoint": "Consigne de position",
  "Position feedback": "Retour de position",
  Transmission: "Émission",
  Display: "Affichage",
  Timer: "Minuterie",
  "Status feedback delay": "Délai du retour d'état",
  "End of forcing": "Fin du forçage",
  "On at start": "Allumé au départ",
  "Configured travel time": "Course paramétrée",
  "Start delay": "Délai de départ",
  "Position feedback delay": "Délai du retour de position",
  "Stop/step increment": "Pas d'un arrêt/pas",
  "Inverted wiring": "Câblage inversé",
  "Estimated position at start": "Position estimée au départ",
  "Actual travel time": "Course réelle",
  "Actual position at start": "Position réelle au départ",
  "Switch-on delay": "Retard d'allumage",
  "Dimmer: switching, relative (3.007) and absolute (5.001) dimming, status feedback.":
    "Variateur : commutation, variation relative (3.007) et absolue (5.001), retours d'état.",
  Switching: "Commutation",
  Dimming: "Variation",
  Value: "Valeur",
  Status: "État",
  "Value status": "État valeur",
  "Switch-on value": "Valeur d'allumage",
  "Switch-on level": "Niveau d'allumage",
  "Dimming time": "Temps de variation",
  "Fade on switching": "Fondu à la commutation",
  "Fade on value": "Fondu sur valeur",
  "Minimum level": "Niveau minimal",
  "Maximum level": "Niveau maximal",
  "Switch on by dimming": "Allumage par variation",
  "Switch off by dimming": "Extinction par variation",
  "Initial level": "Niveau au départ",
  "KNX/DALI gateway: each channel is a DALI group of ballasts; broadcast, scenes and fault reporting.":
    "Passerelle KNX/DALI : chaque canal est un groupe DALI de ballasts ; broadcast, scènes et report des défauts.",
  Fault: "Défaut",
  "Broadcast switching": "Broadcast commutation",
  "Broadcast value": "Broadcast valeur",
  "General fault": "Défaut général",
  "Ballast polling": "Interrogation des ballasts",
  "Dimmable lamp": "Lampe variable",
  "DALI group": "Groupe DALI",
  "Number of ballasts": "Nombre de ballasts",
  "First short address": "Première adresse courte",
  "Faulty ballasts": "Ballasts en défaut",
  "USB interface: writes and reads group addresses from the USB interface panel of the diagram.":
    "Interface USB : écrit et lit des adresses de groupe depuis le panneau d'interface USB du diagramme.",
  "Long press duration": "Durée d'appui long",
  "Switch-off warning": "Préavis d'extinction",
  "Hold time restarted by a detection": "Temporisation relancée par un passage",
  "Send 0 at the end": "Émettre 0 à la fin",
  "Hold time": "Temporisation",
  Presence: "Présence",
  "Presence detector: sends 1 on first detection, 0 when its hold time ends (restarted by each detection).":
    "Détecteur de présence : émet 1 au premier passage, 0 à la fin de sa temporisation (relancée à chaque passage).",
  "Timer retriggering": "Redéclenchement de la minuterie",
  "Early switch-off by 0": "Arrêt anticipé par 0",
  "End-of-travel supplement": "Supplément en fin de course",
  Lamp: "Lampe",
  "Push button or sensor: each gesture writes a value into a local object, then transmits it.":
    "Poussoir ou capteur : chaque geste écrit une valeur dans un objet local puis l'émet.",
  "Switch actuator: each channel drives a relay; optional timer and status feedback.":
    "Actionneur de commutation : chaque canal pilote un relais ; minuterie et retour d'état facultatifs.",
  "Shutter actuator without sensor: position estimated from the configured travel time.":
    "Actionneur de volet sans capteur : estimation de position par le temps de course paramétré.",
  "Display / supervisor: receives and shows values, with no output or retransmission.":
    "Afficheur / superviseur : reçoit et affiche les valeurs, sans sortie ni retransmission.",
  "Device without logic: it only keeps the values of its objects.":
    "Participant sans logique : il conserve seulement les valeurs de ses objets.",
  "Roller shutter": "Volet roulant",
  "Room thermostat: comfort / standby / economy / protection modes (20.102), window and presence, PI control (5.001 or PWM) or two-point, heating and cooling.":
    "Thermostat d'ambiance : modes confort / veille / économie / protection (20.102), fenêtre et présence, régulation PI (5.001 ou PWM) ou deux points, chauffage et refroidissement.",
  "Measured temperature": "Température mesurée",
  "External temperature": "Température externe",
  "Base setpoint": "Consigne de base",
  "Setpoint shift": "Décalage de consigne",
  "Current setpoint": "Consigne en cours",
  "Mode (preset)": "Mode (présélection)",
  "Current mode": "Mode en cours",
  Window: "Fenêtre",
  "Heating / cooling": "Chauffage / refroidissement",
  "Heating / cooling status": "État chauffage / refroidissement",
  "Heating control value": "Commande chauffage",
  "Heating 1-bit control": "Commande chauffage 1 bit",
  "Cooling control value": "Commande refroidissement",
  "Cooling 1-bit control": "Commande refroidissement 1 bit",
  "Control type": "Type de régulation",
  "Standby setback": "Abaissement veille",
  "Economy setback": "Abaissement économie",
  "Frost protection setpoint": "Consigne hors gel",
  "Heat protection setpoint": "Consigne protection chaleur",
  "Dead zone": "Zone neutre",
  "Minimum setpoint": "Consigne minimale",
  "Maximum setpoint": "Consigne maximale",
  Hysteresis: "Hystérésis",
  "Proportional band": "Bande proportionnelle",
  "Integral time": "Temps d'intégration",
  "PWM cycle time": "Période PWM",
  "Calculation period": "Période de calcul",
  "Send on change": "Émission sur variation",
  "Cyclic sending of control value": "Émission cyclique de la commande",
  "Temperature send threshold": "Émission de la température",
  "Cyclic sending of temperature": "Émission cyclique de la température",
  "Heating actuator: each output drives an electrothermal valve; continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.":
    "Actionneur de chauffage : chaque sortie alimente une vanne thermoélectrique ; grandeur continue (5.001) modulée en PWM ou commande 1 bit directe, surveillance et secours.",
  "Control value": "Grandeur de commande",
  "1-bit command": "Commande 1 bit",
  "Control value status": "État de la commande",
  "Control value failure": "Défaut de commande",
  "Valve direction of action": "Sens d'action de la vanne",
  "Control value monitoring": "Surveillance de la commande",
  "Emergency control value": "Commande de secours",
  "Window contact (binary input): sends the opening and closing of its room's window.":
    "Contact de fenêtre (entrée binaire) : transmet l'ouverture et la fermeture de la fenêtre de sa pièce.",
  Contact: "Contact",
  Invert: "Inverser",
  "Room temperature sensor: sends its room's temperature on change and cyclically.":
    "Sonde de température d'ambiance : émet la température de sa pièce sur variation et cycliquement.",
  Temperature: "Température",
  "Cyclic sending": "Émission cyclique",
  Radiator: "Radiateur",
  "Valve travel time": "Course de la vanne",
  "Valve open when de-energised": "Vanne ouverte hors tension",
  Power: "Puissance",
  Emitter: "Émetteur",
  "Initial opening": "Ouverture au départ",
  "Set value": "Valeur paramétrée",
  "Last value": "Dernière valeur",
  Restarts: "Redémarre",
  "No effect": "Sans effet",
  Extends: "Prolonge",
  "Last command": "Dernière commande",
  "Previous state": "État d'avant",
  Unchanged: "Inchangé",
  On: "Marche",
  Off: "Arrêt",
  Toggle: "Inversion",
  "PI (continuous or PWM)": "PI (continue ou PWM)",
  "Two-point": "Deux points",
  "Closed when de-energised": "Fermée hors tension",
  "Open when de-energised": "Ouverte hors tension",
  Heating: "Chauffage",
  Cooling: "Refroidissement",
  "Send on start": "Émission au démarrage",
  "Switch on by brightness value": "Allumage par valeur de luminosité",
  "Switch off by brightness value": "Extinction par valeur de luminosité",
  "{0}: off, a brightness value does not switch on (parameter)":
    "{0} : éteint, une valeur de luminosité n'allume pas (paramètre)",
  "{0}: a value of 0 does not switch off (parameter): minimum level {1} %":
    "{0} : une valeur 0 n'éteint pas (paramètre) : niveau minimum {1} %",
  "Configured travel time up": "Durée de montée configurée",
  "Actual travel time up": "Durée de montée réelle",
  "{0} links DPT {1} ({2}) and DPT {3} ({4}): the same bytes mean different values; each receiver interprets them with its own DPT.":
    "{0} relie le DPT {1} ({2}) et le DPT {3} ({4}) : les mêmes octets désignent des valeurs différentes ; chaque récepteur les interprète avec son propre DPT.",
  "PSU {0} mA": "Alim. {0} mA",
  PSU: "Alim.",
  "Bus power supply with choke": "Alimentation de bus avec self",
  "Other system": "Autre système",
  "Value from the other system": "Valeur de l'autre système",
  "Command to the other system": "Commande vers l'autre système",
  "{0} → {1}: {2} (forwarded, not simulated)":
    "{0} → {1} : {2} (transmis, non simulé)",
  "Gateway to another building system (Modbus, BACnet…): values from that system are entered and sent on KNX; KNX commands are received and forwarded to it, without simulating the other protocol.":
    "Passerelle vers un autre système du bâtiment (Modbus, BACnet…) : les valeurs de ce système sont saisies et envoyées sur KNX ; les commandes KNX sont reçues et lui sont transmises, sans simuler l'autre protocole.",
  "{0} (DPT not simulated)": "{0} (DPT non simulé)",
  "DPT {0} is not simulated: only objects of a passive or display device (passive/v1, display/v1) may use it":
    "le DPT {0} n'est pas simulé : seuls les objets d'un appareil passif ou d'affichage (passive/v1, display/v1) peuvent l'utiliser",
  "DPT {0} is not simulated: its value stays unknown until a telegram is received":
    "le DPT {0} n'est pas simulé : sa valeur reste inconnue jusqu'à la réception d'un télégramme",
  "Energy meter: measures several circuits that other devices switch or that are always supplied; sends their power and integrated energy.":
    "Compteur d'énergie : mesure plusieurs circuits commutés par d'autres appareils ou alimentés en permanence ; envoie leur puissance et l'énergie intégrée.",
  "Measured power at start": "Puissance mesurée au démarrage",
  "Meter index at start": "Index du compteur au démarrage",
  "Switch-on brightness threshold": "Seuil de luminosité d'enclenchement",
  "Detection: {0} lx is not below the threshold of {1} lx, no switch-on":
    "Détection : {0} lx n'est pas sous le seuil de {1} lx, pas d'enclenchement",
  "Start-up send delay": "Délai d'émission au démarrage",
  "Group addresses assigned to the interface":
    "Adresses de groupe affectées à l'interface",
  "no timer": "pas de minuterie",
  "Loading KNX scenario…": "Chargement du scénario KNX…",
  "Could not load {0} ({1}).": "Chargement de {0} impossible ({1}).",
  "Invalid scenario:": "Scénario invalide :",
  "Simulation stopped:": "Simulation interrompue :",
  Reset: "Réinitialiser",
  "Next ▶": "Suivant ▶",
  "Click = short press · hold 0.5 s = long press (keyboard: Enter / Shift+Enter)":
    "Clic = appui court · maintenir 0,5 s = appui long (clavier : Entrée / Maj+Entrée)",
  Resume: "Reprendre",
  Pause: "Pause",
  "Step by step": "Pas à pas",
  Extension: "Extension",
  Speed: "Vitesse",
  Slow: "Lente",
  Normal: "Normale",
  Fast: "Rapide",
  "Filter tables": "Tables de filtrage",
  "Stop at every transmission, coupler, reception, output change and timer":
    "S'arrêter à chaque émission, coupleur, réception, changement de sortie et échéance",
  "Internal object value:": "Valeur interne de l'objet :",
  "Click to inspect objects and channels":
    "Cliquer pour inspecter les objets et les canaux",
  "Send value": "Envoyer la valeur",
  "forced on": "forcé marche",
  "off in {0} s": "arrêt dans {0} s",
  heat: "chauffe",
  cool: "froid",
  "forced off": "forcé arrêt",
  "view “{0}” missing": "vue « {0} » absente",
  "Position estimated by the actuator ({0} %)":
    "Position estimée par l'actionneur ({0} %)",
  Estimated: "Estimée",
  "Motor command applied by the actuator":
    "Ordre moteur appliqué par l'actionneur",
  Motor: "Moteur",
  "view “{0}” ({1}/{2}): {3}": "vue « {0} » ({1}/{2}) : {3}",
  "view “{0}” failed": "vue « {0} » en erreur",
  "checking…": "analyse…",
  "Long press → {0}": "Appui long → {0}",
  "Hold for a long press…": "Maintenir pour un appui long…",
  "Element {0} not found in the page.": "Élément {0} introuvable dans la page.",
  "setSpeed: finite positive number expected (got {0})":
    "setSpeed : nombre fini strictement positif attendu (reçu {0})",
  "BusDiagram.create: element {0} not found":
    "BusDiagram.create : élément {0} introuvable",
  "Connects a line to the main line. It only forwards the group addresses of its filter table (used on both sides) and decrements the routing counter.":
    "Relie une ligne à la ligne principale. Il ne transmet que les adresses de groupe de sa table de filtrage (utilisées des deux côtés) et décrémente le compteur de routage.",
  "Connects the main line of an area to the backbone. Same filter-table principle, at area level.":
    "Relie la ligne principale d'une zone à la dorsale. Même principe de table de filtrage, à l'échelle de la zone.",
  "Gateway between the TP bus and the IP network (KNXnet/IP). Its filter table only lets through addresses used on the other side.":
    "Passerelle entre le bus TP et le réseau IP (KNXnet/IP). Sa table de filtrage ne laisse passer que les adresses utilisées de l'autre côté.",
  "Extends the line electrically (new segment of 64 devices). No filtering: everything is repeated, and the routing counter is decremented.":
    "Prolonge électriquement la ligne (nouveau segment de 64 participants). Aucun filtrage : tout est recopié, avec décrémentation du compteur de routage.",
  "Splits the line into segments with a filter table: local traffic of one segment no longer reaches the other.":
    "Découpe la ligne en sous-segments avec une table de filtrage : le trafic local d'un segment ne passe plus dans l'autre.",
  "No scenario: open this player from the designer (Export → Player link), or with player.html?src=my-scenario.json.":
    "Aucun scénario : ouvrez ce lecteur depuis le concepteur (Exporter → Lien de lecture), ou avec player.html?src=mon-scenario.json.",
  "Unreadable link: {0}": "Lien illisible : {0}",
  "Link without a scenario (parameter “d” missing).":
    "Lien sans scénario (paramètre « d » absent).",
  "sends {0} = {1} (object “{2}”).": "émet {0} = {1} (objet « {2} »).",
  "filtered, the telegram stops here": "filtré, le télégramme s'arrête ici",
  "repeated, RC {0}→{1}": "recopié, RC {0}→{1}",
  "forwarded, RC {0}→{1}": "transmis, RC {0}→{1}",
  "checks its table: {0} {1}.": "consulte sa table : {0} {1}.",
  "receives {0}: object “{1}” takes the value {2} (internal link).":
    "reçoit {0} : l'objet « {1} » prend la valeur {2} (liaison interne).",
  "receives {0}: object “{1}” takes the value {2}.":
    "reçoit {0} : l'objet « {1} » prend la valeur {2}.",
  "receives {0} but object “{1}” ignores it: W flag disabled.":
    "reçoit {0} mais l'objet « {1} » l'ignore : flag W désactivé.",
  "{0} reached.": "{0} atteinte.",
  "(+{0} details)": "(+{0} détails)",
  "(+{0} detail)": "(+{0} détail)",
  "Filter table:": "Table de filtrage :",
  empty: "vide",
  Behavior: "Comportement",
  Object: "Objet",
  "W: accepts writes · T: may transmit":
    "W : accepte l'écriture · T : peut émettre",
  "W: accepts received writes": "W : accepte les écritures reçues",
  "W: ignores received writes": "W : ignore les écritures reçues",
  "T: may transmit": "T : peut émettre",
  "T: does not transmit": "T : n'émet pas",
  "Channels ({0})": "Canaux ({0})",
  "Estimated position": "Position estimée",
  "Actual position": "Position réelle",
  "no shutter connected": "aucun volet raccordé",
  "Motor command": "Ordre moteur",
  Phase: "Phase",
  "End stop": "Butée",
  top: "haute",
  bottom: "basse",
  Output: "Sortie",
  "stored command:": "commande mémorisée :",
  on: "marche",
  off: "arrêt",
  "switching off in {0} s": "extinction dans {0} s",
  Equipment: "Équipement",
  unused: "non utilisé",
  "Group monitor": "Moniteur de groupe",
  "{0} telegrams": "{0} télégrammes",
  "{0} telegram": "{0} télégramme",
  "click to inspect": "cliquer pour inspecter",
  Time: "Heure",
  Source: "Source",
  Destination: "Destination",
  Type: "Type",
  "No telegram yet. Press a push-button key.":
    "Aucun télégramme. Appuyez sur une touche d'un poussoir.",
  "automatic transmission": "émission automatique",
  "gesture {0} · {1}": "geste {0} · {1}",
  "timer {0} of {1}": "échéance {0} de {1}",
  "reception on “{0}” ({1})": "réception sur « {0} » ({1})",
  Telegram: "Télégramme",
  "Details of the last telegram (fields, bytes, couplers crossed, target objects) will appear here.":
    "Le détail du dernier télégramme (champs, octets, coupleurs traversés, objets destinataires) s'affichera ici.",
  "individual addr.": "adr. individuelle",
  "group addr.": "adr. de groupe",
  Service: "Service",
  "{0} according to {1}": "{0} selon {1}",
  Cause: "Cause",
  "TP1 frame: control · source · destination · type/RC/length · APCI+data · checksum. The DPT is not transmitted: only the devices know it.":
    "Trame TP1 : contrôle · source · destination · type/RC/longueur · APCI+donnée · contrôle. Le DPT n'est pas transmis : seuls les participants le connaissent.",
  Couplers: "Coupleurs",
  "in progress": "en cours",
  "Objects linked to {0}": "Objets liés à {0}",
  "(internal link)": "(liaison interne)",
  "write accepted": "écriture acceptée",
  received: "reçu",
  "ignored (W)": "ignoré (W)",
  "The telegram is travelling on the bus…": "Le télégramme circule sur le bus…",
  "No other device listens to this address.":
    "Aucun autre participant n'écoute cette adresse.",
  "Reached without association:": "Atteint sans association :",
  Control: "Contrôle",
  "standard frame, low priority": "trame standard, priorité basse",
  "Group · RC · length": "Groupe · RC · long.",
  "group address, RC {0}, {1} bytes": "adresse de groupe, RC {0}, {1} octets",
  "group address, RC {0}, {1} byte": "adresse de groupe, RC {0}, {1} octet",
  "TPCI/APCI + data": "TPCI/APCI + donnée",
  Checksum: "Contrôle de trame",
  "inverted XOR": "XOR inversé",
  "IP network · KNXnet/IP": "Réseau IP · KNXnet/IP",
  "Line {0}": "Ligne {0}",
  "Line {0} · downstream segment": "Ligne {0} · segment aval",
  "Area {0}": "Zone {0}",
  "KNX/IP router": "Routeur KNX/IP",
  "Area coupler": "Coupleur de zone",
  "Line coupler": "Coupleur de ligne",
  "Segment coupler": "Coupleur de segment",
  Repeater: "Répéteur",
  Switch: "Commutation",
  Boolean: "Booléen",
  Enable: "Validation",
  Step: "Pas",
  "Up/Down": "Haut/Bas",
  "Open/Close": "Ouvert/Fermé",
  "Start/Stop": "Marche/Arrêt",
  Trigger: "Déclencheur",
  Occupancy: "Occupation",
  "Priority control": "Commande prioritaire",
  Percentage: "Pourcentage",
  Counter: "Compteur",
  "Scene number": "Numéro de scène",
  True: "Vrai",
  False: "Faux",
  Enabled: "Validé",
  Disabled: "Bloqué",
  "Step increase": "Pas croissant",
  "Step decrease": "Pas décroissant",
  Down: "Descendre",
  Up: "Monter",
  Closed: "Fermé",
  Open: "Ouvert",
  Start: "Marche",
  Stop: "Arrêt",
  Triggered: "Déclenché",
  "Forced on": "Forcé marche",
  "Forced off": "Forcé arrêt",
  "No forcing": "Pas de forçage",
  Occupied: "Occupé",
  Vacant: "Libre",
  "Scene {0}": "Scène {0}",
  unknown: "inconnue",
  "DPT {0} not supported": "DPT {0} non pris en charge",
  "finite number expected": "valeur numérique finie attendue",
  "value {0} outside the range {1}…{2} of DPT {3}":
    "valeur {0} hors de la plage {1}…{2} du DPT {3}",
  "DPT {0} only accepts 0 or 1": "le DPT {0} n'accepte que 0 ou 1",
  "DPT {0} expects an integer": "le DPT {0} attend un entier",
  "relay closed": "relais fermé",
  "relay open": "relais ouvert",
  "motor ▲ up": "moteur ▲ montée",
  "motor ▼ down": "moteur ▼ descente",
  "motor stopped": "moteur arrêté",
  repeated: "recopié",
  forwarded: "transmis",
  filtered: "filtré",
  "{0} {1}: {2}": "{0} {1} : {2}",
  "timer “{0}”": "échéance « {0} »",
  "more than {0} events at t = {1} ms: cascade stopped (see the chain of causes in the journal)":
    "plus de {0} événements à t = {1} ms : cascade interrompue (voir la chaîne des causes dans le journal)",
  "equipment {0} ({1}): {2}": "équipement {0} ({1}) : {2}",
  "{0} ({1}) · {2}.{3}: {4}": "{0} ({1}) · {2}.{3} : {4}",
  "{0}.channelState({1}): {2}": "{0}.channelState({1}) : {2}",
  "{0}: command “{1}” incompatible with equipment {2}":
    "{0} : commande « {1} » incompatible avec l'équipement {2}",
  "T flag disabled: value changed locally, no telegram":
    "flag T désactivé : valeur modifiée localement, aucun télégramme",
  "no group address associated": "aucune adresse de groupe associée",
  "{0}/{1}: transmission requested without a group address":
    "{0}/{1} : émission demandée sans adresse de groupe",
  "unknown value": "valeur inconnue",
  "reached but no association": "atteint mais aucune association",
  "W flag disabled: value and behavior unchanged":
    "flag W désactivé : valeur et comportement inchangés",
  "behavior “{0}” not registered": "comportement « {0} » non enregistré",
  "advance: non-negative integer duration expected (got {0})":
    "advance : durée entière positive ou nulle attendue (reçu {0})",
  "non-negative integer duration expected (got {0})":
    "durée entière positive ou nulle attendue (reçu {0})",
  "unknown object “{0}” in {1}": "objet « {0} » inconnu dans {1}",
  "unknown channel “{0}” in {1}": "canal « {0} » inconnu dans {1}",
  "non-numeric value for {0}": "valeur non numérique pour {0}",
  "timer key required": "clé d'échéance requise",
  "invalid delay for “{0}”: {1}": "délai invalide pour « {0} » : {1}",
  "invalid output command on {0}: {1}":
    "commande de sortie invalide sur {0} : {1}",
  "{0}: already moving to {1} %, command has no effect":
    "{0} : déjà en mouvement vers {1} %, commande sans effet",
  "{0}: no preset for scene {1}, command ignored":
    "{0} : aucun préréglage pour la scène {1}, commande ignorée",
  "{0}: output forced (on), command stored without effect":
    "{0} : sortie forcée (marche), commande mémorisée sans effet",
  "{0}: output forced (off), command stored without effect":
    "{0} : sortie forcée (arrêt), commande mémorisée sans effet",
  "Actual shutter: {0} %": "Volet réel : {0} %",
  "The scenario must be a JSON object.": "Le scénario doit être un objet JSON.",
  "unknown format version “{0}” (supported versions: 1, 2)":
    "version de format inconnue « {0} » (versions prises en charge : 1, 2)",
  "unknown field “{0}”": "champ inconnu « {0} »",
  "required field": "champ requis",
  "text expected": "texte attendu",
  "empty identifier": "identifiant vide",
  "invalid identifier “{0}”: letters, digits, “_”, “-” or “.”, no space or “/”":
    "identifiant « {0} » invalide : lettres, chiffres, « _ », « - » ou « . », sans espace ni « / »",
  "empty value": "valeur vide",
  "list required": "liste requise",
  "list expected": "liste attendue",
  "at least one line is required": "au moins une ligne est requise",
  "“{0}” is not a valid line address (e.g. 1.1, area and line 0–15)":
    "« {0} » n'est pas une adresse de ligne valide (ex. 1.1, zone et ligne 0–15)",
  "duplicate line {0}": "ligne {0} en double",
  "“{0}” is not a valid individual address":
    "« {0} » n'est pas une adresse individuelle valide",
  "extension {0} does not belong to line {1}":
    "l'extension {0} n'appartient pas à la ligne {1}",
  "“repeater” or “segmentCoupler” expected":
    "« repeater » ou « segmentCoupler » attendu",
  "boolean expected": "booléen attendu",
  "“{0}” is not a valid 3-level group address (0–31/0–7/0–255)":
    "« {0} » n'est pas une adresse de groupe 3 niveaux valide (0–31/0–7/0–255)",
  "duplicate group address {0}": "adresse de groupe {0} en double",
  "empty DPT (remove the field or write a DPT)":
    "DPT vide (retirer le champ ou écrire un DPT)",
  "DPT “{0}” not supported": "DPT « {0} » non pris en charge",
  "duplicate identifier “{0}”": "identifiant « {0} » en double",
  "unknown type “{0}”": "type inconnu « {0} »",
  "unknown behavior “{0}” (extension not loaded? Available behaviors: {1})":
    "comportement inconnu « {0} » (extension non chargée ? Comportements disponibles : {1})",
  "“TP” or “IP” expected": "« TP » ou « IP » attendu",
  "“{0}” is not a valid individual address (e.g. 1.1.10; area and line 0–15, device 0–255)":
    "« {0} » n'est pas une adresse individuelle valide (ex. 1.1.10 ; zone et ligne 0–15, participant 0–255)",
  "{0} is reserved for the area (backbone) coupler":
    "{0} est réservée au coupleur de zone (backbone)",
  "{0} is not a device address: device number 0 is reserved for couplers":
    "{0} n'est pas une adresse d'appareil : le numéro 0 est réservé aux coupleurs",
  "{0} is reserved for the line coupler; a line repeater or segment coupler uses a device number from 1 to 255, for example {1}.64":
    "{0} est réservée au coupleur de ligne ; un répéteur de ligne ou un coupleur de segment utilise un numéro d'appareil de 1 à 255, par exemple {1}.64",
  "lines 0.1 to 0.15, connected directly to the backbone, exist in KNX but are not supported by BusDiagram; use an area from 1 to 15":
    "les lignes 0.1 à 0.15, raccordées directement au backbone, existent en KNX mais ne sont pas prises en charge par BusDiagram ; utilisez une zone de 1 à 15",
  "{0} is reserved for the line coupler":
    "{0} est réservée au coupleur de la ligne",
  "line {0} is not declared in “lines”":
    "la ligne {0} n'est pas déclarée dans « lines »",
  "line {0} has no extension (repeater/segment coupler)":
    "la ligne {0} n'a pas d'extension (répéteur/coupleur de segment)",
  "individual address {0} already used ({1})":
    "adresse individuelle {0} déjà utilisée ({1})",
  "duplicate channel “{0}”": "canal « {0} » en double",
  "strictly positive duration in seconds expected":
    "durée en secondes strictement positive attendue",
  "“lamp”, “shutter” or “none” expected":
    "« lamp », « shutter » ou « none » attendu",
  "object or null expected": "objet ou null attendu",
  "unknown equipment “{0}” (available: {1})":
    "équipement inconnu « {0} » (disponibles : {1})",
  "“{0}” expects “{1}” commands, behavior {2} sends “{3}”":
    "« {0} » attend des commandes « {1} », le comportement {2} commande « {3} »",
  "behavior {0} drives no output":
    "le comportement {0} ne commande aucune sortie",
  "object { scene number: value } expected":
    "objet { numéro de scène : valeur } attendu",
  "integer scene number 1–64 expected": "numéro de scène entier 1–64 attendu",
  "DALI scene number 1–16 expected": "numéro de scène DALI 1–16 attendu",
  "DALI gateway supports at most 16 groups":
    "une passerelle DALI prend en charge au plus 16 groupes",
  "DALI short address A{0} is already assigned to channel {1}; overlapping groups are outside this model":
    "l’adresse courte DALI A{0} est déjà affectée au canal {1} ; les groupes qui se chevauchent ne sont pas modélisés",
  "number expected": "nombre attendu",
  "preset 0 or 1 expected for a switching channel":
    "préréglage 0 ou 1 attendu pour un canal de commutation",
  "position 0–100 % expected for a shutter":
    "position 0–100 % attendue pour un volet",
  "duplicate object “{0}”": "objet « {0} » en double",
  "empty address: write [] for an unassociated object":
    "adresse vide : écrire [] pour un objet non associé",
  "group address or list of addresses expected":
    "adresse de groupe ou liste d'adresses attendue",
  "required field (empty list for an unassociated object)":
    "champ requis (liste vide pour un objet non associé)",
  "“{0}” is not a valid 3-level group address (e.g. 1/1/1)":
    "« {0} » n'est pas une adresse de groupe 3 niveaux valide (ex. 1/1/1)",
  "duplicate address {0} in the object": "adresse {0} en double dans l'objet",
  "unknown role “{0}”": "rôle inconnu « {0} »",
  "port “{0}” not accepted by {1} (ports: {2})":
    "port « {0} » non accepté par {1} (ports : {2})",
  "channel “{0}” missing from {1}.channels":
    "canal « {0} » absent de {1}.channels",
  "port “{0}” does not refer to a channel":
    "le port « {0} » ne désigne pas de canal",
  "port “{0}” requires a channel": "le port « {0} » nécessite un canal",
  "DPT required (on the object or on its first group address)":
    "DPT requis (sur l'objet ou sur sa première adresse de groupe)",
  "DPT {0} incompatible with port “{1}” (expected: {2})":
    "DPT {0} incompatible avec le port « {1} » (attendu : {2})",
  "object “{0}” not found in this device":
    "objet « {0} » introuvable dans ce participant",
  "behavior {0} does not use keys":
    "le comportement {0} n'exploite pas de touches",
  "duplicate key identifier “{0}”": "identifiant de touche « {0} » en double",
  "unknown icon “{0}”": "icône inconnue « {0} »",
  "a “press”, “short” or “long” action is required":
    "une action « press », « short » ou « long » est requise",
  "“press” cannot be combined with “short”/“long”":
    "« press » ne se combine pas avec « short »/« long »",
  "object { object, value } expected": "objet { object, value } attendu",
  "number or “toggle” expected": "valeur numérique ou « toggle » attendue",
  "object “{0}” has no group address":
    "l'objet « {0} » n'a pas d'adresse de groupe",
  "“toggle” only makes sense for a 1-bit object (DPT {0})":
    "« toggle » n'a de sens que pour un objet 1 bit (DPT {0})",
  "behavior {0} does not use inputs":
    "le comportement {0} n'exploite pas d'entrées",
  "identifier “{0}” already used by a key or an input":
    "identifiant « {0} » déjà utilisé par une touche ou une entrée",
  "“number” expected": "« number » attendu",
  "object “{0}” must have port “input”":
    "l'objet « {0} » doit avoir le port « input »",
  "number required": "nombre requis",
  "“min” must be less than “max”": "« min » doit être inférieur à « max »",
  "strictly positive step expected": "pas strictement positif attendu",
  "bounds outside the range {0}…{1} of DPT {2}":
    "bornes hors de la plage {0}…{1} du DPT {2}",
  "flags { W, T } required in v2": "flags { W, T } requis en v2",
  "{0} is associated with objects of different sizes: {1} here, {2} elsewhere":
    "{0} est associée à des objets de tailles différentes : {1} ici, {2} ailleurs",
  "strictly positive number expected": "nombre strictement positif attendu",
  'missing: this file uses format 2 fields (behavior, port, flags); add "formatVersion": 2':
    'absent : ce fichier utilise des champs du format 2 (behavior, port, flags) ; ajouter "formatVersion": 2',
  integer: "entier",
  number: "nombre",
  boolean: "booléen",
  text: "texte",
  " or ": " ou ",
  "object expected": "objet attendu",
  "unknown parameter “{0}”": "paramètre inconnu « {0} »",
  "unknown parameter “{0}” (this behavior has no parameters)":
    "paramètre inconnu « {0} » (ce comportement n'a pas de paramètres)",
  "required parameter": "paramètre requis",
  "{0} expected": "{0} attendu",
  "value {0} out of bounds ({1})": "valeur {0} hors bornes ({1})",
  "unknown value “{0}” ({1})": "valeur « {0} » inconnue ({1})",
  "registerMessages: language code required":
    "registerMessages : code de langue requis",
  "Behavior: invalid identifier “{0}”":
    "Comportement : identifiant « {0} » invalide",
  "Equipment: invalid identifier “{0}”":
    "Équipement : identifiant « {0} » invalide",
  "Behavior “{0}” already registered": "Comportement « {0} » déjà enregistré",
  "Equipment “{0}” already registered": "Équipement « {0} » déjà enregistré",
  "Behavior “{0}”: definition expected":
    "Comportement « {0} » : définition attendue",
  "Equipment “{0}”: definition expected":
    "Équipement « {0} » : définition attendue",
  "Invalid behavior “{0}”:": "Comportement « {0} » invalide :",
  "Invalid equipment “{0}”:": "Équipement « {0} » invalide :",
  '{0}: { type: "object", properties: { … } } expected':
    '{0} : { type: "object", properties: { … } } attendu',
  "{0}.{1}: unsupported keyword (subset: type, properties, required, additionalProperties)":
    "{0}.{1} : mot-clé non pris en charge (sous-ensemble : type, properties, required, additionalProperties)",
  "{0}.additionalProperties: only false is supported":
    "{0}.additionalProperties : seule la valeur false est prise en charge",
  "{0}.required: “{1}” is not a declared property":
    "{0}.required : « {1} » n'est pas une propriété déclarée",
  "{0}: object expected": "{0} : objet attendu",
  "{0}.{1}: unsupported keyword (scalar values only)":
    "{0}.{1} : mot-clé non pris en charge (valeurs scalaires seulement)",
  "{0}.type: {1} (or a list of these types) expected":
    "{0}.type : {1} (ou une liste de ces types) attendu",
  "{0}.{1}: finite number expected": "{0}.{1} : nombre fini attendu",
  "{0}.enum: non-empty list expected": "{0}.enum : liste non vide attendue",
  "{0}.default: {1}": "{0}.default : {1}",
  "createState: function required": "createState : fonction requise",
  "ports: object required (possibly empty)":
    "ports : objet requis (éventuellement vide)",
  "ports.{0}: object expected": "ports.{0} : objet attendu",
  'ports.{0}.dpts: "any" or list of supported DPTs expected':
    'ports.{0}.dpts : "any" ou liste de DPT pris en charge attendu',
  'ports.{0}.channel: "required", "optional" or "none" expected':
    'ports.{0}.channel : "required", "optional" ou "none" attendu',
  'output: "switch", "motor" or "dim" expected':
    'output : "switch", "motor" ou "dim" attendu',
  'ports.{0}.direction: "in" or "out" expected':
    'ports.{0}.direction : "in" ou "out" attendu',
  "{0}: function expected": "{0} : fonction attendue",
  "create: function required": "create : fonction requise",
  "applyCommand: function required": "applyCommand : fonction requise",
  "advance: function expected": "advance : fonction attendue",
  'accepts: "switch", "motor" or "dim" expected':
    'accepts : "switch", "motor" ou "dim" attendu',
  "view identifier required": "identifiant de vue requis",
  "Equipment view “{0}” already registered":
    "Vue d'équipement « {0} » déjà enregistrée",
  "View “{0}”: size and render are required":
    "Vue « {0} » : size et render sont requis",
  "View “{0}”: size.width and size.height must be finite positive numbers":
    "Vue « {0} » : size.width et size.height doivent être des nombres finis positifs",
  "Backbone 0.0": "Dorsale 0.0",
  "Main line {0}.0": "Ligne principale {0}.0",
  "{0} is not a line: Z.0 is the main line of area Z and 0.0 the backbone; they appear through “topology” (area and line 1–15)":
    "{0} n'est pas une ligne : Z.0 est la ligne principale de la zone Z et 0.0 la dorsale ; elles apparaissent avec « topology » (zone et ligne 1–15)",
  "“areaCouplers” or “lineCouplers” expected":
    "« areaCouplers » ou « lineCouplers » attendu",
  "“ipRouter” and “topology.ip” both describe the IP network: keep “topology.ip”":
    "« ipRouter » et « topology.ip » décrivent tous deux le réseau IP : garder « topology.ip »",
  "with IP routers as line couplers, the IP network acts as main lines and backbone: remove “backbone” and “mainLines”":
    "avec des routeurs IP à la place des coupleurs de ligne, le réseau IP tient lieu de lignes principales et de dorsale : retirer « backbone » et « mainLines »",
  "line coupler {0}": "coupleur de ligne {0}",
  "KNXnet/IP router of area {0}": "routeur KNXnet/IP de la zone {0}",
  "area coupler {0}": "coupleur de zone {0}",
  "KNXnet/IP router of line {0}": "routeur KNXnet/IP de la ligne {0}",
  'several areas: one KNXnet/IP router per area ({0}); write “topology”: { "ip": "areaCouplers" } instead of “ipRouter”':
    'plusieurs zones : un routeur KNXnet/IP par zone ({0}) ; écrire « topology »: { "ip": "areaCouplers" } à la place de « ipRouter »',
  "a KNXnet/IP router is a coupler: its address is {0} (Z.L.0 for a line, Z.0.0 for an area)":
    "un routeur KNXnet/IP est un coupleur : son adresse est {0} (Z.L.0 pour une ligne, Z.0.0 pour une zone)",
  "area number 1–15 expected": "numéro de zone 1–15 attendu",
  "area {0} has no declared line": "la zone {0} n'a aucune ligne déclarée",
  "duplicate area {0}": "zone {0} en double",
  "no coupler at {0} (couplers of this installation: {1})":
    "aucun coupleur en {0} (coupleurs de cette installation : {1})",
  "duplicate coupler {0}": "coupleur {0} en double",
  "“filter”, “route” or “block” expected":
    "« filter », « route » ou « block » attendu",
  '{0} is on the backbone (0.0), absent from this installation: add an area or “topology”: { "backbone": true }':
    '{0} est sur la dorsale (0.0), absente de cette installation : ajouter une zone ou « topology »: { "backbone": true }',
  '{0} is on main line {1}, absent from this installation: add a line to area {2} or “topology”: { "mainLines": true }':
    '{0} est sur la ligne principale {1}, absente de cette installation : ajouter une ligne à la zone {2} ou « topology »: { "mainLines": true }',
  'an IP device requires an IP network (“topology”: { "ip": … })':
    'un participant IP nécessite un réseau IP (« topology »: { "ip": … })',
  "{0}: shutter stopped, stop/step has no effect (no slats)":
    "{0} : volet à l'arrêt, arrêt/pas sans effet (pas de lamelles)",
  "{0}: timer cannot be retriggered, telegram has no effect":
    "{0} : minuterie non redéclenchable, télégramme sans effet",
  "{0}: early switch-off of the timer not allowed, telegram 0 has no effect":
    "{0} : arrêt anticipé de la minuterie non autorisé, télégramme 0 sans effet",
  "Detection: hold time restarted, no new telegram":
    "Passage : temporisation relancée, pas de nouveau télégramme",
  "Detection: hold time not restarted": "Passage : temporisation non relancée",
  "{0}: switch-off warning": "{0} : préavis d'extinction",
  "flag “{0}” not simulated (W, T, R and U are; C is always active)":
    "flag « {0} » non simulé (W, T, R et U le sont ; C est toujours actif)",
  "USB interface: reading {0}": "Interface USB : lecture de {0}",
  "USB interface: writing {0}": "Interface USB : écriture de {0}",
  "U flag off: response ignored, value unchanged":
    "flag U désactivé : réponse ignorée, valeur inchangée",
  "R flag off: no response": "flag R désactivé : pas de réponse",
  "read on {0}: the response is sent on the object's sending address {1}":
    "lecture sur {0} : la réponse part sur l'adresse d'émission de l'objet, {1}",
  "unknown value: no response": "valeur inconnue : pas de réponse",
  "GroupValueRead, no data": "GroupValueRead, sans donnée",
  "{0}, payload byte 0x{1}": "{0}, octet utile 0x{1}",
  "requests the value of {0} (read).": "demande la valeur de {0} (lecture).",
  "responds {0} = {1} (object “{2}”, R flag).":
    "répond {0} = {1} (objet « {2} », flag R).",
  "sends {0} = {1} (write from the USB interface).":
    "émet {0} = {1} (écriture depuis l'interface USB).",
  "USB interface": "interface USB",
  Tools: "Outils",
  "Full screen": "Plein écran",
  "Exit full screen": "Quitter le plein écran",
  "Logic module disabled: output not sent":
    "Module logique désactivé : sortie non émise",
  "Logic result unchanged ({0}): no telegram":
    "Résultat logique inchangé ({0}) : pas de télégramme",
  "{0} reaches the threshold {1}: output set":
    "{0} atteint le seuil {1} : sortie activée",
  "{0} is below {1} (threshold − hysteresis): output reset":
    "{0} est sous {1} (seuil − hystérésis) : sortie désactivée",
  "{0}: wind alarm, shutter raised and locked":
    "{0} : alarme vent, volet remonté et verrouillé",
  "{0}: wind alarm ended, shutter released in place":
    "{0} : fin de l'alarme vent, volet libéré sur place",
  "{0}: wind alarm active, command ignored":
    "{0} : alarme vent active, commande ignorée",
  "Wind alarm": "Alarme vent",
  "Logic module: combines one-bit inputs (AND, OR, XOR, NOT) and sends the result; an optional enable object blocks the output.":
    "Module logique : combine des entrées 1 bit (ET, OU, OU exclusif, NON) et émet le résultat ; un objet de validation facultatif bloque la sortie.",
  "Logic input": "Entrée logique",
  "Logic output": "Sortie logique",
  Operation: "Opération",
  AND: "ET",
  OR: "OU",
  XOR: "OU exclusif",
  "NOT (first input)": "NON (première entrée)",
  "Send on change only": "Émettre seulement sur changement",
  "Weather station: sends measured wind speed, brightness, and temperature; sets one-bit outputs when wind or brightness thresholds are reached.":
    "Station météo : émet la vitesse du vent, la luminosité et la température mesurées ; active des sorties 1 bit quand les seuils de vent ou de luminosité sont atteints.",
  Brightness: "Luminosité",
  "Outdoor temperature": "Température extérieure",
  "Sun protection": "Protection solaire",
  "Wind alarm threshold": "Seuil d'alarme vent",
  "Wind alarm hysteresis": "Hystérésis de l'alarme vent",
  "Sun protection threshold": "Seuil de protection solaire",
  "Sun protection hysteresis": "Hystérésis de la protection solaire",
  Lux: "Luminosité (lux)",
  "Wind speed": "Vitesse du vent",
  "0/0/0 is the broadcast address and cannot be used as a group address":
    "0/0/0 est l'adresse de diffusion (broadcast) et ne peut pas servir d'adresse de groupe",
  Close: "Fermer",
  "Enlarge the monitor": "Agrandir le moniteur",
  "table: {0}": "table : {0}",
  "table: empty": "table : vide",
  "no filtering": "aucun filtrage",
  none: "aucun",
  press: "appui",
  "short press": "appui court",
  "long press": "appui long",
  toggle: "inverse",
  Write: "Écrire",
  Read: "Lire",
  "Write sends a GroupValueWrite; Read sends a GroupValueRead: each associated object with the R flag responds, on its own sending address.":
    "Écrire envoie un GroupValueWrite ; Lire envoie un GroupValueRead : chaque objet associé ayant le flag R répond, sur sa propre adresse d'émission.",
  "Response from": "Réponse de",
  "Reading {0}…": "Lecture de {0} en cours…",
  "No response for {0}: no associated object has the R flag, or a coupler filtered the read or the response.":
    "Aucune réponse pour {0} : aucun objet associé n'a le flag R, ou un coupleur a filtré la lecture ou la réponse.",
  read: "lecture",
  response: "réponse",
  Response: "Réponse",
  "a read carries no value: each associated object with the R flag responds, on its own sending address":
    "une lecture ne transporte pas de valeur : chaque objet associé ayant le flag R répond, sur sa propre adresse d'émission",
  broadcast: "broadcast",
  "group {0}": "groupe {0}",
  "DALI: {0} ← {1}": "DALI : {0} ← {1}",
  OFF: "OFF",
  "RECALL MAX LEVEL": "RECALL MAX LEVEL",
  "DAPC {0} ({1} %)": "DAPC {0} ({1} %)",
  "dimming stopped at {0} %": "arrêt de la variation à {0} %",
  "{0}: off, dimming does not switch on (parameter)":
    "{0} : éteint, la variation n'allume pas (paramètre)",
  "UP (dimming to {0} %)": "UP (variation vers {0} %)",
  "DOWN (dimming to {0} %)": "DOWN (variation vers {0} %)",
  "GO TO SCENE {0} ({1} %)": "GO TO SCENE {0} ({1} %)",
  "DALI: {0} faulty ballast(s) in group {1}":
    "DALI : {0} ballast(s) en défaut dans le groupe {1}",
  "DALI: no more fault in group {0}":
    "DALI : plus de défaut dans le groupe {0}",
  "DALI: broadcast ← {0}": "DALI : broadcast ← {0}",
  "DALI: broadcast ← DAPC {0} ({1} %)": "DALI : broadcast ← DAPC {0} ({1} %)",
  Alarm: "Alarme",
  "Relative dimming": "Variation relative",
  "No alarm": "Pas d'alarme",
  "Stop dimming": "Arrêt de la variation",
  "Increase by {0} %": "Augmenter de {0} %",
  "Decrease by {0} %": "Diminuer de {0} %",
  "“release” (release after a long press) requires “long”":
    "« release » (relâchement après un appui long) exige « long »",
  "dimming to {0} % in {1} s": "variation vers {0} % en {1} s",
  "level {0} %": "niveau {0} %",
  "interact: function expected": "interact : fonction attendue",
  "equipment action: {0}": "action sur l'équipement : {0}",
  "Ballast A{0} faulty (click to repair)":
    "Ballast A{0} en défaut (cliquer pour le réparer)",
  "Ballast A{0}: click to simulate a fault":
    "Ballast A{0} : cliquer pour simuler un défaut",
  "window open": "fenêtre ouverte",
  presence: "présence",
  preset: "présélection",
  "thermostat: {0} mode ({1}), setpoint {2} °C":
    "thermostat : mode {0} ({1}), consigne {2} °C",
  "thermostat: setpoint {0} °C": "thermostat : consigne {0} °C",
  comfort: "confort",
  standby: "veille",
  economy: "économie",
  protection: "protection",
  auto: "auto",
  "thermostat: no temperature (room or “externalTemp” object): no control":
    "thermostat : aucune température (pièce ou objet « externalTemp ») : pas de régulation",
  "control value received: emergency mode ended":
    "commande reçue : fin du programme de secours",
  "no control value received: emergency mode at {0} %":
    "aucune grandeur de commande reçue : programme de secours à {0} %",
  "heatOutput: function expected": "heatOutput : fonction attendue",
  "Window/Door": "Fenêtre/Porte",
  "Heating/Cooling": "Chauffage/Refroidissement",
  "HVAC mode": "Mode de fonctionnement HVAC",
  "Temperature difference": "Écart de température",
  Auto: "Auto",
  Comfort: "Confort",
  Standby: "Veille",
  Economy: "Économie",
  Protection: "Protection",
  "Reserved ({0})": "Réservé ({0})",
  "{0}, payload bytes 0x{1}": "{0}, données utiles 0x{1}",
  "duplicate room “{0}”": "pièce « {0} » en double",
  "number {0}…{1} expected": "nombre {0}…{1} attendu",
  "integer expected": "entier attendu",
  "unknown room “{0}” (declared rooms: {1})":
    "pièce inconnue « {0} » (pièces déclarées : {1})",
  "heated or cooled room required (“room”)":
    "pièce chauffée ou refroidie à indiquer (« room »)",
  "{0}: window opened": "{0} : fenêtre ouverte",
  "{0}: window closed": "{0} : fenêtre fermée",
  "{0}: outside temperature {1} °C": "{0} : température extérieure {1} °C",
  "{0}.deviceState: {1}": "{0}.deviceState : {1}",
  "Cooling emitter: valve {0} % open":
    "Émetteur de froid : vanne ouverte à {0} %",
  "Radiator: valve {0} % open": "Radiateur : vanne ouverte à {0} %",
  valve: "vanne",
  setpoint: "consigne",
  cooling: "refroidissement",
  heating: "chauffage",
  Rooms: "Pièces",
  "physical quantities; thermal time compressed":
    "grandeurs physiques ; temps thermique compressé",
  "Close window": "Fermer la fenêtre",
  "Open window": "Ouvrir la fenêtre",
  "Out.": "Ext.",
  "Lower outside temperature": "Baisser la température extérieure",
  "Raise outside temperature": "Monter la température extérieure",
  "{0}.enumTitles: one label (text) per “enum” value expected":
    "{0}.enumTitles : un libellé (texte) par valeur de « enum » attendu",
  "{0} ballasts from A{1} would reach A{2}: DALI short addresses stop at 63":
    "{0} ballasts à partir de A{1} iraient jusqu'à A{2} : les adresses courtes DALI s'arrêtent à 63",
  "checkParameters: function expected": "checkParameters : fonction attendue",
  "write to {0} refused: {1}": "écriture de {0} refusée : {1}",
  "interact must return the state (object)":
    "interact doit renvoyer l'état (objet)",
  "equipment {0}/{1} ({2}).interact({3}): {4}":
    "équipement {0}/{1} ({2}).interact({3}) : {4}",
};
