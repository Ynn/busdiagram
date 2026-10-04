// French locale catalog for English source messages.
export const frMessages: Record<string, string> = {
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
  "Slat angle estimated by the actuator ({0} %)":
    "Angle des lamelles estimé par l'actionneur ({0} %)",
  "Slats est.": "Lam. est.",
  shed: "délestée",
  Energy: "Énergie",
  "Total power": "Puissance totale",
  "Metering send interval": "Intervalle d'envoi des mesures",
  "Power send threshold": "Seuil d'envoi de la puissance",
  "Energy time scale": "Échelle de temps de l'énergie",
  "Rated power": "Puissance nominale",
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
  "Warmest colour temperature": "Température de couleur la plus chaude",
  "Coldest colour temperature": "Température de couleur la plus froide",
  "Initial colour temperature": "Température de couleur initiale",
  "Normally closed relay: the load is powered while the channel is off.":
    "Relais normalement fermé : la charge est alimentée tant que la voie est à l'arrêt.",
  "{0} links DPT {1} and DPT {2}, whose values 0 and 1 have opposite meanings; check the receiving objects.":
    "{0} relie le DPT {1} et le DPT {2}, dont les valeurs 0 et 1 ont des sens opposés ; vérifiez les objets récepteurs.",
  "Configuration check": "Contrôle de configuration",
  "Normally open": "Normalement ouvert",
  "Normally closed": "Normalement fermé",
  Command: "Commande",
  "Status feedback": "Retour d'état",
  Scene: "Scène",
  Forcing: "Forçage",
  "Up/down": "Montée/descente",
  "Stop/step": "Arrêt/pas",
  Display: "Affichage",
  Timer: "Minuterie",
  "Status feedback delay": "Délai du retour d'état",
  "Configured travel time": "Course paramétrée",
  "Actual travel time": "Course réelle",
  "Dimmer: switching, relative (3.007) and absolute (5.001) dimming, status feedback.":
    "Variateur : commutation, variation relative (3.007) et absolue (5.001), retours d'état.",
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
  "Long press duration": "Durée d'appui long",
  Presence: "Présence",
  "Push button or sensor: each gesture writes a value into a local object, then transmits it.":
    "Poussoir ou capteur : chaque geste écrit une valeur dans un objet local puis l'émet.",
  "Switch actuator: each channel drives a relay; optional timer and status feedback.":
    "Actionneur de commutation : chaque canal pilote un relais ; minuterie et retour d'état facultatifs.",
  Window: "Fenêtre",
  "PWM cycle time": "Période PWM",
  "Send on change": "Émission sur variation",
  Invert: "Inverser",
  Temperature: "Température",
  "Cyclic sending": "Émission cyclique",
  Power: "Puissance",
  "Set value": "Valeur paramétrée",
  "Last value": "Dernière valeur",
  On: "Marche",
  Off: "Arrêt",
  Toggle: "Inversion",
  Heating: "Chauffage",
  Cooling: "Refroidissement",
  "Send on start": "Émission au démarrage",
  "Switch on by brightness value": "Allumage par valeur de luminosité",
  "Switch off by brightness value": "Extinction par valeur de luminosité",
  "{0}: off, a brightness value does not switch on (parameter)":
    "{0} : éteint, une valeur de luminosité n'allume pas (paramètre)",
  "{0}: a value of 0 does not switch off (parameter): minimum level {1} %":
    "{0} : une valeur 0 n'éteint pas (paramètre) : niveau minimum {1} %",
  "{0} links DPT {1} ({2}) and DPT {3} ({4}): the same bytes mean different values; each receiver interprets them with its own DPT.":
    "{0} relie le DPT {1} ({2}) et le DPT {3} ({4}) : les mêmes octets désignent des valeurs différentes ; chaque récepteur les interprète avec son propre DPT.",
  "PSU {0} mA": "Alim. {0} mA",
  PSU: "Alim.",
  "Bus power supply with choke": "Alimentation de bus avec self",
  "{0} (DPT not simulated)": "{0} (DPT non simulé)",
  "DPT {0} is not simulated: only objects of a device that shows values without using them ({1}) may use it":
    "le DPT {0} n'est pas simulé : seuls les objets d'un appareil qui montre des valeurs sans les utiliser ({1}) peuvent l'utiliser",
  "DPT {0} is not simulated: its value stays unknown until a telegram is received":
    "le DPT {0} n'est pas simulé : sa valeur reste inconnue jusqu'à la réception d'un télégramme",
  "“{0}” is not a main group (0–31) or a middle group (0–31/0–7)":
    "« {0} » n'est ni un groupe principal (0–31) ni un groupe médian (0–31/0–7)",
  "duplicate group range {0}": "groupe {0} en double",
  "Start-up send delay": "Délai d'émission au démarrage",
  "Loading KNX scenario…": "Chargement du scénario KNX…",
  "Could not load {0} ({1}).": "Chargement de {0} impossible ({1}).",
  "Invalid scenario:": "Scénario invalide :",
  "Simulation stopped:": "Simulation interrompue :",
  Reset: "Réinitialiser",
  "Open in the designer": "Ouvrir dans le designer",
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
  "Scene A/B": "Scène A/B",
  "Direction control": "Commande de direction",
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
  "no bus voltage on the way: not received":
    "pas de tension bus sur le trajet : non reçu",
  "port “{0}” takes one object per channel; “{1}” already uses it on channel “{2}”":
    "le port « {0} » accepte un seul objet par canal ; « {1} » l'utilise déjà sur le canal « {2} »",
  "port “{0}” takes one object; “{1}” already uses it":
    "le port « {0} » accepte un seul objet ; « {1} » l'utilise déjà",
  "payload invalid for DPT {0}: value unchanged":
    "données invalides pour le DPT {0} : valeur inchangée",
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
  "{0}: no preset for scene {1}, command ignored":
    "{0} : aucun préréglage pour la scène {1}, commande ignorée",
  "{0}: scene {1} at {2} %, limited to {3} %":
    "{0} : scène {1} à {2} %, limitée à {3} %",
  "The scenario must be a JSON object.": "Le scénario doit être un objet JSON.",
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
  "{0} is associated with objects of different sizes: {1} here, {2} elsewhere":
    "{0} est associée à des objets de tailles différentes : {1} ici, {2} ailleurs",
  "strictly positive number expected": "nombre strictement positif attendu",
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
  "{0} and {1}": "{0} et {1}",
  " (line {0}, column {1})": " (ligne {0}, colonne {1})",
  "Invalid JSON in {0}{1}: {2}": "JSON invalide dans {0}{1} : {2}",
  "the content of <bus-diagram>": "le contenu de <bus-diagram>",
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
  'ports.{0}.direction: "in", "out" or "both" expected':
    'ports.{0}.direction : "in", "out" ou "both" attendu',
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
  "Wind alarm": "Alarme vent",
  Brightness: "Luminosité",
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
  "checkParameters: function expected": "checkParameters : fonction attendue",
  "write to {0} refused: {1}": "écriture de {0} refusée : {1}",
  "interact must return the state (object)":
    "interact doit renvoyer l'état (objet)",
  "equipment {0}/{1} ({2}).interact({3}): {4}":
    "équipement {0}/{1} ({2}).interact({3}) : {4}",
  "object, list of objects, or null expected":
    "objet, liste d'objets ou null attendu",
  "a shutter output drives one motor; connect each shutter to its own output":
    "une sortie de store commande un seul moteur ; raccorder chaque store à sa propre sortie",
  Function: "Fonction",
  Scenes: "Scènes",
  "Limits and transitions": "Limites et transitions",
  "Switching by dimming or by value": "Commutation par variation ou par valeur",
  "Group objects": "Objets de groupe",
  // Shared by the heating actuator, the room thermostat, the radiator, and the fan coil.
  "Heating control value": "Commande chauffage",
  "Heating / cooling": "Chauffage / refroidissement",
  "Cooling control value": "Commande refroidissement",
  valve: "vanne",
  "Valve travel time": "Course de la vanne",
  "Valve open when de-energised": "Vanne ouverte hors tension",
  "Initial opening": "Ouverture au départ",
  "parameterLayout: object expected": "parameterLayout : objet attendu",
  "{0}: list expected": "{0} : liste attendue",
  "{0}.{1}: unknown “{2}”": "{0}.{1} : « {2} » inconnu",
  "{0}.initialState: only on channel pages":
    "{0}.initialState : seulement sur les pages de canal",
  "{0}: text expected": "{0} : texte attendu",
  "{0}.scenes: true expected": "{0}.scenes : true attendu",
  "{0}.when: object expected": "{0}.when : objet attendu",
  "{0}.when.groupObject: unknown “{1}”":
    "{0}.when.groupObject : « {1} » inconnu",
  "{0}.when.parameter: unknown “{1}”": "{0}.when.parameter : « {1} » inconnu",
  "{0}: unknown kind of item": "{0} : type d'élément inconnu",
  "{0}.id: text expected": "{0}.id : texte attendu",
  "{0}.id: duplicate “{1}”": "{0}.id : « {1} » en double",
  "{0}.title: text expected": "{0}.title : texte attendu",
  "{0}.when.{1}: list of values expected":
    "{0}.when.{1} : liste de valeurs attendue",
  "{0}.when: “is” or “not” expected": "{0}.when : « is » ou « not » attendu",
  "{0}.id: letters, digits, “-”, or “_” expected":
    "{0}.id : lettres, chiffres, « - » ou « _ » attendus",
  "the device has already answered this read":
    "l'appareil a déjà répondu à cette lecture",
  "segment {0}: {1} devices and {2} couplers or repeaters, more than the 64 connections of a TP1 segment; use TP1-256 devices or a line repeater or segment coupler":
    "segment {0} : {1} participants et {2} coupleurs ou répéteurs, plus que les 64 raccordements d'un segment TP1 ; utiliser des participants TP1-256, ou un répéteur de ligne ou un coupleur de segment",
  "{0}: scene storing disabled, scene {1} unchanged":
    "{0} : mémorisation des scènes désactivée, scène {1} inchangée",
  "Scene control": "Commande de scène",
  "DPT 18.001: bit 6 is reserved; use 0–63 to recall a scene, 128–191 to store it":
    "DPT 18.001 : le bit 6 est réservé ; 0–63 rappelle une scène, 128–191 la mémorise",
  "Store scene {0}": "Mémoriser la scène {0}",
  "behavior {0} takes its keys from its channels; remove “buttons”":
    "le comportement {0} prend ses touches dans ses canaux ; retirer « buttons »",
  "not forwarded, no bus voltage on the other side":
    "non transmis, pas de tension de bus de l'autre côté",
  "no bus voltage: no telegram": "pas de tension de bus : aucun télégramme",
  "no bus voltage: not received": "pas de tension de bus : non reçu",
  "{0}: no bus voltage, the device does not react":
    "{0} : pas de tension de bus, le participant ne réagit pas",
  "line {0}": "ligne {0}",
  "main line {0}.0": "ligne principale {0}.0",
  "line {0}, second segment": "ligne {0}, second segment",
  "Bus voltage restored on {0}": "Tension du bus rétablie sur {0}",
  "Bus voltage cut on {0}": "Tension du bus coupée sur {0}",
  Lock: "Verrouillage",
  "When locked": "Au verrouillage",
  "Scene storing": "Mémorisation des scènes",
  "On bus voltage recovery": "Au retour de la tension du bus",
  "Long press": "Appui long",
  "Dimming operation": "Mode de variation",
  "One key: short toggles, long dims in turn":
    "Une touche : court inverse, long varie en alternance",
  "Brighter: short on, long brighter":
    "Plus clair : court marche, long plus clair",
  "Darker: short off, long darker":
    "Plus sombre : court arrêt, long plus sombre",
  "Blind operation": "Mode du store",
  "One key: direction alternates": "Une touche : sens alterné",
  "Up key": "Touche montée",
  "Down key": "Touche descente",
  "{0} links DPT 17.001 and DPT 18.001: recalls are read alike, but a 17.001 object reads a storing telegram (learn bit) as a recall.":
    "{0} relie le DPT 17.001 et le DPT 18.001 : les rappels se lisent de la même façon, mais un objet 17.001 lit un télégramme de mémorisation (bit d'apprentissage) comme un rappel.",
  "click to cut the bus voltage": "cliquer pour couper la tension du bus",
  "no bus voltage: click to restore it":
    "pas de tension de bus : cliquer pour la rétablir",
  "contact input: click for a short press, hold for a long press":
    "entrée de contact : cliquer pour un appui court, maintenir pour un appui long",
  "{0}: DALI scenes go from 1 to 16, scene {1} not stored":
    "{0} : les scènes DALI vont de 1 à 16, scène {1} non mémorisée",
  "{0}: scene {1} stored ({2} %)": "{0} : scène {1} mémorisée ({2} %)",
  "switch-on delay: on in {0} s":
    "retard à l'enclenchement : marche dans {0} s",
  "switch-off delay: off in {0} s":
    "retard au déclenchement : arrêt dans {0} s",
  "timer: off in {0} s": "minuterie : arrêt dans {0} s",
  Delay: "Retard",
  "switching on in {0} s": "allumage dans {0} s",
  "standard frame, normal priority": "trame standard, priorité normale",
  "standard frame, urgent priority": "trame standard, priorité urgente",
  "C flag off: no communication, no telegram":
    "indicateur C désactivé : pas de communication, aucun télégramme",
  "C flag off: the message is not handled":
    "indicateur C désactivé : le message n'est pas traité",
  "unknown flag “{0}” (C, R, W, T, U and I are simulated)":
    "indicateur « {0} » inconnu (C, R, W, T, U et I sont simulés)",
  "“low”, “normal” or “urgent” expected (system priority is reserved for management)":
    "« low », « normal » ou « urgent » attendu (la priorité système est réservée à la gestion)",
  "segment {0} has no bus power supply: each TP segment needs its own, with its choke":
    "le segment {0} n'a pas d'alimentation de bus : chaque segment TP a besoin de la sienne, avec sa self",
  "channelObjects.parameter: channel parameter expected":
    "channelObjects.parameter : paramètre de canal attendu",
  "channelObjects.values: object expected":
    "channelObjects.values : objet attendu",
  "channelObjects.values.{0}: list expected":
    "channelObjects.values.{0} : liste attendue",
  "channelObjects.values.{0}: unknown channel port “{1}”":
    "channelObjects.values.{0} : port de canal « {1} » inconnu",
  "channelObjects.values.{0}: DPT “{1}” not accepted by port “{2}”":
    "channelObjects.values.{0} : DPT « {1} » non accepté par le port « {2} »",
  'required: add "formatVersion": 2 at the root of the scenario':
    'requis : ajouter "formatVersion": 2 à la racine du scénario',
  "unknown format version “{0}” (supported version: 2)":
    "version de format « {0} » inconnue (version prise en charge : 2)",
  "flags { W, T } required": "indicateurs { W, T } requis",
  "No reaction": "Aucune réaction",
  "When unlocked": "Au déverrouillage",
  "On bus voltage failure": "À la coupure de la tension du bus",
  "On at start": "Allumé au départ",
  "Bus voltage": "Tension du bus",
  Unchanged: "Inchangé",
  "Fixed level": "Niveau fixe",
  "Level on bus voltage failure": "Niveau à la coupure de la tension du bus",
  "Level before the failure": "Niveau avant la coupure",
  "End of forcing": "Fin du forçage",
  "Forcing and lock": "Forçage et verrouillage",
  "Intrusion alarm": "Alarme intrusion",
  "Fire alarm": "Alarme incendie",
  "“normallyOpen” or “normallyClosed” expected":
    "« normallyOpen » ou « normallyClosed » attendu",
  "Rain alarm": "Alarme pluie",
  "Frost alarm": "Alarme gel",
  "Presence detector": "Détecteur de présence",
  "Heating effect (K)": "Effet de chauffage (K)",
  system: "système",
  normal: "normale",
  urgent: "urgente",
  low: "basse",
  "other service": "autre service",
  "Frame type": "Type de trame",
  "L_Data standard frame": "trame L_Data standard",
  "other frame": "autre trame",
  Repetition: "Répétition",
  "not repeated": "non répétée",
  Fixed: "Fixe",
  "always 1": "toujours 1",
  "always 0": "toujours 0",
  Subgroup: "Sous-groupe",
  "Address type · routing counter · length":
    "Type d'adresse · compteur de routage · longueur",
  "Address type": "Type d'adresse",
  "group address": "adresse de groupe",
  "individual address": "adresse individuelle",
  "Routing counter": "Compteur de routage",
  "{0} octets after this one": "{0} octets après celui-ci",
  "{0} octet after this one": "{0} octet après celui-ci",
  "TPCI · APCI": "TPCI · APCI",
  TPCI: "TPCI",
  "data, group (T_Data_Group)": "données, groupe (T_Data_Group)",
  other: "autre",
  "APCI (high bits)": "APCI (bits de poids fort)",
  "APCI · data": "APCI · données",
  "APCI (low bits)": "APCI (bits de poids faible)",
  Data: "Données",
  Unused: "Inutilisés",
  "no data for a read": "pas de données pour une lecture",
  "value {0}, carried in the APCI octet (6 bits at most)":
    "valeur {0}, portée dans l'octet APCI (6 bits au plus)",
  "0: the value follows in its own octets":
    "0 : la valeur suit dans ses propres octets",
  "Check octet": "Octet de contrôle",
  "odd parity per column": "parité impaire par colonne",
  "Data octet {0}": "Octet de données {0}",
  "value of DPT {0}": "valeur du DPT {0}",
  backbone: "ligne de zone",
  Frame: "Trame",
  Bits: "Bits",
  "TP1 signal": "Signal TP1",
  "Telegram details": "Détails du télégramme",
  "Frame on": "Trame sur",
  "Each coupler crossed lowers the routing counter: the routing octet and the check octet change from one segment to the next.":
    "Chaque coupleur traversé abaisse le compteur de routage : l'octet de routage et l'octet de contrôle changent d'un segment à l'autre.",
  "Octets of the frame": "Octets de la trame",
  "KNX TP1 · 9600 bit/s · 1 bit = 104 µs":
    "KNX TP1 · 9600 bit/s · 1 bit = 104 µs",
  "Character: start bit, 8 data bits (least significant first), even parity, stop bit":
    "Caractère : bit de start, 8 bits de données (poids faible en premier), parité paire, bit de stop",
  "{0}, RC {1}, {2}": "{0}, RC {1}, {2}",
  "Select an octet to see what each of its bits means.":
    "Sélectionnez un octet pour voir ce que signifie chacun de ses bits.",
  "bit {0}": "bit {0}",
  "bits {0}–{1}": "bits {0}–{1}",
  "Sub-fields": "Sous-champs",
  "TP1 signal of the frame": "Signal TP1 de la trame",
  Logical: "Logique",
  Bus: "Bus",
  "idle {0} bit times": "repos {0} temps de bit",
  "{0} bit times": "{0} temps de bit",
  "S start · b0–b7 data, least significant first · P even parity · Stop stop bit · sep. 2 bit times between characters":
    "S start · b0–b7 données, poids faible en premier · P parité paire · Stop bit de stop · sép. 2 temps de bit entre caractères",
  "Data bits 7 … 0: check octet (columns)":
    "Bits de données 7 … 0 : octet de contrôle (colonnes)",
  "Character parity": "Parité du caractère",
  "S: start bit, always 0": "S : bit de start, toujours 0",
  "Stop: stop bit, always 1": "Stop : bit de stop, toujours 1",
  "Character separation: 2 bit times at rest (1) before the start bit of the next character":
    "Séparation entre caractères : 2 temps de bit au repos (1) avant le bit de start du caractère suivant",
  "sep.": "sép.",
  "Each character is a start bit (0), the eight data bits, an even parity bit, and a stop bit (1); 2 bit times at rest separate it from the next character of the frame.":
    "Chaque caractère se compose d'un bit de start (0), des huit bits de données, d'un bit de parité paire et d'un bit de stop (1) ; 2 temps de bit au repos le séparent du caractère suivant de la trame.",
  "Frame: {0} octets, sent as {1} TP1 characters of 11 bits, + {2} separations of 2 bit times = {3} bit times = {4} ms":
    "Trame : {0} octets, transmis comme {1} caractères TP1 de 11 bits, + {2} séparations de 2 temps de bit = {3} temps de bit = {4} ms",
  "P: even parity, {0}: the 8 data bits and P hold an even number of 1":
    "P : parité paire, {0} : les 8 bits de données et P contiennent un nombre pair de 1",
  "b{0}: bit {1} of {2} (weight {3}), sent in position {4} after the start bit":
    "b{0} : bit {1} de {2} (poids {3}), envoyé en position {4} après le bit de start",
  "Octet {0} is conventionally written from b7 to b0: {1}. On the TP1 bus, its data bits are sent in the opposite order: b0 first, b7 last.":
    "L'octet {0} s'écrit par convention de b7 à b0 : {1}. Sur le bus TP1, ses bits de données sont envoyés dans l'ordre inverse : b0 d'abord, b7 en dernier.",
  Written: "Écrit",
  Sent: "Envoyé",
  "P = 1: the data bits hold {0} ones, P makes the count even.":
    "P = 1 : les bits de données contiennent {0} bits à 1, P rend le compte pair.",
  "P = 0: the data bits hold {0} ones, already even.":
    "P = 0 : les bits de données contiennent {0} bits à 1, déjà pair.",
  "Schematic TP1 waveform, not an electrical simulation. A logical 0 is a voltage drop of about 35 µs followed by an equalisation; a logical 1 leaves the bus at rest, which is why 0 wins when two devices send at once. The acknowledgement that the receivers send 15 bit times after the frame is drawn for illustration: the model does not simulate it.":
    "Forme d'onde TP1 schématique, pas une simulation électrique. Un 0 logique est une chute de tension d'environ 35 µs suivie d'une compensation ; un 1 logique laisse le bus au repos, c'est pourquoi le 0 l'emporte quand deux appareils émettent en même temps. L'acquittement que les récepteurs envoient 15 temps de bit après la trame est dessiné à titre d'illustration : le modèle ne le simule pas.",
  "Column of bit {0}": "Colonne du bit {0}",
  ones: "nombre de 1",
  "odd already: 0": "déjà impair : 0",
  "even: 1 to make it odd": "pair : 1 pour le rendre impair",
  "Two checks cross. Each row: the parity bit P, sent on the bus right after the 8 data bits of each character, makes the number of 1 even in that character. Each data column (7 to 0): the check octet, sent as the last character, makes the number of 1 odd over the whole frame. Column P is not covered by the check octet.":
    "Deux contrôles se croisent. Chaque ligne : le bit de parité P, envoyé sur le bus juste après les 8 bits de données de chaque caractère, rend pair le nombre de 1 de ce caractère. Chaque colonne de données (7 à 0) : l'octet de contrôle, envoyé comme dernier caractère, rend impair le nombre de 1 sur l'ensemble de la trame. La colonne P n'est pas couverte par l'octet de contrôle.",
  "Parity bit of each character": "Bit de parité de chaque caractère",
  "Even parity of this octet, sent after its 8 data bits":
    "Parité paire de cet octet, envoyée après ses 8 bits de données",
  "Column P is not part of the check octet: each P only covers its own row. A single wrong bit breaks the parity of its row and of its column, so the receiver sees it twice.":
    "La colonne P n'entre pas dans l'octet de contrôle : chaque P ne couvre que sa propre ligne. Un seul bit erroné casse la parité de sa ligne et celle de sa colonne : le récepteur le voit deux fois.",
  "Click a column to follow its calculation.":
    "Cliquez sur une colonne pour suivre son calcul.",
  "Column {0}: {1} ones, already odd, so the check bit is 0.":
    "Colonne {0} : {1} bits à 1, déjà impair, donc le bit de contrôle vaut 0.",
  "Column {0}: {1} ones, even, so the check bit is 1, which makes {2}.":
    "Colonne {0} : {1} bits à 1, pair, donc le bit de contrôle vaut 1, ce qui fait {2}.",
  "Equivalent calculation: XOR of the octets, then every bit inverted (NOT).":
    "Calcul équivalent : OU exclusif (XOR) des octets, puis inversion de chaque bit (NON).",
  "A receiver checks the parity of every character and computes the check octet again from the octets it received. If either check fails, the frame is invalid and is not acknowledged.":
    "Un récepteur vérifie la parité de chaque caractère et recalcule l'octet de contrôle à partir des octets reçus. Si l'un de ces contrôles échoue, la trame est invalide et n'est pas acquittée.",
  "a read carries no value: each device answers once, from its first associated object with the R flag and a known value, on that object's sending address":
    "une lecture ne porte pas de valeur : chaque appareil répond une seule fois, par son premier objet associé ayant l'indicateur R et une valeur connue, sur l'adresse d'émission de cet objet",
  "Details of this octet": "Détails de cet octet",
  "Frame, bits, TP1 signal, and checksum of this telegram":
    "Trame, bits, signal TP1 et somme de contrôle de ce télégramme",
  Details: "Détails",
  "With the bus idle before it and the acknowledgement: {0} ms":
    "Avec le repos du bus avant et l'acquittement : {0} ms",
  "{0} is used on both sides: it is in the filter table":
    "{0} est utilisée des deux côtés : elle figure dans la table de filtrage",
  "{0} is not used on both sides: it is not in the filter table":
    "{0} n'est pas utilisée des deux côtés : elle ne figure pas dans la table de filtrage",
  "set to forward every group telegram":
    "réglé pour transmettre tous les télégrammes de groupe",
  "set to block every group telegram":
    "réglé pour bloquer tous les télégrammes de groupe",
  "no filter table: a repeater forwards every telegram":
    "pas de table de filtrage : un répéteur transmet tous les télégrammes",
  "routing counter at 0: the telegram is not forwarded":
    "compteur de routage à 0 : le télégramme n'est pas transmis",
  "no bus voltage on the other side": "pas de tension bus de l'autre côté",
  "Remove this trace": "Retirer cette trace",
  Timeline: "Chronogramme",
  "simulated time · steps: object values · curves: physical quantities · marks: telegrams":
    "temps simulé · escaliers : valeurs d'objets · courbes : grandeurs physiques · marques : télégrammes",
  "Add a trace": "Ajouter une trace",
  "object, room, or output…": "objet, pièce ou sortie…",
  "{0} linked objects · send on it (C, T, sending address): {1} · written by it (C, W): {2}":
    "{0} objets liés · émettent dessus (C, T, adresse d'émission) : {1} · écrits par elle (C, W) : {2}",
  Clear: "Effacer",
  "Show the objects linked to this address in the diagram":
    "Montrer dans le schéma les objets liés à cette adresse",
};
