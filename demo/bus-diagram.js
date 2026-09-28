/*! BusDiagram v0.1.2 | AGPL-3.0-only | third-party notices: THIRD_PARTY_NOTICES.txt */
var BusDiagram=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=`0.1.2`,n=new Map([[`fr`,{"Clock master: the scenario declares no clock":`Horloge maîtresse : le scénario ne déclare pas d'horloge`,"Time switch: program of {0} applies ({1})":`Programmateur : le programme de {0} s'applique ({1})`,"Time switch: the scenario declares no clock":`Programmateur : le scénario ne déclare pas d'horloge`,"Time switch: entries ignored: {0}":`Programmateur : entrées ignorées : {0}`,"Time switch: {0} → {1}":`Programmateur : {0} → {1}`,"Time of day":`Heure`,Date:`Date`,"{0} is not a valid date (YYYYMMDD)":`{0} n'est pas une date valide (AAAAMMJJ)`,Mon:`lun.`,Tue:`mar.`,Wed:`mer.`,Thu:`jeu.`,Fri:`ven.`,Sat:`sam.`,Sun:`dim.`,"“{0}” is not a local date and time (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)":`« {0} » n'est pas une date et heure locale (AAAA-MM-JJTHH:MM ou AAAA-MM-JJTHH:MM:SS)`,"number > 0 and ≤ 3600 expected":`nombre > 0 et ≤ 3600 attendu`,"Clock set to {0}":`Horloge réglée à {0}`,"Simulated clock (×{0})":`Horloge simulée (×{0})`,"Clock time":`Heure de l'horloge`,Set:`Régler`,"Set the simulated clock":`Régler l'horloge simulée`,"Set time":`Régler l'heure`,"Time window from":`Plage horaire à partir de`,"Time window to":`Plage horaire jusqu'à`,"Clock master: sends the time of day (10.001) and the date (11.001) of the simulated clock at a fixed period and after the clock is set.":`Horloge maîtresse : émet l'heure (10.001) et la date (11.001) de l'horloge simulée à période fixe et après un réglage de l'horloge.`,"Send period":`Période d'envoi`,"Weekly time switch: sends the programmed value on its output objects at the programmed times of the simulated clock.":`Programmateur hebdomadaire : émet la valeur programmée sur ses objets de sortie aux heures programmées de l'horloge simulée.`,"Weekly program":`Programme hebdomadaire`,"Send current state on start":`Émettre l'état courant au démarrage`,"{0}: no slats configured, slat command ignored":`{0} : aucune lamelle configurée, commande de lamelles ignorée`,"Slat angle estimated by the actuator ({0} %)":`Angle des lamelles estimé par l'actionneur ({0} %)`,"Slats est.":`Lamelles est.`,"Actual blind: {0} %, slats {1} %":`Store réel : {0} %, lamelles {1} %`,slats:`lamelles`,"Slat angle setpoint":`Consigne d'angle des lamelles`,"Slat angle feedback":`Retour d'angle des lamelles`,"Configured slat rotation time":`Durée de rotation des lamelles paramétrée`,"Slat step":`Pas de lamelle`,"Estimated slat angle at start":`Angle des lamelles estimé au départ`,"Actual slat rotation time":`Durée réelle de rotation des lamelles`,"Actual slat angle at start":`Angle réel des lamelles au départ`,"{0}: output shed, command stored without effect":`{0} : sortie délestée, commande mémorisée sans effet`,"Total power {0} W reaches the limit {1} W":`La puissance totale {0} W atteint la limite {1} W`,"Total power {0} W is back below {1} W":`La puissance totale {0} W repasse sous {1} W`,"{0}: switched off by load shedding":`{0} : coupée par délestage`,"{0}: load shedding ended, stored command applied":`{0} : fin du délestage, commande mémorisée appliquée`,shed:`délestée`,"Appliance: {0} W rated":`Appareil : {0} W nominaux`,"Switch actuator: each channel drives a relay; optional timer, status feedback, and power and energy metering.":`Actionneur de commutation : chaque voie commande un relais ; minuterie, retour d'état et mesure de puissance et d'énergie en option.`,Energy:`Énergie`,"Total power":`Puissance totale`,"Power limit":`Limite de puissance`,"Metering send interval":`Intervalle d'envoi des mesures`,"Power send threshold":`Seuil d'envoi de la puissance`,"Energy time scale":`Échelle de temps de l'énergie`,"Total power limit":`Limite de puissance totale`,"Minimum shedding time":`Durée minimale de délestage`,"Power limit hysteresis":`Hystérésis de la limite de puissance`,"Shed on power limit":`Délester sur limite de puissance`,"Rated power":`Puissance nominale`,Appliance:`Appareil`,"{0} reaches the alarm threshold {1}: alarm set":`{0} atteint le seuil d'alarme {1} : alarme activée`,"{0} is below {1}: alarm reset":`{0} est sous {1} : alarme désactivée`,"Ventilation step kept for its minimum time":`Palier de ventilation maintenu pendant sa durée minimale`,"CO₂ {0} ppm: ventilation step {1}":`CO₂ {0} ppm : palier de ventilation {1}`,"{0}: {1} K limited to {2} K by the channel range":`{0} : {1} K limité à {2} K par la plage de la voie`,State:`État`,Humidity:`Humidité`,"Air quality":`Qualité de l'air`,"Colour temperature":`Température de couleur`,"Active energy":`Énergie active`,Active:`Actif`,Inactive:`Inactif`,Inverted:`Inversé`,"Not inverted":`Non inversé`,"Fan: {0} %":`Ventilateur : {0} %`,"Dimmer: switching, relative (3.007) and absolute (5.001) dimming, tunable white (7.600), status feedback.":`Variateur : commutation, variation relative (3.007) et absolue (5.001), blanc réglable (7.600), retours d'état.`,"Colour temperature status":`Retour de température de couleur`,"Warmest colour temperature":`Température de couleur la plus chaude`,"Coldest colour temperature":`Température de couleur la plus froide`,"Initial colour temperature":`Température de couleur initiale`,"Air quality sensor: sends measured temperature, relative humidity, and CO₂; sets alarms at thresholds and controls ventilation in three steps.":`Capteur de qualité d'air : émet la température, l'humidité relative et le CO₂ mesurés ; active des alarmes à des seuils et commande la ventilation en trois paliers.`,"Relative humidity":`Humidité relative`,"CO₂":`CO₂`,"CO₂ alarm":`Alarme CO₂`,"Humidity alarm":`Alarme humidité`,"Ventilation control value":`Valeur de commande de ventilation`,"CO₂ alarm threshold":`Seuil d'alarme CO₂`,"CO₂ alarm hysteresis":`Hystérésis de l'alarme CO₂`,"Humidity alarm threshold":`Seuil d'alarme humidité`,"Humidity alarm hysteresis":`Hystérésis de l'alarme humidité`,"Threshold step 0 ↔ 1":`Seuil palier 0 ↔ 1`,"Threshold step 1 ↔ 2":`Seuil palier 1 ↔ 2`,"Threshold step 2 ↔ 3":`Seuil palier 2 ↔ 3`,"Step hysteresis":`Hystérésis des paliers`,"Control value step 0":`Valeur de commande palier 0`,"Control value step 1":`Valeur de commande palier 1`,"Control value step 2":`Valeur de commande palier 2`,"Control value step 3":`Valeur de commande palier 3`,"Minimum time per step":`Durée minimale par palier`,Fan:`Ventilateur`,"Relay operating mode":`Mode de fonctionnement du relais`,"Normally closed relay: the load is powered while the channel is off.":`Relais normalement fermé : la charge est alimentée tant que la voie est à l'arrêt.`,"{0} · {1}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.":`{0} · {1} : l'actionneur attend une vanne normalement ouverte, mais la vanne est normalement fermée ; elle s'ouvre quand aucune chaleur n'est demandée.`,"{0} · {1}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.":`{0} · {1} : l'actionneur attend une vanne normalement fermée, mais la vanne est normalement ouverte ; elle s'ouvre quand aucune chaleur n'est demandée.`,"{0} · {1}: the motor is wired in reverse and the actuator does not compensate it; the shutter moves opposite to the commands.":`{0} · {1} : le moteur est câblé à l'envers et l'actionneur ne le compense pas ; le volet se déplace à l'inverse des commandes.`,"{0} · {1}: the actuator inverts its output, but the motor is wired normally; the shutter moves opposite to the commands.":`{0} · {1} : l'actionneur inverse sa sortie, mais le moteur est câblé normalement ; le volet se déplace à l'inverse des commandes.`,"{0}: the contact is normally closed, but the input is not inverted; open and closed are reported the wrong way round.":`{0} : le contact est normalement fermé, mais l'entrée n'est pas inversée ; ouvert et fermé sont signalés à l'envers.`,"{0}: the input is inverted, but the contact is normally open; open and closed are reported the wrong way round.":`{0} : l'entrée est inversée, mais le contact est normalement ouvert ; ouvert et fermé sont signalés à l'envers.`,"{0} links DPT {1} and DPT {2}, whose values 0 and 1 have opposite meanings; check the receiving objects.":`{0} relie le DPT {1} et le DPT {2}, dont les valeurs 0 et 1 ont des sens opposés ; vérifiez les objets récepteurs.`,"thermostat: no external temperature for {0} s: internal sensor used":`thermostat : aucune température externe depuis {0} s : sonde interne utilisée`,"thermostat: external temperature received again":`thermostat : température externe à nouveau reçue`,"Outdoor temperature of the rooms set to {0} °C":`Température extérieure des pièces réglée à {0} °C`,"Configuration check":`Contrôle de configuration`,"External temperature timeout":`Délai de la température externe`,"Contact type":`Type de contact`,"Normally open":`Normalement ouvert`,"Normally closed":`Normalement fermé`,"Invert input":`Inverser l'entrée`,"Outdoor temperature applies to the rooms":`La température extérieure s'applique aux pièces`,"Motor wired in reverse":`Moteur câblé à l'envers`,"Heating effect (K)":`Effet de chauffage (K)`,Command:`Commande`,"Status feedback":`Retour d'état`,Scene:`Scène`,Forcing:`Forçage`,"Up/down":`Montée/descente`,"Stop/step":`Arrêt/pas`,"Position setpoint":`Consigne de position`,"Position feedback":`Retour de position`,Transmission:`Émission`,Display:`Affichage`,Timer:`Minuterie`,"Status feedback delay":`Délai du retour d'état`,"End of forcing":`Fin du forçage`,"On at start":`Allumé au départ`,"Configured travel time":`Course paramétrée`,"Start delay":`Délai de départ`,"Position feedback delay":`Délai du retour de position`,"Stop/step increment":`Pas d'un arrêt/pas`,"Inverted wiring":`Câblage inversé`,"Estimated position at start":`Position estimée au départ`,"Actual travel time":`Course réelle`,"Actual position at start":`Position réelle au départ`,"Switch-on delay":`Retard d'allumage`,"Dimmer: switching, relative (3.007) and absolute (5.001) dimming, status feedback.":`Variateur : commutation, variation relative (3.007) et absolue (5.001), retours d'état.`,Switching:`Commutation`,Dimming:`Variation`,Value:`Valeur`,Status:`État`,"Value status":`État valeur`,"Switch-on value":`Valeur d'allumage`,"Switch-on level":`Niveau d'allumage`,"Dimming time":`Temps de variation`,"Fade on switching":`Fondu à la commutation`,"Fade on value":`Fondu sur valeur`,"Minimum level":`Niveau minimal`,"Maximum level":`Niveau maximal`,"Switch on by dimming":`Allumage par variation`,"Switch off by dimming":`Extinction par variation`,"Initial level":`Niveau au départ`,"KNX/DALI gateway: each channel is a DALI group of ballasts; broadcast, scenes and fault reporting.":`Passerelle KNX/DALI : chaque canal est un groupe DALI de ballasts ; broadcast, scènes et report des défauts.`,Fault:`Défaut`,"Broadcast switching":`Broadcast commutation`,"Broadcast value":`Broadcast valeur`,"General fault":`Défaut général`,"Ballast polling":`Interrogation des ballasts`,"Dimmable lamp":`Lampe variable`,"DALI group":`Groupe DALI`,"Number of ballasts":`Nombre de ballasts`,"First short address":`Première adresse courte`,"Faulty ballasts":`Ballasts en défaut`,"USB interface: writes and reads group addresses from the USB interface panel of the diagram.":`Interface USB : écrit et lit des adresses de groupe depuis le panneau d'interface USB du diagramme.`,"Long press duration":`Durée d'appui long`,"Switch-off warning":`Préavis d'extinction`,"Hold time restarted by a detection":`Temporisation relancée par un passage`,"Send 0 at the end":`Émettre 0 à la fin`,"Hold time":`Temporisation`,Presence:`Présence`,"Presence detector: sends 1 on first detection, 0 when its hold time ends (restarted by each detection).":`Détecteur de présence : émet 1 au premier passage, 0 à la fin de sa temporisation (relancée à chaque passage).`,"Timer retriggering":`Redéclenchement de la minuterie`,"Early switch-off by 0":`Arrêt anticipé par 0`,"End-of-travel supplement":`Supplément en fin de course`,Lamp:`Lampe`,"Push button or sensor: each gesture writes a value into a local object, then transmits it.":`Poussoir ou capteur : chaque geste écrit une valeur dans un objet local puis l'émet.`,"Switch actuator: each channel drives a relay; optional timer and status feedback.":`Actionneur de commutation : chaque canal pilote un relais ; minuterie et retour d'état facultatifs.`,"Shutter actuator without sensor: position estimated from the configured travel time.":`Actionneur de volet sans capteur : estimation de position par le temps de course paramétré.`,"Display / supervisor: receives and shows values, with no output or retransmission.":`Afficheur / superviseur : reçoit et affiche les valeurs, sans sortie ni retransmission.`,"Device without logic: it only keeps the values of its objects.":`Participant sans logique : il conserve seulement les valeurs de ses objets.`,"Roller shutter":`Volet roulant`,"Room thermostat: comfort / standby / economy / protection modes (20.102), window and presence, PI control (5.001 or PWM) or two-point, heating and cooling.":`Thermostat d'ambiance : modes confort / veille / économie / protection (20.102), fenêtre et présence, régulation PI (5.001 ou PWM) ou deux points, chauffage et refroidissement.`,"Measured temperature":`Température mesurée`,"External temperature":`Température externe`,"Base setpoint":`Consigne de base`,"Setpoint shift":`Décalage de consigne`,"Current setpoint":`Consigne en cours`,"Mode (preset)":`Mode (présélection)`,"Current mode":`Mode en cours`,Window:`Fenêtre`,"Heating / cooling":`Chauffage / refroidissement`,"Heating / cooling status":`État chauffage / refroidissement`,"Heating control value":`Commande chauffage`,"Heating 1-bit control":`Commande chauffage 1 bit`,"Cooling control value":`Commande refroidissement`,"Cooling 1-bit control":`Commande refroidissement 1 bit`,"Control type":`Type de régulation`,"Standby setback":`Abaissement veille`,"Economy setback":`Abaissement économie`,"Frost protection setpoint":`Consigne hors gel`,"Heat protection setpoint":`Consigne protection chaleur`,"Dead zone":`Zone neutre`,"Minimum setpoint":`Consigne minimale`,"Maximum setpoint":`Consigne maximale`,Hysteresis:`Hystérésis`,"Proportional band":`Bande proportionnelle`,"Integral time":`Temps d'intégration`,"PWM cycle time":`Période PWM`,"Calculation period":`Période de calcul`,"Send on change":`Émission sur variation`,"Cyclic sending of control value":`Émission cyclique de la commande`,"Temperature send threshold":`Émission de la température`,"Cyclic sending of temperature":`Émission cyclique de la température`,"Heating actuator: each output drives an electrothermal valve; continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.":`Actionneur de chauffage : chaque sortie alimente une vanne thermoélectrique ; grandeur continue (5.001) modulée en PWM ou commande 1 bit directe, surveillance et secours.`,"Control value":`Grandeur de commande`,"1-bit command":`Commande 1 bit`,"Control value status":`État de la commande`,"Control value failure":`Défaut de commande`,"Valve direction of action":`Sens d'action de la vanne`,"Control value monitoring":`Surveillance de la commande`,"Emergency control value":`Commande de secours`,"Window contact (binary input): sends the opening and closing of its room's window.":`Contact de fenêtre (entrée binaire) : transmet l'ouverture et la fermeture de la fenêtre de sa pièce.`,Contact:`Contact`,Invert:`Inverser`,"Room temperature sensor: sends its room's temperature on change and cyclically.":`Sonde de température d'ambiance : émet la température de sa pièce sur variation et cycliquement.`,Temperature:`Température`,"Cyclic sending":`Émission cyclique`,Radiator:`Radiateur`,"Valve travel time":`Course de la vanne`,"Valve open when de-energised":`Vanne ouverte hors tension`,Power:`Puissance`,Emitter:`Émetteur`,"Initial opening":`Ouverture au départ`,"Set value":`Valeur paramétrée`,"Last value":`Dernière valeur`,Restarts:`Redémarre`,"No effect":`Sans effet`,Extends:`Prolonge`,"Last command":`Dernière commande`,"Previous state":`État d'avant`,Unchanged:`Inchangé`,On:`Marche`,Off:`Arrêt`,Toggle:`Inversion`,"PI (continuous or PWM)":`PI (continue ou PWM)`,"Two-point":`Deux points`,"Closed when de-energised":`Fermée hors tension`,"Open when de-energised":`Ouverte hors tension`,Heating:`Chauffage`,Cooling:`Refroidissement`,"Send on start":`Émission au démarrage`,"Start-up send delay":`Délai d'émission au démarrage`,"Group addresses assigned to the interface":`Adresses de groupe affectées à l'interface`,"no timer":`pas de minuterie`,"Loading KNX scenario…":`Chargement du scénario KNX…`,"Could not load {0} ({1}).":`Chargement de {0} impossible ({1}).`,"Invalid scenario:":`Scénario invalide :`,"Simulation stopped:":`Simulation interrompue :`,Reset:`Réinitialiser`,"Next ▶":`Suivant ▶`,"Click = short press · hold 0.5 s = long press (keyboard: Enter / Shift+Enter)":`Clic = appui court · maintenir 0,5 s = appui long (clavier : Entrée / Maj+Entrée)`,Resume:`Reprendre`,Pause:`Pause`,"Step by step":`Pas à pas`,Extension:`Extension`,Speed:`Vitesse`,Slow:`Lente`,Normal:`Normale`,Fast:`Rapide`,"Filter tables":`Tables de filtrage`,"Stop at every transmission, coupler, reception, output change and timer":`S'arrêter à chaque émission, coupleur, réception, changement de sortie et échéance`,"Internal object value:":`Valeur interne de l'objet :`,"Click to inspect objects and channels":`Cliquer pour inspecter les objets et les canaux`,"Send value":`Envoyer la valeur`,"forced on":`forcé marche`,"off in {0} s":`arrêt dans {0} s`,heat:`chauffe`,cool:`froid`,"forced off":`forcé arrêt`,"view “{0}” missing":`vue « {0} » absente`,"Position estimated by the actuator ({0} %)":`Position estimée par l'actionneur ({0} %)`,Estimated:`Estimée`,"Motor command applied by the actuator":`Ordre moteur appliqué par l'actionneur`,Motor:`Moteur`,"view “{0}” ({1}/{2}): {3}":`vue « {0} » ({1}/{2}) : {3}`,"view “{0}” failed":`vue « {0} » en erreur`,"checking…":`analyse…`,"Long press → {0}":`Appui long → {0}`,"Hold for a long press…":`Maintenir pour un appui long…`,"Element {0} not found in the page.":`Élément {0} introuvable dans la page.`,"setSpeed: finite positive number expected (got {0})":`setSpeed : nombre fini strictement positif attendu (reçu {0})`,"BusDiagram.create: element {0} not found":`BusDiagram.create : élément {0} introuvable`,"Connects a line to the main line. It only forwards the group addresses of its filter table (used on both sides) and decrements the routing counter.":`Relie une ligne à la ligne principale. Il ne transmet que les adresses de groupe de sa table de filtrage (utilisées des deux côtés) et décrémente le compteur de routage.`,"Connects the main line of an area to the backbone. Same filter-table principle, at area level.":`Relie la ligne principale d'une zone à la dorsale. Même principe de table de filtrage, à l'échelle de la zone.`,"Gateway between the TP bus and the IP network (KNXnet/IP). Its filter table only lets through addresses used on the other side.":`Passerelle entre le bus TP et le réseau IP (KNXnet/IP). Sa table de filtrage ne laisse passer que les adresses utilisées de l'autre côté.`,"Extends the line electrically (new segment of 64 devices). No filtering: everything is repeated, and the routing counter is decremented.":`Prolonge électriquement la ligne (nouveau segment de 64 participants). Aucun filtrage : tout est recopié, avec décrémentation du compteur de routage.`,"Splits the line into segments with a filter table: local traffic of one segment no longer reaches the other.":`Découpe la ligne en sous-segments avec une table de filtrage : le trafic local d'un segment ne passe plus dans l'autre.`,"No scenario: open this player from the designer (Export → Player link), or with player.html?src=my-scenario.json.":`Aucun scénario : ouvrez ce lecteur depuis le concepteur (Exporter → Lien de lecture), ou avec player.html?src=mon-scenario.json.`,"Unreadable link: {0}":`Lien illisible : {0}`,"Link without a scenario (parameter “d” missing).":`Lien sans scénario (paramètre « d » absent).`,"sends {0} = {1} (object “{2}”).":`émet {0} = {1} (objet « {2} »).`,"filtered, the telegram stops here":`filtré, le télégramme s'arrête ici`,"repeated, RC {0}→{1}":`recopié, RC {0}→{1}`,"forwarded, RC {0}→{1}":`transmis, RC {0}→{1}`,"checks its table: {0} {1}.":`consulte sa table : {0} {1}.`,"receives {0}: object “{1}” takes the value {2} (internal link).":`reçoit {0} : l'objet « {1} » prend la valeur {2} (liaison interne).`,"receives {0}: object “{1}” takes the value {2}.":`reçoit {0} : l'objet « {1} » prend la valeur {2}.`,"receives {0} but object “{1}” ignores it: W flag disabled.":`reçoit {0} mais l'objet « {1} » l'ignore : flag W désactivé.`,"{0} reached.":`{0} atteinte.`,"(+{0} details)":`(+{0} détails)`,"(+{0} detail)":`(+{0} détail)`,"Filter table:":`Table de filtrage :`,empty:`vide`,Behavior:`Comportement`,Object:`Objet`,"W: accepts writes · T: may transmit":`W : accepte l'écriture · T : peut émettre`,"W: accepts received writes":`W : accepte les écritures reçues`,"W: ignores received writes":`W : ignore les écritures reçues`,"T: may transmit":`T : peut émettre`,"T: does not transmit":`T : n'émet pas`,"Channels ({0})":`Canaux ({0})`,"Estimated position":`Position estimée`,"Actual position":`Position réelle`,"no shutter connected":`aucun volet raccordé`,"Motor command":`Ordre moteur`,Phase:`Phase`,"End stop":`Butée`,top:`haute`,bottom:`basse`,Output:`Sortie`,"stored command:":`commande mémorisée :`,on:`marche`,off:`arrêt`,"switching off in {0} s":`extinction dans {0} s`,Equipment:`Équipement`,unused:`non utilisé`,"Group monitor":`Moniteur de groupe`,"{0} telegrams":`{0} télégrammes`,"{0} telegram":`{0} télégramme`,"click to inspect":`cliquer pour inspecter`,Time:`Heure`,Source:`Source`,Destination:`Destination`,Type:`Type`,"No telegram yet. Press a push-button key.":`Aucun télégramme. Appuyez sur une touche d'un poussoir.`,"automatic transmission":`émission automatique`,"gesture {0} · {1}":`geste {0} · {1}`,"timer {0} of {1}":`échéance {0} de {1}`,"reception on “{0}” ({1})":`réception sur « {0} » ({1})`,Telegram:`Télégramme`,"Details of the last telegram (fields, bytes, couplers crossed, target objects) will appear here.":`Le détail du dernier télégramme (champs, octets, coupleurs traversés, objets destinataires) s'affichera ici.`,"individual addr.":`adr. individuelle`,"group addr.":`adr. de groupe`,Service:`Service`,"{0} according to {1}":`{0} selon {1}`,Cause:`Cause`,"TP1 frame: control · source · destination · type/RC/length · APCI+data · checksum. The DPT is not transmitted: only the devices know it.":`Trame TP1 : contrôle · source · destination · type/RC/longueur · APCI+donnée · contrôle. Le DPT n'est pas transmis : seuls les participants le connaissent.`,Couplers:`Coupleurs`,"in progress":`en cours`,"Objects linked to {0}":`Objets liés à {0}`,"(internal link)":`(liaison interne)`,"write accepted":`écriture acceptée`,received:`reçu`,"ignored (W)":`ignoré (W)`,"The telegram is travelling on the bus…":`Le télégramme circule sur le bus…`,"No other device listens to this address.":`Aucun autre participant n'écoute cette adresse.`,"Reached without association:":`Atteint sans association :`,Control:`Contrôle`,"standard frame, low priority":`trame standard, priorité basse`,"Group · RC · length":`Groupe · RC · long.`,"group address, RC {0}, {1} bytes":`adresse de groupe, RC {0}, {1} octets`,"group address, RC {0}, {1} byte":`adresse de groupe, RC {0}, {1} octet`,"TPCI/APCI + data":`TPCI/APCI + donnée`,Checksum:`Contrôle de trame`,"inverted XOR":`XOR inversé`,"IP network · KNXnet/IP":`Réseau IP · KNXnet/IP`,"Line {0}":`Ligne {0}`,"Line {0} · downstream segment":`Ligne {0} · segment aval`,"Area {0}":`Zone {0}`,"KNX/IP router":`Routeur KNX/IP`,"Area coupler":`Coupleur de zone`,"Line coupler":`Coupleur de ligne`,"Segment coupler":`Coupleur de segment`,Repeater:`Répéteur`,Switch:`Commutation`,Boolean:`Booléen`,Enable:`Validation`,Step:`Pas`,"Up/Down":`Haut/Bas`,"Open/Close":`Ouvert/Fermé`,"Start/Stop":`Marche/Arrêt`,Trigger:`Déclencheur`,Occupancy:`Occupation`,"Priority control":`Commande prioritaire`,Percentage:`Pourcentage`,Counter:`Compteur`,"Scene number":`Numéro de scène`,True:`Vrai`,False:`Faux`,Enabled:`Validé`,Disabled:`Bloqué`,"Step increase":`Pas croissant`,"Step decrease":`Pas décroissant`,Down:`Descendre`,Up:`Monter`,Closed:`Fermé`,Open:`Ouvert`,Start:`Marche`,Stop:`Arrêt`,Triggered:`Déclenché`,"Forced on":`Forcé marche`,"Forced off":`Forcé arrêt`,"No forcing":`Pas de forçage`,Occupied:`Occupé`,Vacant:`Libre`,"Scene {0}":`Scène {0}`,unknown:`inconnue`,"DPT {0} not supported":`DPT {0} non pris en charge`,"finite number expected":`valeur numérique finie attendue`,"value {0} outside the range {1}…{2} of DPT {3}":`valeur {0} hors de la plage {1}…{2} du DPT {3}`,"DPT {0} only accepts 0 or 1":`le DPT {0} n'accepte que 0 ou 1`,"DPT {0} expects an integer":`le DPT {0} attend un entier`,"relay closed":`relais fermé`,"relay open":`relais ouvert`,"motor ▲ up":`moteur ▲ montée`,"motor ▼ down":`moteur ▼ descente`,"motor stopped":`moteur arrêté`,repeated:`recopié`,forwarded:`transmis`,filtered:`filtré`,"{0} {1}: {2}":`{0} {1} : {2}`,"timer “{0}”":`échéance « {0} »`,"more than {0} events at t = {1} ms: cascade stopped (see the chain of causes in the journal)":`plus de {0} événements à t = {1} ms : cascade interrompue (voir la chaîne des causes dans le journal)`,"equipment {0} ({1}): {2}":`équipement {0} ({1}) : {2}`,"{0} ({1}) · {2}.{3}: {4}":`{0} ({1}) · {2}.{3} : {4}`,"{0}.channelState({1}): {2}":`{0}.channelState({1}) : {2}`,"{0}: command “{1}” incompatible with equipment {2}":`{0} : commande « {1} » incompatible avec l'équipement {2}`,"T flag disabled: value changed locally, no telegram":`flag T désactivé : valeur modifiée localement, aucun télégramme`,"no group address associated":`aucune adresse de groupe associée`,"{0}/{1}: transmission requested without a group address":`{0}/{1} : émission demandée sans adresse de groupe`,"unknown value":`valeur inconnue`,"reached but no association":`atteint mais aucune association`,"W flag disabled: value and behavior unchanged":`flag W désactivé : valeur et comportement inchangés`,"behavior “{0}” not registered":`comportement « {0} » non enregistré`,"advance: non-negative integer duration expected (got {0})":`advance : durée entière positive ou nulle attendue (reçu {0})`,"non-negative integer duration expected (got {0})":`durée entière positive ou nulle attendue (reçu {0})`,"unknown object “{0}” in {1}":`objet « {0} » inconnu dans {1}`,"unknown channel “{0}” in {1}":`canal « {0} » inconnu dans {1}`,"non-numeric value for {0}":`valeur non numérique pour {0}`,"timer key required":`clé d'échéance requise`,"invalid delay for “{0}”: {1}":`délai invalide pour « {0} » : {1}`,"invalid output command on {0}: {1}":`commande de sortie invalide sur {0} : {1}`,"{0}: already moving to {1} %, command has no effect":`{0} : déjà en mouvement vers {1} %, commande sans effet`,"{0}: no preset for scene {1}, command ignored":`{0} : aucun préréglage pour la scène {1}, commande ignorée`,"{0}: output forced (on), command stored without effect":`{0} : sortie forcée (marche), commande mémorisée sans effet`,"{0}: output forced (off), command stored without effect":`{0} : sortie forcée (arrêt), commande mémorisée sans effet`,"Actual shutter: {0} %":`Volet réel : {0} %`,"The scenario must be a JSON object.":`Le scénario doit être un objet JSON.`,"unknown format version “{0}” (supported versions: 1, 2)":`version de format inconnue « {0} » (versions prises en charge : 1, 2)`,"unknown field “{0}”":`champ inconnu « {0} »`,"required field":`champ requis`,"text expected":`texte attendu`,"empty identifier":`identifiant vide`,"invalid identifier “{0}”: letters, digits, “_”, “-” or “.”, no space or “/”":`identifiant « {0} » invalide : lettres, chiffres, « _ », « - » ou « . », sans espace ni « / »`,"empty value":`valeur vide`,"list required":`liste requise`,"list expected":`liste attendue`,"at least one line is required":`au moins une ligne est requise`,"“{0}” is not a valid line address (e.g. 1.1, area and line 0–15)":`« {0} » n'est pas une adresse de ligne valide (ex. 1.1, zone et ligne 0–15)`,"duplicate line {0}":`ligne {0} en double`,"“{0}” is not a valid individual address":`« {0} » n'est pas une adresse individuelle valide`,"extension {0} does not belong to line {1}":`l'extension {0} n'appartient pas à la ligne {1}`,"“repeater” or “segmentCoupler” expected":`« repeater » ou « segmentCoupler » attendu`,"boolean expected":`booléen attendu`,"“{0}” is not a valid 3-level group address (0–31/0–7/0–255)":`« {0} » n'est pas une adresse de groupe 3 niveaux valide (0–31/0–7/0–255)`,"duplicate group address {0}":`adresse de groupe {0} en double`,"empty DPT (remove the field or write a DPT)":`DPT vide (retirer le champ ou écrire un DPT)`,"DPT “{0}” not supported":`DPT « {0} » non pris en charge`,"duplicate identifier “{0}”":`identifiant « {0} » en double`,"unknown type “{0}”":`type inconnu « {0} »`,"unknown behavior “{0}” (extension not loaded? Available behaviors: {1})":`comportement inconnu « {0} » (extension non chargée ? Comportements disponibles : {1})`,"“TP” or “IP” expected":`« TP » ou « IP » attendu`,"“{0}” is not a valid individual address (e.g. 1.1.10; area and line 0–15, device 0–255)":`« {0} » n'est pas une adresse individuelle valide (ex. 1.1.10 ; zone et ligne 0–15, participant 0–255)`,"{0} is reserved for the area (backbone) coupler":`{0} est réservée au coupleur de zone (backbone)`,"{0} is not a device address: device number 0 is reserved for couplers":`{0} n'est pas une adresse d'appareil : le numéro 0 est réservé aux coupleurs`,"{0} is reserved for the line coupler; a line repeater or segment coupler uses a device number from 1 to 255, for example {1}.64":`{0} est réservée au coupleur de ligne ; un répéteur de ligne ou un coupleur de segment utilise un numéro d'appareil de 1 à 255, par exemple {1}.64`,"lines 0.1 to 0.15, connected directly to the backbone, exist in KNX but are not supported by BusDiagram; use an area from 1 to 15":`les lignes 0.1 à 0.15, raccordées directement au backbone, existent en KNX mais ne sont pas prises en charge par BusDiagram ; utilisez une zone de 1 à 15`,"{0} is reserved for the line coupler":`{0} est réservée au coupleur de la ligne`,"line {0} is not declared in “lines”":`la ligne {0} n'est pas déclarée dans « lines »`,"line {0} has no extension (repeater/segment coupler)":`la ligne {0} n'a pas d'extension (répéteur/coupleur de segment)`,"individual address {0} already used ({1})":`adresse individuelle {0} déjà utilisée ({1})`,"duplicate channel “{0}”":`canal « {0} » en double`,"strictly positive duration in seconds expected":`durée en secondes strictement positive attendue`,"“lamp”, “shutter” or “none” expected":`« lamp », « shutter » ou « none » attendu`,"object or null expected":`objet ou null attendu`,"unknown equipment “{0}” (available: {1})":`équipement inconnu « {0} » (disponibles : {1})`,"“{0}” expects “{1}” commands, behavior {2} sends “{3}”":`« {0} » attend des commandes « {1} », le comportement {2} commande « {3} »`,"behavior {0} drives no output":`le comportement {0} ne commande aucune sortie`,"object { scene number: value } expected":`objet { numéro de scène : valeur } attendu`,"integer scene number 1–64 expected":`numéro de scène entier 1–64 attendu`,"DALI scene number 1–16 expected":`numéro de scène DALI 1–16 attendu`,"DALI gateway supports at most 16 groups":`une passerelle DALI prend en charge au plus 16 groupes`,"DALI short address A{0} is already assigned to channel {1}; overlapping groups are outside this model":`l’adresse courte DALI A{0} est déjà affectée au canal {1} ; les groupes qui se chevauchent ne sont pas modélisés`,"number expected":`nombre attendu`,"preset 0 or 1 expected for a switching channel":`préréglage 0 ou 1 attendu pour un canal de commutation`,"position 0–100 % expected for a shutter":`position 0–100 % attendue pour un volet`,"duplicate object “{0}”":`objet « {0} » en double`,"empty address: write [] for an unassociated object":`adresse vide : écrire [] pour un objet non associé`,"group address or list of addresses expected":`adresse de groupe ou liste d'adresses attendue`,"required field (empty list for an unassociated object)":`champ requis (liste vide pour un objet non associé)`,"“{0}” is not a valid 3-level group address (e.g. 1/1/1)":`« {0} » n'est pas une adresse de groupe 3 niveaux valide (ex. 1/1/1)`,"duplicate address {0} in the object":`adresse {0} en double dans l'objet`,"unknown role “{0}”":`rôle inconnu « {0} »`,"port “{0}” not accepted by {1} (ports: {2})":`port « {0} » non accepté par {1} (ports : {2})`,"channel “{0}” missing from {1}.channels":`canal « {0} » absent de {1}.channels`,"port “{0}” does not refer to a channel":`le port « {0} » ne désigne pas de canal`,"port “{0}” requires a channel":`le port « {0} » nécessite un canal`,"DPT required (on the object or on its first group address)":`DPT requis (sur l'objet ou sur sa première adresse de groupe)`,"DPT {0} incompatible with port “{1}” (expected: {2})":`DPT {0} incompatible avec le port « {1} » (attendu : {2})`,"object “{0}” not found in this device":`objet « {0} » introuvable dans ce participant`,"behavior {0} does not use keys":`le comportement {0} n'exploite pas de touches`,"duplicate key identifier “{0}”":`identifiant de touche « {0} » en double`,"unknown icon “{0}”":`icône inconnue « {0} »`,"a “press”, “short” or “long” action is required":`une action « press », « short » ou « long » est requise`,"“press” cannot be combined with “short”/“long”":`« press » ne se combine pas avec « short »/« long »`,"object { object, value } expected":`objet { object, value } attendu`,"number or “toggle” expected":`valeur numérique ou « toggle » attendue`,"object “{0}” has no group address":`l'objet « {0} » n'a pas d'adresse de groupe`,"“toggle” only makes sense for a 1-bit object (DPT {0})":`« toggle » n'a de sens que pour un objet 1 bit (DPT {0})`,"behavior {0} does not use inputs":`le comportement {0} n'exploite pas d'entrées`,"identifier “{0}” already used by a key or an input":`identifiant « {0} » déjà utilisé par une touche ou une entrée`,"“number” expected":`« number » attendu`,"object “{0}” must have port “input”":`l'objet « {0} » doit avoir le port « input »`,"number required":`nombre requis`,"“min” must be less than “max”":`« min » doit être inférieur à « max »`,"strictly positive step expected":`pas strictement positif attendu`,"bounds outside the range {0}…{1} of DPT {2}":`bornes hors de la plage {0}…{1} du DPT {2}`,"flags { W, T } required in v2":`flags { W, T } requis en v2`,"{0} is associated with objects of different sizes: {1} here, {2} elsewhere":`{0} est associée à des objets de tailles différentes : {1} ici, {2} ailleurs`,"strictly positive number expected":`nombre strictement positif attendu`,'missing: this file uses format 2 fields (behavior, port, flags); add "formatVersion": 2':`absent : ce fichier utilise des champs du format 2 (behavior, port, flags) ; ajouter "formatVersion": 2`,integer:`entier`,number:`nombre`,boolean:`booléen`,text:`texte`," or ":` ou `,"object expected":`objet attendu`,"unknown parameter “{0}”":`paramètre inconnu « {0} »`,"unknown parameter “{0}” (this behavior has no parameters)":`paramètre inconnu « {0} » (ce comportement n'a pas de paramètres)`,"required parameter":`paramètre requis`,"{0} expected":`{0} attendu`,"value {0} out of bounds ({1})":`valeur {0} hors bornes ({1})`,"unknown value “{0}” ({1})":`valeur « {0} » inconnue ({1})`,"registerMessages: language code required":`registerMessages : code de langue requis`,"Behavior: invalid identifier “{0}”":`Comportement : identifiant « {0} » invalide`,"Equipment: invalid identifier “{0}”":`Équipement : identifiant « {0} » invalide`,"Behavior “{0}” already registered":`Comportement « {0} » déjà enregistré`,"Equipment “{0}” already registered":`Équipement « {0} » déjà enregistré`,"Behavior “{0}”: definition expected":`Comportement « {0} » : définition attendue`,"Equipment “{0}”: definition expected":`Équipement « {0} » : définition attendue`,"Invalid behavior “{0}”:":`Comportement « {0} » invalide :`,"Invalid equipment “{0}”:":`Équipement « {0} » invalide :`,'{0}: { type: "object", properties: { … } } expected':`{0} : { type: "object", properties: { … } } attendu`,"{0}.{1}: unsupported keyword (subset: type, properties, required, additionalProperties)":`{0}.{1} : mot-clé non pris en charge (sous-ensemble : type, properties, required, additionalProperties)`,"{0}.additionalProperties: only false is supported":`{0}.additionalProperties : seule la valeur false est prise en charge`,"{0}.required: “{1}” is not a declared property":`{0}.required : « {1} » n'est pas une propriété déclarée`,"{0}: object expected":`{0} : objet attendu`,"{0}.{1}: unsupported keyword (scalar values only)":`{0}.{1} : mot-clé non pris en charge (valeurs scalaires seulement)`,"{0}.type: {1} (or a list of these types) expected":`{0}.type : {1} (ou une liste de ces types) attendu`,"{0}.{1}: finite number expected":`{0}.{1} : nombre fini attendu`,"{0}.enum: non-empty list expected":`{0}.enum : liste non vide attendue`,"{0}.default: {1}":`{0}.default : {1}`,"createState: function required":`createState : fonction requise`,"ports: object required (possibly empty)":`ports : objet requis (éventuellement vide)`,"ports.{0}: object expected":`ports.{0} : objet attendu`,'ports.{0}.dpts: "any" or list of supported DPTs expected':`ports.{0}.dpts : "any" ou liste de DPT pris en charge attendu`,'ports.{0}.channel: "required", "optional" or "none" expected':`ports.{0}.channel : "required", "optional" ou "none" attendu`,'output: "switch", "motor" or "dim" expected':`output : "switch", "motor" ou "dim" attendu`,'ports.{0}.direction: "in" or "out" expected':`ports.{0}.direction : "in" ou "out" attendu`,"{0}: function expected":`{0} : fonction attendue`,"create: function required":`create : fonction requise`,"applyCommand: function required":`applyCommand : fonction requise`,"advance: function expected":`advance : fonction attendue`,'accepts: "switch", "motor" or "dim" expected':`accepts : "switch", "motor" ou "dim" attendu`,"view identifier required":`identifiant de vue requis`,"Equipment view “{0}” already registered":`Vue d'équipement « {0} » déjà enregistrée`,"View “{0}”: size and render are required":`Vue « {0} » : size et render sont requis`,"View “{0}”: size.width and size.height must be finite positive numbers":`Vue « {0} » : size.width et size.height doivent être des nombres finis positifs`,"Backbone 0.0":`Dorsale 0.0`,"Main line {0}.0":`Ligne principale {0}.0`,"{0} is not a line: Z.0 is the main line of area Z and 0.0 the backbone; they appear through “topology” (area and line 1–15)":`{0} n'est pas une ligne : Z.0 est la ligne principale de la zone Z et 0.0 la dorsale ; elles apparaissent avec « topology » (zone et ligne 1–15)`,"“areaCouplers” or “lineCouplers” expected":`« areaCouplers » ou « lineCouplers » attendu`,"“ipRouter” and “topology.ip” both describe the IP network: keep “topology.ip”":`« ipRouter » et « topology.ip » décrivent tous deux le réseau IP : garder « topology.ip »`,"with IP routers as line couplers, the IP network acts as main lines and backbone: remove “backbone” and “mainLines”":`avec des routeurs IP à la place des coupleurs de ligne, le réseau IP tient lieu de lignes principales et de dorsale : retirer « backbone » et « mainLines »`,"line coupler {0}":`coupleur de ligne {0}`,"KNXnet/IP router of area {0}":`routeur KNXnet/IP de la zone {0}`,"area coupler {0}":`coupleur de zone {0}`,"KNXnet/IP router of line {0}":`routeur KNXnet/IP de la ligne {0}`,'several areas: one KNXnet/IP router per area ({0}); write “topology”: { "ip": "areaCouplers" } instead of “ipRouter”':`plusieurs zones : un routeur KNXnet/IP par zone ({0}) ; écrire « topology »: { "ip": "areaCouplers" } à la place de « ipRouter »`,"a KNXnet/IP router is a coupler: its address is {0} (Z.L.0 for a line, Z.0.0 for an area)":`un routeur KNXnet/IP est un coupleur : son adresse est {0} (Z.L.0 pour une ligne, Z.0.0 pour une zone)`,"area number 1–15 expected":`numéro de zone 1–15 attendu`,"area {0} has no declared line":`la zone {0} n'a aucune ligne déclarée`,"duplicate area {0}":`zone {0} en double`,"no coupler at {0} (couplers of this installation: {1})":`aucun coupleur en {0} (coupleurs de cette installation : {1})`,"duplicate coupler {0}":`coupleur {0} en double`,"“filter”, “route” or “block” expected":`« filter », « route » ou « block » attendu`,'{0} is on the backbone (0.0), absent from this installation: add an area or “topology”: { "backbone": true }':`{0} est sur la dorsale (0.0), absente de cette installation : ajouter une zone ou « topology »: { "backbone": true }`,'{0} is on main line {1}, absent from this installation: add a line to area {2} or “topology”: { "mainLines": true }':`{0} est sur la ligne principale {1}, absente de cette installation : ajouter une ligne à la zone {2} ou « topology »: { "mainLines": true }`,'an IP device requires an IP network (“topology”: { "ip": … })':`un participant IP nécessite un réseau IP (« topology »: { "ip": … })`,"{0}: shutter stopped, stop/step has no effect (no slats)":`{0} : volet à l'arrêt, arrêt/pas sans effet (pas de lamelles)`,"{0}: timer cannot be retriggered, telegram has no effect":`{0} : minuterie non redéclenchable, télégramme sans effet`,"{0}: early switch-off of the timer not allowed, telegram 0 has no effect":`{0} : arrêt anticipé de la minuterie non autorisé, télégramme 0 sans effet`,"Detection: hold time restarted, no new telegram":`Passage : temporisation relancée, pas de nouveau télégramme`,"Detection: hold time not restarted":`Passage : temporisation non relancée`,"{0}: switch-off warning":`{0} : préavis d'extinction`,"flag “{0}” not simulated (W, T, R and U are; C is always active)":`flag « {0} » non simulé (W, T, R et U le sont ; C est toujours actif)`,"USB interface: reading {0}":`Interface USB : lecture de {0}`,"USB interface: writing {0}":`Interface USB : écriture de {0}`,"U flag off: response ignored, value unchanged":`flag U désactivé : réponse ignorée, valeur inchangée`,"R flag off: no response":`flag R désactivé : pas de réponse`,"read on {0}: the response is sent on the object's sending address {1}":`lecture sur {0} : la réponse part sur l'adresse d'émission de l'objet, {1}`,"unknown value: no response":`valeur inconnue : pas de réponse`,"GroupValueRead, no data":`GroupValueRead, sans donnée`,"{0}, payload byte 0x{1}":`{0}, octet utile 0x{1}`,"requests the value of {0} (read).":`demande la valeur de {0} (lecture).`,"responds {0} = {1} (object “{2}”, R flag).":`répond {0} = {1} (objet « {2} », flag R).`,"sends {0} = {1} (write from the USB interface).":`émet {0} = {1} (écriture depuis l'interface USB).`,"USB interface":`interface USB`,Tools:`Outils`,"Full screen":`Plein écran`,"Exit full screen":`Quitter le plein écran`,"Logic module disabled: output not sent":`Module logique désactivé : sortie non émise`,"Logic result unchanged ({0}): no telegram":`Résultat logique inchangé ({0}) : pas de télégramme`,"{0} reaches the threshold {1}: output set":`{0} atteint le seuil {1} : sortie activée`,"{0} is below {1} (threshold − hysteresis): output reset":`{0} est sous {1} (seuil − hystérésis) : sortie désactivée`,"{0}: wind alarm, shutter raised and locked":`{0} : alarme vent, volet remonté et verrouillé`,"{0}: wind alarm ended, shutter released in place":`{0} : fin de l'alarme vent, volet libéré sur place`,"{0}: wind alarm active, command ignored":`{0} : alarme vent active, commande ignorée`,"Wind alarm":`Alarme vent`,"Logic module: combines one-bit inputs (AND, OR, XOR, NOT) and sends the result; an optional enable object blocks the output.":`Module logique : combine des entrées 1 bit (ET, OU, OU exclusif, NON) et émet le résultat ; un objet de validation facultatif bloque la sortie.`,"Logic input":`Entrée logique`,"Logic output":`Sortie logique`,Operation:`Opération`,AND:`ET`,OR:`OU`,XOR:`OU exclusif`,"NOT (first input)":`NON (première entrée)`,"Send on change only":`Émettre seulement sur changement`,"Weather station: sends measured wind speed, brightness, and temperature; sets one-bit outputs when wind or brightness thresholds are reached.":`Station météo : émet la vitesse du vent, la luminosité et la température mesurées ; active des sorties 1 bit quand les seuils de vent ou de luminosité sont atteints.`,Brightness:`Luminosité`,"Outdoor temperature":`Température extérieure`,"Sun protection":`Protection solaire`,"Wind alarm threshold":`Seuil d'alarme vent`,"Wind alarm hysteresis":`Hystérésis de l'alarme vent`,"Sun protection threshold":`Seuil de protection solaire`,"Sun protection hysteresis":`Hystérésis de la protection solaire`,Lux:`Luminosité (lux)`,"Wind speed":`Vitesse du vent`,"0/0/0 is the broadcast address and cannot be used as a group address":`0/0/0 est l'adresse de diffusion (broadcast) et ne peut pas servir d'adresse de groupe`,Close:`Fermer`,"Enlarge the monitor":`Agrandir le moniteur`,"table: {0}":`table : {0}`,"table: empty":`table : vide`,"no filtering":`aucun filtrage`,none:`aucun`,press:`appui`,"short press":`appui court`,"long press":`appui long`,toggle:`inverse`,Write:`Écrire`,Read:`Lire`,"Write sends a GroupValueWrite; Read sends a GroupValueRead: each associated object with the R flag responds, on its own sending address.":`Écrire envoie un GroupValueWrite ; Lire envoie un GroupValueRead : chaque objet associé ayant le flag R répond, sur sa propre adresse d'émission.`,"Response from":`Réponse de`,"Reading {0}…":`Lecture de {0} en cours…`,"No response for {0}: no associated object has the R flag, or a coupler filtered the read or the response.":`Aucune réponse pour {0} : aucun objet associé n'a le flag R, ou un coupleur a filtré la lecture ou la réponse.`,read:`lecture`,response:`réponse`,Response:`Réponse`,"a read carries no value: each associated object with the R flag responds, on its own sending address":`une lecture ne transporte pas de valeur : chaque objet associé ayant le flag R répond, sur sa propre adresse d'émission`,broadcast:`broadcast`,"group {0}":`groupe {0}`,"DALI: {0} ← {1}":`DALI : {0} ← {1}`,OFF:`OFF`,"RECALL MAX LEVEL":`RECALL MAX LEVEL`,"DAPC {0} ({1} %)":`DAPC {0} ({1} %)`,"dimming stopped at {0} %":`arrêt de la variation à {0} %`,"{0}: off, dimming does not switch on (parameter)":`{0} : éteint, la variation n'allume pas (paramètre)`,"UP (dimming to {0} %)":`UP (variation vers {0} %)`,"DOWN (dimming to {0} %)":`DOWN (variation vers {0} %)`,"GO TO SCENE {0} ({1} %)":`GO TO SCENE {0} ({1} %)`,"DALI: {0} faulty ballast(s) in group {1}":`DALI : {0} ballast(s) en défaut dans le groupe {1}`,"DALI: no more fault in group {0}":`DALI : plus de défaut dans le groupe {0}`,"DALI: broadcast ← {0}":`DALI : broadcast ← {0}`,"DALI: broadcast ← DAPC {0} ({1} %)":`DALI : broadcast ← DAPC {0} ({1} %)`,Alarm:`Alarme`,"Relative dimming":`Variation relative`,"No alarm":`Pas d'alarme`,"Stop dimming":`Arrêt de la variation`,"Increase by {0} %":`Augmenter de {0} %`,"Decrease by {0} %":`Diminuer de {0} %`,"“release” (release after a long press) requires “long”":`« release » (relâchement après un appui long) exige « long »`,"dimming to {0} % in {1} s":`variation vers {0} % en {1} s`,"level {0} %":`niveau {0} %`,"interact: function expected":`interact : fonction attendue`,"equipment action: {0}":`action sur l'équipement : {0}`,"Ballast A{0} faulty (click to repair)":`Ballast A{0} en défaut (cliquer pour le réparer)`,"Ballast A{0}: click to simulate a fault":`Ballast A{0} : cliquer pour simuler un défaut`,"window open":`fenêtre ouverte`,presence:`présence`,preset:`présélection`,"thermostat: {0} mode ({1}), setpoint {2} °C":`thermostat : mode {0} ({1}), consigne {2} °C`,"thermostat: setpoint {0} °C":`thermostat : consigne {0} °C`,comfort:`confort`,standby:`veille`,economy:`économie`,protection:`protection`,auto:`auto`,"thermostat: no temperature (room or “externalTemp” object): no control":`thermostat : aucune température (pièce ou objet « externalTemp ») : pas de régulation`,"control value received: emergency mode ended":`commande reçue : fin du programme de secours`,"no control value received: emergency mode at {0} %":`aucune grandeur de commande reçue : programme de secours à {0} %`,"heatOutput: function expected":`heatOutput : fonction attendue`,"Window/Door":`Fenêtre/Porte`,"Heating/Cooling":`Chauffage/Refroidissement`,"HVAC mode":`Mode de fonctionnement HVAC`,"Temperature difference":`Écart de température`,Auto:`Auto`,Comfort:`Confort`,Standby:`Veille`,Economy:`Économie`,Protection:`Protection`,"Reserved ({0})":`Réservé ({0})`,"{0}, payload bytes 0x{1}":`{0}, données utiles 0x{1}`,"duplicate room “{0}”":`pièce « {0} » en double`,"number {0}…{1} expected":`nombre {0}…{1} attendu`,"integer expected":`entier attendu`,"unknown room “{0}” (declared rooms: {1})":`pièce inconnue « {0} » (pièces déclarées : {1})`,"heated or cooled room required (“room”)":`pièce chauffée ou refroidie à indiquer (« room »)`,"{0}: window opened":`{0} : fenêtre ouverte`,"{0}: window closed":`{0} : fenêtre fermée`,"{0}: outside temperature {1} °C":`{0} : température extérieure {1} °C`,"{0}.deviceState: {1}":`{0}.deviceState : {1}`,"Cooling emitter: valve {0} % open":`Émetteur de froid : vanne ouverte à {0} %`,"Radiator: valve {0} % open":`Radiateur : vanne ouverte à {0} %`,valve:`vanne`,setpoint:`consigne`,cooling:`refroidissement`,heating:`chauffage`,Rooms:`Pièces`,"physical quantities; thermal time compressed":`grandeurs physiques ; temps thermique compressé`,"Close window":`Fermer la fenêtre`,"Open window":`Ouvrir la fenêtre`,"Out.":`Ext.`,"Lower outside temperature":`Baisser la température extérieure`,"Raise outside temperature":`Monter la température extérieure`,"{0}.enumTitles: one label (text) per “enum” value expected":`{0}.enumTitles : un libellé (texte) par valeur de « enum » attendu`,"{0} ballasts from A{1} would reach A{2}: DALI short addresses stop at 63":`{0} ballasts à partir de A{1} iraient jusqu'à A{2} : les adresses courtes DALI s'arrêtent à 63`,"checkParameters: function expected":`checkParameters : fonction attendue`,"write to {0} refused: {1}":`écriture de {0} refusée : {1}`,"interact must return the state (object)":`interact doit renvoyer l'état (objet)`,"equipment {0}/{1} ({2}).interact({3}): {4}":`équipement {0}/{1} ({2}).interact({3}) : {4}`}]]);function r(e,t){if(typeof e!=`string`||!e)throw TypeError(l()`registerMessages: language code required`);let r=e.toLowerCase();n.set(r,{...n.get(r)??{},...t}),o.clear()}var i=()=>[`en`,...n.keys()];function a(e){return e.reduce((e,t,n)=>n?`${e}{${n-1}}${t}`:t,``)}var o=new Map;function s(e=`en`){let t=e.toLowerCase(),r=o.get(t);if(r)return r;let i=t.split(`-`)[0],s=i===`en`?[]:[n.get(t),n.get(i)],c=i===`en`||n.has(t)||n.has(i)?t:`en`,l=((e,...t)=>{let n=a(e),r=n;for(let e of s){let t=e?.[n];if(t!==void 0){r=t;break}}return r.replace(/\{(\d+)\}/g,(e,n)=>String(t[Number(n)]??``))});return l.s=e=>{for(let t of s)if(t?.[e]!==void 0)return t[e];return e},l.lang=c,l.number=new Intl.NumberFormat(c,{maximumFractionDigits:3}),o.set(t,l),l}var c=s(`en`);s(`fr`);function l(){return s((typeof document<`u`?document.documentElement.lang:``)||`en`)}var u=/^(\d{1,2})\.(\d{1,2})\.(\d{1,3})$/,d=/^(\d{1,2})\/(\d{1,2})\/(\d{1,3})$/,f=/^(\d{1,2})\.(\d{1,2})$/;function p(e){let t=u.exec(e);if(!t)return null;let n=[Number(t[1]),Number(t[2]),Number(t[3])];return n[0]<=15&&n[1]<=15&&n[2]<=255?n:null}function m(e){let t=d.exec(e);if(!t)return null;let n=[Number(t[1]),Number(t[2]),Number(t[3])];return n[0]<=31&&n[1]<=7&&n[2]<=255?n:null}var h=e=>m(e)?.every(e=>e===0)??!1;function g(e){let t=f.exec(e);if(!t)return null;let n=[Number(t[1]),Number(t[2])];return n[0]<=15&&n[1]<=15?n:null}var _=(e,t)=>e.localeCompare(t,`en`,{numeric:!0});function v(e,t){let n=[];for(let r of e.devices){for(let e of r.channels){let i=e.equipmentConfig;if(i){if(r.behavior===`heatingActuator/v1`&&i.type===`radiator`){let a=e.parameters.valveType===`normallyOpen`;a!==(i.parameters.normallyOpen===!0)&&n.push({code:`config-valve`,deviceId:r.id,channelId:e.id,message:a?t`${r.name||r.id} · ${e.label}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.`:t`${r.name||r.id} · ${e.label}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.`})}if(r.behavior===`shutterActuator/v1`&&i.type===`shutter`){let a=e.parameters.invertOutput===!0,o=i.parameters.wiringReversed===!0;a!==o&&n.push({code:`config-wiring`,deviceId:r.id,channelId:e.id,message:o?t`${r.name||r.id} · ${e.label}: the motor is wired in reverse and the actuator does not compensate it; the shutter moves opposite to the commands.`:t`${r.name||r.id} · ${e.label}: the actuator inverts its output, but the motor is wired normally; the shutter moves opposite to the commands.`})}}}if(r.behavior===`windowContact/v1`){let e=r.parameters.contactType===`normallyClosed`;e!==(r.parameters.invert===!0)&&n.push({code:`config-contact`,deviceId:r.id,message:e?t`${r.name||r.id}: the contact is normally closed, but the input is not inverted; open and closed are reported the wrong way round.`:t`${r.name||r.id}: the input is inverted, but the contact is normally open; open and closed are reported the wrong way round.`})}}let r=[[`1.009`,`1.019`]],i=new Map;for(let t of e.devices)for(let e of t.objects)for(let n of e.gas){let r=i.get(n)??[];r.push({deviceId:t.id,dpt:e.dpt}),i.set(n,r)}return i.forEach((e,i)=>{for(let[a,o]of r){let r=e.find(e=>e.dpt===a);r&&e.some(e=>e.dpt===o)&&n.push({code:`config-polarity`,deviceId:r.deviceId,message:t`${i} links DPT ${a} and DPT ${o}, whose values 0 and 1 have opposite meanings; check the receiving objects.`})}}),n}function y(e){"@babel/helpers - typeof";return y=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},y(e)}function b(e,t){if(y(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(y(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function x(e){var t=b(e,`string`);return y(t)==`symbol`?t:t+``}function S(e,t,n){return(t=x(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var C=class{constructor(){S(this,`heap`,[]),S(this,`seq`,0),S(this,`live`,0)}get size(){return this.live}push(e,t){if(!Number.isInteger(e))throw RangeError(`time must be an integer: ${e}`);let n={timeMs:e,seq:this.seq++,item:t,cancelled:!1};return this.heap.push(n),this.up(this.heap.length-1),this.live++,n}cancel(e){e.cancelled||(e.cancelled=!0,this.live--)}peek(){return this.drop(),this.heap[0]}pop(){this.drop();let e=this.heap[0];if(e)return this.remove0(),this.live--,e}clear(){this.heap=[],this.live=0,this.seq=0}list(){return this.heap.filter(e=>!e.cancelled).sort(w)}drop(){for(;this.heap[0]?.cancelled;)this.remove0()}remove0(){let e=this.heap.pop();this.heap.length&&(this.heap[0]=e,this.down(0))}up(e){let t=this.heap;for(;e>0;){let n=e-1>>1;if(w(t[e],t[n])>=0)break;[t[e],t[n]]=[t[n],t[e]],e=n}}down(e){let t=this.heap;for(;;){let n=2*e+1,r=n+1,i=e;if(n<t.length&&w(t[n],t[i])<0&&(i=n),r<t.length&&w(t[r],t[i])<0&&(i=r),i===e)return;[t[e],t[i]]=[t[i],t[e]],e=i}}};function w(e,t){return e.timeMs-t.timeMs||e.seq-t.seq}var T=(e,t)=>({id:e,name:t,bits:1,min:0,max:1,integer:!0}),E=[T(`1.001`,`Switch`),T(`1.002`,`Boolean`),T(`1.003`,`Enable`),T(`1.005`,`Alarm`),T(`1.007`,`Step`),T(`1.008`,`Up/Down`),T(`1.009`,`Open/Closed`),T(`1.010`,`Start/Stop`),T(`1.011`,`State`),T(`1.012`,`Invert`),T(`1.017`,`Trigger`),T(`1.018`,`Occupation`),T(`1.019`,`Window/Door`),T(`1.100`,`Heating/Cooling`),{id:`2.001`,name:`Priority control`,bits:2,min:0,max:3,integer:!0},{id:`3.007`,name:`Relative dimming`,bits:4,min:0,max:15,integer:!0},{id:`5.001`,name:`Percentage`,bits:8,min:0,max:100,integer:!1},{id:`5.010`,name:`Counter`,bits:8,min:0,max:255,integer:!0},{id:`17.001`,name:`Scene number`,bits:8,min:0,max:63,integer:!0},{id:`20.102`,name:`HVAC mode`,bits:8,min:0,max:4,integer:!0},{id:`9.001`,name:`Temperature`,bits:16,min:-273,max:670433.28,integer:!1},{id:`9.002`,name:`Temperature difference`,bits:16,min:-671088.64,max:670433.28,integer:!1},{id:`9.004`,name:`Lux`,bits:16,min:0,max:670433.28,integer:!1},{id:`9.005`,name:`Wind speed`,bits:16,min:0,max:670433.28,integer:!1},{id:`9.007`,name:`Humidity`,bits:16,min:0,max:670433.28,integer:!1},{id:`9.008`,name:`Air quality`,bits:16,min:0,max:670433.28,integer:!1},{id:`7.600`,name:`Colour temperature`,bits:16,codec:`u16`,min:0,max:65535,integer:!0},{id:`10.001`,name:`Time of day`,bits:24,codec:`time`,min:0,max:691199,integer:!0},{id:`11.001`,name:`Date`,bits:24,codec:`date`,min:19900101,max:20891231,integer:!0},{id:`13.010`,name:`Active energy`,bits:32,codec:`v32`,min:-2147483648,max:2147483647,integer:!0},{id:`14.056`,name:`Power`,bits:32,codec:`f32`,min:-34e37,max:34e37,integer:!1}],D=new DataView(new ArrayBuffer(4)),O=e=>(D.setFloat32(0,e),D.getUint32(0)),k=e=>(D.setUint32(0,e>>>0),D.getFloat32(0)),A=new Map(E.map(e=>[e.id,e])),j=E.map(e=>e.id);function ee(e){return A.get(e)}function te(e){return A.has(e)}function ne(e,t=c){switch(e){case`1.001`:return t`Switch`;case`1.002`:return t`Boolean`;case`1.003`:return t`Enable`;case`1.005`:return t`Alarm`;case`3.007`:return t`Relative dimming`;case`1.007`:return t`Step`;case`1.008`:return t`Up/Down`;case`1.009`:return t`Open/Close`;case`1.010`:return t`Start/Stop`;case`1.011`:return t`State`;case`1.012`:return t`Invert`;case`1.017`:return t`Trigger`;case`1.018`:return t`Occupancy`;case`1.019`:return t`Window/Door`;case`1.100`:return t`Heating/Cooling`;case`20.102`:return t`HVAC mode`;case`9.001`:return t`Temperature`;case`9.002`:return t`Temperature difference`;case`9.004`:return t`Lux`;case`9.005`:return t`Wind speed`;case`9.007`:return t`Humidity`;case`9.008`:return t`Air quality`;case`7.600`:return t`Colour temperature`;case`10.001`:return t`Time of day`;case`11.001`:return t`Date`;case`13.010`:return t`Active energy`;case`14.056`:return t`Power`;case`2.001`:return t`Priority control`;case`5.001`:return t`Percentage`;case`5.010`:return t`Counter`;case`17.001`:return t`Scene number`;default:return e}}function M(e,t=c){let n=A.get(e);return n?`${n.id} ${ne(e,t)}`:e}function N(e){return A.get(e)?.bits??(e.startsWith(`1.`)?1:8)}function re(e,t,n=c){let r=A.get(e);return r?Number.isFinite(t)?t<r.min||t>r.max?n`value ${t} outside the range ${r.min}…${r.max} of DPT ${e}`:r.bits===1&&t!==0&&t!==1?n`DPT ${e} only accepts 0 or 1`:r.integer&&r.bits!==1&&!Number.isInteger(t)?n`DPT ${e} expects an integer`:r.codec===`date`&&!P(t)?n`${t} is not a valid date (YYYYMMDD)`:null:n`finite number expected`:n`DPT ${e} not supported`}function P(e){let t=Math.floor(e/1e4),n=Math.floor(e/100)%100,r=e%100;return n<1||n>12||r<1?!1:r<=new Date(Date.UTC(t,n,0)).getUTCDate()}function F(e,t){let n=A.get(e);if(!n)throw Error(`DPT ${e} is not supported`);if(n.bits===1)return+!!t;if(e===`5.001`)return Math.round(Math.min(100,Math.max(0,t))*255/100);let r=Math.min(n.max,Math.max(n.min,t));if(n.codec===`time`){let e=Math.round(r),t=Math.floor(e/86400),n=e%86400;return t<<21|Math.floor(n/3600)<<16|Math.floor(n%3600/60)<<8|n%60}if(n.codec===`date`){let e=Math.round(r);return e%100<<16|Math.floor(e/100)%100<<8|Math.floor(e/1e4)%100}return n.codec===`u16`?Math.round(r):n.codec===`v32`?Math.round(r)>>>0:n.codec===`f32`?O(r):n.bits===16?ae(r):Math.min(n.max,Math.max(n.min,Math.round(t)))}function ie(e,t){let n=A.get(e);if(!n)throw Error(`DPT ${e} is not supported`);if(n.bits===1)return t&1;if(n.bits===2)return t&3;if(n.bits===4)return t&15;if(n.codec===`time`)return(t>>21&7)*86400+(t>>16&31)*3600+(t>>8&63)*60+(t&63);if(n.codec===`date`){let e=t&127;return(e>=90?1900+e:2e3+e)*1e4+(t>>8&15)*100+(t>>16&31)}return n.codec===`u16`?t&65535:n.codec===`v32`?t|0:n.codec===`f32`?k(t):n.bits===16?oe(t):e===`5.001`?(t&255)*100/255:e===`17.001`?t&63:t&255}function ae(e){if(!Number.isFinite(e)||e<-671088.64||e>670433.28)throw RangeError(`DPT 9.xxx value outside the representable range`);let t=e*100,n=0,r=Math.round(t);for(;(r<-2048||r>2047)&&n<15;)r=Math.round(t/2**++n);r=Math.min(2047,Math.max(-2048,r));let i=r&4095;return(i&2048)<<4|n<<11|i&2047}function oe(e){if((e&65535)==32767)throw RangeError(`DPT 9.xxx value 0x7FFF is invalid`);let t=e>>4&2048|e&2047,n=t&2048?t-4096:t,r=e>>11&15;return Math.round(n*2**r)/100}function se(e,t=c){switch(e){case 0:return t`Auto`;case 1:return t`Comfort`;case 2:return t`Standby`;case 3:return t`Economy`;case 4:return t`Protection`;default:return t`Reserved (${e})`}}function ce(e,t){return ie(e,F(e,t))}function I(e,t,n=c){if(t==null)return`—`;switch(e){case`1.001`:return t?n`On`:n`Off`;case`1.002`:return t?n`True`:n`False`;case`1.003`:return t?n`Enabled`:n`Disabled`;case`1.005`:return t?n`Alarm`:n`No alarm`;case`3.007`:{let e=fe(t);if(!e)return n`Stop dimming`;let r=Number.isInteger(e)?String(e):e.toFixed(1);return t&8?n`Increase by ${r} %`:n`Decrease by ${r} %`}case`1.007`:return t?n`Step increase`:n`Step decrease`;case`1.008`:return t?n`Down`:n`Up`;case`1.009`:return t?n`Closed`:n`Open`;case`1.010`:return t?n`Start`:n`Stop`;case`1.011`:return t?n`Active`:n`Inactive`;case`1.012`:return t?n`Inverted`:n`Not inverted`;case`1.017`:return n`Triggered`;case`2.001`:return t>=2?t===3?n`Forced on`:n`Forced off`:n`No forcing`;case`1.018`:return t?n`Occupied`:n`Vacant`;case`1.019`:return t?n`Open`:n`Closed`;case`1.100`:return t?n`Heating`:n`Cooling`;case`20.102`:return se(t,n);case`9.001`:return`${le(t,n)} °C`;case`9.002`:return`${t>0?`+`:``}${le(t,n)} K`;case`9.004`:return`${new Intl.NumberFormat(n.lang??`en`,{maximumFractionDigits:0}).format(t)} lx`;case`9.005`:return`${le(t,n)} m/s`;case`9.007`:return`${le(t,n)} %`;case`9.008`:return`${new Intl.NumberFormat(n.lang??`en`,{maximumFractionDigits:0}).format(t)} ppm`;case`7.600`:return`${Math.round(t)} K`;case`10.001`:return ue(t,n);case`11.001`:return de(t);case`13.010`:return`${new Intl.NumberFormat(n.lang??`en`).format(t)} Wh`;case`14.056`:return`${new Intl.NumberFormat(n.lang??`en`,{maximumFractionDigits:1}).format(t)} W`;case`5.001`:return`${Math.round(t)} %`;case`17.001`:return n`Scene ${t+1}`;default:return String(t)}}var le=(e,t)=>new Intl.NumberFormat(t.lang??`en`,{minimumFractionDigits:1,maximumFractionDigits:2}).format(e),L=e=>String(e).padStart(2,`0`);function ue(e,t=c){let n=Math.floor(e/86400),r=e%86400,i=`${L(Math.floor(r/3600))}:${L(Math.floor(r%3600/60))}:${L(r%60)}`,a=[``,t`Mon`,t`Tue`,t`Wed`,t`Thu`,t`Fri`,t`Sat`,t`Sun`];return n?`${a[n]} ${i}`:i}var de=e=>`${Math.floor(e/1e4)}-${L(Math.floor(e/100)%100)}-${L(e%100)}`;function fe(e){let t=e&7;return t?100/2**(t-1):0}function pe(e,t){if(t==null)return`–`;if(e===`5.001`)return`${Math.round(t)}%`;if(e===`3.007`)return t&7?t&8?`▲`:`▼`:`■`;if(e===`9.001`||e===`9.002`||e===`9.005`)return t.toFixed(1);if(e===`9.004`||e===`9.008`||e===`7.600`)return String(Math.round(t));if(e===`9.007`)return`${t.toFixed(0)}%`;if(e===`10.001`){let e=t%86400;return`${L(Math.floor(e/3600))}:${L(Math.floor(e%3600/60))}`}return e===`11.001`?`${L(t%100)}/${L(Math.floor(t/100)%100)}`:e===`14.056`?`${Math.round(t)}W`:e===`13.010`?Math.abs(t)>=1e4?`${(t/1e3).toFixed(1)}k`:String(t):e===`20.102`?[`A`,`C`,`S`,`E`,`P`][t]??String(t):String(Math.round(t*1e3)/1e3)}function me(e,t,n=c){return t==null?n`unknown`:e.startsWith(`9.`)?I(e,t,n):e===`20.102`?`${t} · ${se(t,n)}`:e===`5.001`?`${new Intl.NumberFormat(n.lang??`en`,{minimumFractionDigits:3,maximumFractionDigits:3}).format(t)} %`:String(t)}var he=e=>({id:`dev:${e}`,deviceId:e}),ge=(e,t)=>({id:`cpl:${e}:${t}`,couplerId:e,side:t});function _e(e){let t=new Map,n=[],r=new Map,i=e.topology,a=i.areas.map(e=>e.address),o=i.backbone||i.ip===`areaCouplers`,s=(e,n,r,i=!1)=>{let a={id:e,kind:n,ref:r,downstream:i,points:[]};return t.set(e,a),a},c=(t,n,i=!1)=>{let a=e.devices.filter(n);(i?a.reverse():a).forEach(e=>{t.points.push(he(e.id)),r.set(e.id,t.id)})},l=(e,t,r,i,a,o)=>{n.push({id:e,kind:t,address:r,line:i,A:{seg:a.id,point:`cpl:${e}:A`},B:{seg:o.id,point:`cpl:${e}:B`}})},u=i.ip?s(`IP`,`ip`,`IP`):null;u&&c(u,e=>e.medium===`IP`,!0);let d=i.backbone?s(`BB`,`backbone`,`0`):null;d&&c(d,e=>e.medium===`TP`&&e.line===`0.0`,!0);let f=new Map;return i.mainLines.forEach(e=>{let t=s(`ML${e}`,`main`,String(e));c(t,t=>t.medium===`TP`&&t.line===`${e}.0`,!0),f.set(e,t)}),o&&a.forEach(e=>{let t=f.get(e),n=i.ip===`areaCouplers`?u:d;t.points.push(ge(`AC${e}`,`B`)),n.points.push(ge(`AC${e}`,`A`)),l(`AC${e}`,i.ip===`areaCouplers`?`router`:`area`,`${e}.0.0`,null,n,t)}),[...e.lines].sort((e,t)=>_(e.address,t.address)).forEach(e=>{let t=s(`L${e.address}`,`line`,e.address),n=i.ip===`lineCouplers`?u:f.get(e.area)??null;if(n&&(t.points.push(ge(`LC${e.address}`,`B`)),n.points.push(ge(`LC${e.address}`,`A`)),l(`LC${e.address}`,i.ip===`lineCouplers`?`router`:`line`,`${e.address}.0`,e.address,n,t)),c(t,t=>t.medium===`TP`&&t.line===e.address&&!t.downstream),e.extension){t.points.push(ge(`EXT${e.address}`,`A`));let n=s(`L${e.address}b`,`line`,e.address,!0);n.points.push(ge(`EXT${e.address}`,`B`)),c(n,t=>t.medium===`TP`&&t.line===e.address&&t.downstream),l(`EXT${e.address}`,`extension`,e.extension.address,e.address,t,n)}}),{segments:t,couplers:n,deviceSegment:r}}var ve={emitMs:550,hopMs:250,couplerInMs:150,decisionMs:900,couplerOutMs:150,receiveMs:500},ye=6,be=class{constructor(e,t,n=c){S(this,`scenario`,void 0),S(this,`t`,void 0),S(this,`topology`,void 0),S(this,`modes`,new Map),S(this,`sideCache`,new Map),this.scenario=e,this.t=n,this.topology=t??_e(e),this.resetModes()}resetModes(){this.modes.clear(),this.scenario.lines.forEach(e=>e.extension&&this.modes.set(e.address,e.extension.mode)),this.sideCache.clear()}extMode(e){return this.modes.get(e)??`repeater`}setExtMode(e,t){this.modes.set(e,t),this.sideCache.clear()}coupler(e){return this.topology.couplers.find(t=>t.id===e)}isRepeater(e){return e.kind===`extension`&&this.extMode(e.line??``)!==`segmentCoupler`}couplerName(e){let t=this.t;return this.scenario.topology.couplers.get(e.address)?.name||(e.kind===`router`?this.scenario.topology.routerName:e.kind===`area`?t`Area coupler`:e.kind===`line`?t`Line coupler`:this.extMode(e.line??``)===`segmentCoupler`?t`Segment coupler`:t`Repeater`)}sideGAs(e,t){let n=e.id+t,r=this.sideCache.get(n);if(r)return r;let i=new Set,a=new Set([e[t].seg]),o=[e[t].seg];for(;o.length;){let t=o.shift();this.topology.segments.get(t)?.points.forEach(e=>{let t=e.deviceId?this.scenario.devicesById.get(e.deviceId):void 0;t?.inFilterTables&&(t.objects.forEach(e=>e.gas.forEach(e=>i.add(e))),t.tableGAs.forEach(e=>i.add(e)))}),this.topology.couplers.forEach(n=>{if(n.id===e.id)return;let r=n.A.seg===t?n.B.seg:n.B.seg===t?n.A.seg:null;r&&!a.has(r)&&(a.add(r),o.push(r))})}return this.sideCache.set(n,i),i}filterTable(e){if(this.isRepeater(e))return null;let t=this.sideGAs(e,`B`);return[...this.sideGAs(e,`A`)].filter(e=>t.has(e)).sort(_)}routing(e,t){let n=this.scenario.topology.couplers.get(e.address);return(t===`B`?n?.down:n?.up)??`filter`}passes(e,t,n){if(this.isRepeater(e))return!0;let r=this.routing(e,t);return r===`route`||r!==`block`&&this.sideGAs(e,`A`).has(n)&&this.sideGAs(e,`B`).has(n)}plan(e,t,n){let r=ve,i=n+r.emitMs,a={sourceDeviceId:e,ga:t,t0Ms:n,busMs:i,fronts:[],couplers:[],deliveries:[],endMs:i},o=e=>a.endMs=Math.max(a.endMs,e),s=this.topology.deviceSegment.get(e);if(!s)return a;let c=[{seg:s,point:`dev:${e}`,t:i,rc:6,via:null}],l=new Set;for(;c.length;){let n=c.shift();if(l.has(n.seg))continue;l.add(n.seg);let i=this.topology.segments.get(n.seg),s=i.points.findIndex(e=>e.id===n.point),u=i.points.map((e,t)=>n.t+Math.abs(t-s)*r.hopMs);a.fronts.push({segId:i.id,originIndex:s,tStartMs:n.t,arrivalsMs:u}),u.forEach(o),i.points.forEach((i,s)=>{let l=u[s];if(i.deviceId){if(i.deviceId===e)return;let s=this.scenario.devicesById.get(i.deviceId),c=s.objects.filter(e=>e.gas.includes(t)).map(e=>e.id),u=c.length?l+r.receiveMs:l;a.deliveries.push({deviceId:s.id,tArriveMs:l,tDeliverMs:u,rc:n.rc,objectIds:c}),o(u)}else if(i.couplerId&&i.couplerId!==n.via){let e=this.coupler(i.couplerId),s=i.side,u=s===`A`?`B`:`A`,d=this.passes(e,u,t)&&n.rc>0,f=l+r.couplerInMs,p=f+r.decisionMs,m=p+r.couplerOutMs,h=d?e.kind===`router`?`ip`:this.isRepeater(e)?`rep`:`pass`:`block`;a.couplers.push({couplerId:e.id,from:s,tArriveMs:l,tInMs:f,tDecisionMs:p,tOutMs:m,pass:d,tag:h,rcBefore:n.rc,rcAfter:d?n.rc-1:n.rc}),o(d?m:p+600),d&&c.push({seg:e[u].seg,point:e[u].point,t:m,rc:n.rc-1,via:e.id})}})}return a.couplers.sort((e,t)=>e.tInMs-t.tInMs),a.deliveries.sort((e,t)=>e.tArriveMs-t.tArriveMs),a}},xe={title:`Lamp`,description:`Lamp: lit while the relay output is closed.`,accepts:`switch`,parameters:{type:`object`,additionalProperties:!1,properties:{powerW:{title:`Rated power`,type:`number`,minimum:0,maximum:1e5,default:60,description:`Electrical power (W) drawn while the lamp is on; used by metering actuators. Any switched load can be represented with a matching power.`}}},powerW:(e,t)=>e.on?Number(t.powerW??60):0,initialState:{type:`object`,additionalProperties:!1,properties:{on:{title:`On at start`,type:`boolean`,default:!1}}},create:(e,t)=>({on:t.on===!0}),applyCommand:(e,t)=>t.type===`switch`&&t.on!==e.on?{on:t.on}:e},Se={title:`Appliance`,description:`Electrical appliance on a switched output (oven, water heater, socket): draws its rated power while powered.`,accepts:`switch`,parameters:{type:`object`,additionalProperties:!1,properties:{powerW:{title:`Rated power`,type:`number`,minimum:0,maximum:1e5,default:2e3,description:`Electrical power (W) drawn while the appliance is powered.`}}},powerW:(e,t)=>e.on?Number(t.powerW??2e3):0,initialState:{type:`object`,additionalProperties:!1,properties:{on:{title:`On at start`,type:`boolean`,default:!1}}},create:(e,t)=>({on:t.on===!0}),applyCommand:(e,t)=>t.type===`switch`&&t.on!==e.on?{on:t.on}:e},Ce=e=>e<=0?`top`:e>=100?`bottom`:null,we=(e,t,n=0,r=!1)=>e===`down`&&(t<100||r&&n<100)||e===`up`&&(t>0||r&&n>0),Te=e=>Math.max(0,Number(e.slatTravelMs??0)),Ee={title:`Roller shutter`,description:`Roller shutter: receives up/down/stop commands and moves through its actual travel, limited to 0–100%.`,accepts:`motor`,parameters:{type:`object`,additionalProperties:!1,required:[`actualTravelTimeMs`],properties:{actualTravelTimeMs:{title:`Actual travel time`,unit:`ms`,type:`integer`,exclusiveMinimum:0,description:`Actual time for one complete travel (ms).`},slatTravelMs:{title:`Actual slat rotation time`,unit:`ms`,type:`integer`,minimum:0,default:0,description:`Venetian blind: time for the slats to turn from open to closed (ms). The motor first turns the slats, then moves the blind. 0 describes a roller shutter without slats.`},wiringReversed:{title:`Motor wired in reverse`,expert:!0,type:`boolean`,default:!1,description:`Physical wiring with the up and down wires swapped: the motor turns opposite to the command. The actuator's “Inverted wiring” parameter compensates it.`}}},initialState:{type:`object`,additionalProperties:!1,properties:{positionPct:{title:`Actual position at start`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0},slatPct:{title:`Actual slat angle at start`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0}}},create:(e,t)=>{let n=Number(t.positionPct??0);return{positionPct:n,drive:`stop`,moving:!1,limit:Ce(n),slatPct:Number(t.slatPct??0)}},applyCommand(e,t,n){if(t.type!==`motor`)return e;let r=n.wiringReversed===!0&&t.direction!==`stop`?t.direction===`up`?`down`:`up`:t.direction;if(r===e.drive)return e;let i=Te(n)>0;return{...e,drive:r,moving:we(r,e.positionPct,e.slatPct,i)}},advance(e,t,n){if(!e.moving||t<=0)return e;let r=Number(n.actualTravelTimeMs),i=e.drive===`down`?1:-1,a=Te(n),o=t,s=e.slatPct;if(a>0){let e=i>0?100-s:s,t=Math.min(o,e*a/100);s=Math.min(100,Math.max(0,s+i*t*100/a)),o-=t}let c=Math.min(100,Math.max(0,e.positionPct+i*o*100/r));return{...e,positionPct:c,slatPct:s,moving:we(e.drive,c,s,a>0),limit:Ce(c)}}},De=(e,t)=>{if(t.type!==`dim`||typeof t.level!=`number`)return e;let n=Math.min(100,Math.max(0,t.level)),r=Number(t.fadeMs??0);return r<=0?{...e,levelPct:n,targetPct:n,ratePctPerMs:0}:{...e,targetPct:n,ratePctPerMs:Math.abs(n-e.levelPct)/r}},Oe=(e,t)=>{if(!e.ratePctPerMs||t<=0)return e;let n=e.targetPct-e.levelPct,r=e.ratePctPerMs*t;return Math.abs(n)<=r?{...e,levelPct:e.targetPct,ratePctPerMs:0}:{...e,levelPct:e.levelPct+Math.sign(n)*r}},ke={type:`object`,additionalProperties:!1,properties:{levelPct:{title:`Initial level`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0}}},Ae={title:`Dimmable lamp`,description:`Dimmable lamp: follows the commanded level with the requested fade; a tunable white lamp also follows the commanded colour temperature.`,accepts:`dim`,parameters:{type:`object`,additionalProperties:!1,properties:{powerW:{title:`Rated power`,type:`number`,minimum:0,maximum:1e5,default:40,description:`Electrical power (W) at full level; the drawn power is proportional to the level.`}}},powerW:(e,t)=>Number(t.powerW??40)*e.levelPct/100,initialState:ke,create:(e,t)=>{let n=Number(t.levelPct??0);return{levelPct:n,targetPct:n,ratePctPerMs:0}},applyCommand:(e,t)=>{let n=De(e,t);return t.type===`dim`&&typeof t.colourTemperatureK==`number`?{...n,colourTemperatureK:t.colourTemperatureK}:n},advance:(e,t)=>Oe(e,t)},je={title:`Fan`,description:`Ventilation fan: runs at the commanded speed (0–100 %) after a short ramp.`,accepts:`dim`,parameters:{type:`object`,additionalProperties:!1,properties:{powerW:{title:`Rated power`,type:`number`,minimum:0,maximum:1e5,default:50,description:`Electrical power (W) at full speed; the drawn power is proportional to the speed.`}}},powerW:(e,t)=>Number(t.powerW??50)*e.levelPct/100,initialState:ke,create:(e,t)=>{let n=Number(t.levelPct??0);return{levelPct:n,targetPct:n,ratePctPerMs:0}},applyCommand:(e,t)=>t.type===`dim`?De(e,{...t,fadeMs:2e3}):e,advance:(e,t)=>Oe(e,t)},Me=e=>{let t=0;for(let n=e;n;n&=n-1)t++;return t},Ne={title:`DALI group`,description:`DALI ballasts in a group: each has a short address (0–63) and follows the commanded level.`,accepts:`dim`,parameters:{type:`object`,additionalProperties:!1,properties:{ballasts:{title:`Number of ballasts`,type:`integer`,minimum:1,maximum:16,default:2,description:`Number of ballasts (luminaires) in the group.`},firstAddress:{title:`First short address`,type:`integer`,minimum:0,maximum:63,default:0,description:`Short DALI address of the first ballast; subsequent ballasts use consecutive addresses.`}}},initialState:{type:`object`,additionalProperties:!1,properties:{levelPct:{title:`Initial level`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0},failed:{title:`Faulty ballasts`,type:`integer`,minimum:0,maximum:16,default:0,description:`Number of ballasts initially reporting a lamp or ballast fault.`}}},checkParameters(e,t){let n=Number(e.ballasts??2),r=Number(e.firstAddress??0);return r+n-1>63?[{parameter:`firstAddress`,message:t`${n} ballasts from A${r} would reach A${r+n-1}: DALI short addresses stop at 63`}]:[]},create:(e,t)=>{let n=Number(t.levelPct??0),r=Math.min(Number(t.failed??0),Number(e.ballasts??2));return{levelPct:n,targetPct:n,ratePctPerMs:0,failed:r,failedMask:(1<<r)-1}},applyCommand:(e,t)=>De(e,t),advance:(e,t)=>Oe(e,t),interact(e,t,n,r){let i=Number(r);if(t!==`toggleBallast`||!Number.isInteger(i)||i<0||i>=Number(n.ballasts??2))return e;let a=e.failedMask^1<<i;return{...e,failedMask:a,failed:Me(a)}}},Pe=(e,t)=>e.energized===(t.normallyOpen===!0)?0:100,Fe={title:`Radiator`,description:`Radiator with a thermoelectric valve: gradual opening while powered; heat or cooling output is proportional to valve opening.`,accepts:`switch`,parameters:{type:`object`,additionalProperties:!1,properties:{openingTimeMs:{title:`Valve travel time`,unit:`ms`,type:`integer`,minimum:1e3,default:8e3,description:`Time for the valve to open fully (ms). Real valves take about 3 minutes; this is compressed like room time and should be short relative to the PWM period.`},normallyOpen:{title:`Valve open when de-energised`,type:`boolean`,default:!1,description:`Normally open valve: applying power closes it.`},powerK:{title:`Heating effect (K)`,type:`number`,minimum:1,maximum:60,default:25,description:`Temperature difference (K) from outdoors that this radiator can maintain alone with the valve fully open.`},emitter:{title:`Emitter`,type:`string`,enum:[`heating`,`cooling`],enumTitles:[`Heating`,`Cooling`],default:`heating`,description:`heating warms the room; cooling cools it, for example a fan coil with condensate drainage. Humidity and condensation are not modeled.`}}},initialState:{type:`object`,additionalProperties:!1,properties:{openPct:{title:`Initial opening`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0}}},create:(e,t)=>({openPct:Number(t.openPct??0),energized:!1,moving:!1}),applyCommand(e,t,n){if(t.type!==`switch`||t.on===e.energized)return e;let r={...e,energized:t.on};return{...r,moving:r.openPct!==Pe(r,n)}},advance(e,t,n){let r=Pe(e,n);if(e.openPct===r||t<=0)return e.moving?{...e,moving:!1}:e;let i=t*100/Number(n.openingTimeMs??8e3),a=r>e.openPct?Math.min(r,e.openPct+i):Math.max(r,e.openPct-i);return{...e,openPct:a,moving:a!==r}},heatOutput:(e,t)=>(t.emitter===`cooling`?-1:1)*(e.openPct/100)*Number(t.powerK??25)},Ie=(e,t=0,n=100)=>Math.min(n,Math.max(t,e));function Le(e,t){if(e.fadeMs<=0)return e.target;let n=Math.min(1,Math.max(0,(t-e.startMs)/e.fadeMs));return e.from+(e.target-e.from)*n}function Re(e){if(e<=0)return 0;let t=Ie(e,.1,100);return Math.round(1+253/3*(Math.log10(t)+1))}var ze=(e,t)=>e.device.channels.find(e=>e.id===t)?.parameters??{},R=(e,t)=>typeof e==`number`?e:t;function z(e,t,n){return e.device.objects.filter(e=>e.port===t&&(n===null?!e.channel:e.channel===n))}function Be(e,t){let n=e.state.channels[t].target;z(e,`status`,t).forEach(t=>e.setObject(t.id,+(n>0))),z(e,`valueStatus`,t).forEach(t=>e.setObject(t.id,n)),e.schedule(`${t}:status`,R(ze(e,t).statusDelayMs,300))}function Ve(e,t,n){if(!He(e))return;let r=t===null?e.t`broadcast`:e.t`group ${e.device.channels.find(e=>e.id===t)?.label??t}`;e.note(e.t`DALI: ${r} ← ${n}`)}var He=e=>e.device.behavior===`daliGateway/v1`;function Ue(e,t,n,r){let i=e.state.channels[t];if(!i)return;let a=Le(i,e.timeMs),o=Ie(n),s=Math.abs(o-a)<1e-9?0:Math.max(0,r);o===i.target&&s>0&&s===i.fadeMs||(a>0&&(i.last=a),i.from=a,i.target=o,i.startMs=e.timeMs,i.fadeMs=s,i.target>0&&(i.last=i.target),e.setOutput(t,We(i,i.fadeMs)),e.cancel(`${t}:status`),i.fadeMs>0?e.schedule(`${t}:end`,i.fadeMs):(e.cancel(`${t}:end`),Be(e,t)))}var We=(e,t)=>({type:`dim`,level:e.target,fadeMs:t,...e.kelvin===null?{}:{colourTemperatureK:e.kelvin}});function Ge(e,t,n){let r=e.state.channels[t];if(!r||r.kelvin===null)return;let i=ze(e,t),a=Math.round(Ie(n,R(i.minColourK,2700),R(i.maxColourK,6500)));if(a!==n&&e.note(e.t`${t}: ${n} K limited to ${a} K by the channel range`),a===r.kelvin)return;r.kelvin=a;let o=Math.max(0,r.startMs+r.fadeMs-e.timeMs);e.setOutput(t,We(r,o)),z(e,`colourTemperatureStatus`,t).forEach(t=>e.setObject(t.id,a)),e.schedule(`${t}:colour`,R(i.statusDelayMs,300))}function Ke(e,t,n){let r=ze(e,t),i=e.state.channels[t],a=R(r.switchFadeMs,0);if(!n)return Ve(e,t,e.t`OFF`),Ue(e,t,0,a);let o=r.onLevel===`last`?i.last||100:R(r.onLevelPct,100);Ve(e,t,o>=100?e.t`RECALL MAX LEVEL`:e.t`DAPC ${Re(o)} (${Math.round(o)} %)`),Ue(e,t,o,a)}function qe(e,t,n,r){let i=ze(e,t),a=n<=0?0:Ie(n,0,R(i.maxLevelPct,100));Ve(e,t,e.t`DAPC ${Re(a)} (${Math.round(a)} %)`),Ue(e,t,a,r??R(i.valueFadeMs,0))}function Je(e,t,n){let r=ze(e,t),i=e.state.channels[t],a=Le(i,e.timeMs),o=fe(n);if(!o)return Ve(e,t,e.t`dimming stopped at ${Math.round(a)} %`),Ue(e,t,a,0);let s=!!(n&8),c=R(r.minLevelPct,1),l=R(r.maxLevelPct,100);if(a<=0&&s&&r.dimSwitchesOn===!1){e.note(e.t`${t}: off, dimming does not switch on (parameter)`);return}if(a<=0&&!s)return;let u=r.dimSwitchesOff===!0?0:c,d=Ie(s?Math.max(a,c)+o:a-o,u,l),f=R(r.dimTimeMs,5e3);Ve(e,t,s?e.t`UP (dimming to ${Math.round(d)} %)`:e.t`DOWN (dimming to ${Math.round(d)} %)`),Ue(e,t,d,Math.abs(d-a)/100*f)}function Ye(e,t,n){let r=(n&63)+1;t.forEach(t=>{let n=e.device.channels.find(e=>e.id===t)?.scenes.get(r);if(n===void 0){e.note(e.t`${t}: no preset for scene ${r}, command ignored`);return}Ve(e,t,e.t`GO TO SCENE ${r-1} (${Math.round(n)} %)`),Ue(e,t,n,R(ze(e,t).valueFadeMs,0))})}function Xe(e,t){let n=0;e.device.channels.forEach(r=>{let i=e.state.channels[r.id];if(!i)return;let a=e.readEquipment(r.id),o=typeof a?.failed==`number`?a.failed:0;n+=o,o!==i.failures&&(i.failures=o,z(e,`error`,r.id).forEach(n=>{e.setObject(n.id,+(o>0)),t&&e.transmit(n.id)}),t&&e.note(o>0?e.t`DALI: ${o} faulty ballast(s) in group ${r.label}`:e.t`DALI: no more fault in group ${r.label}`))}),z(e,`generalError`,null).forEach(r=>{let i=+(n>0);e.getObject(r.id)!==i&&(e.setObject(r.id,i),t&&e.transmit(r.id))})}var Ze={type:`object`,additionalProperties:!1,properties:{onLevel:{title:`Switch-on value`,type:`string`,enum:[`fixed`,`last`],enumTitles:[`Set value`,`Last value`],default:`fixed`,description:`Level when switched on: fixed uses onLevelPct; last restores the level before switch-off.`},onLevelPct:{title:`Switch-on level`,unit:`%`,type:`number`,minimum:1,maximum:100,default:100,description:`Level reached when a value of 1 is received (fixed mode).`},dimTimeMs:{title:`Dimming time`,unit:`ms`,type:`integer`,exclusiveMinimum:0,default:5e3,description:`Time for a 0–100% relative dimming transition (DPT 3.007); smaller steps take less time.`},switchFadeMs:{title:`Fade on switching`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`Transition time when switching on or off (0 means immediate).`},valueFadeMs:{title:`Fade on value`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`Transition time to a received value (5.001) or scene preset.`},minLevelPct:{title:`Minimum level`,unit:`%`,expert:!0,type:`number`,minimum:0,maximum:50,default:1,description:`Minimum relative dimming level.`},maxLevelPct:{title:`Maximum level`,unit:`%`,expert:!0,type:`number`,minimum:50,maximum:100,default:100,description:`Upper limit for relative dimming and received values.`},dimSwitchesOn:{title:`Switch on by dimming`,expert:!0,type:`boolean`,default:!0,description:`An increase command turns on a channel that is off.`},dimSwitchesOff:{title:`Switch off by dimming`,expert:!0,type:`boolean`,default:!1,description:`A decrease command may dim to off; otherwise it stops at the minimum level.`},statusDelayMs:{title:`Status feedback delay`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:300,description:`Delay before sending status feedback (ms), after a transition completes.`},minColourK:{title:`Warmest colour temperature`,expert:!0,type:`integer`,minimum:1e3,maximum:1e4,default:2700,description:`Lowest colour temperature (K) of a tunable white channel; lower requests are limited to it.`},maxColourK:{title:`Coldest colour temperature`,expert:!0,type:`integer`,minimum:1e3,maximum:1e4,default:6500,description:`Highest colour temperature (K) of a tunable white channel; higher requests are limited to it.`}}},Qe={type:`object`,additionalProperties:!1,properties:{levelPct:{title:`Initial level`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0,description:`Level of the output when the simulation starts; 0 is off.`},colourTemperatureK:{title:`Initial colour temperature`,type:`integer`,minimum:1e3,maximum:1e4,default:4e3,description:`Colour temperature (K) at start, for a channel with a colourTemperature object.`}}};function $e(e,t){return{description:e,channelParameters:Ze,channelInitialState:Qe,ports:{switch:{dpts:[`1.001`],channel:`required`,title:`Switch`,direction:`in`},dim:{dpts:[`3.007`],channel:`required`,title:`Dimming`,direction:`in`},value:{dpts:[`5.001`],channel:`required`,title:`Value`,direction:`in`},status:{dpts:[`1.001`],channel:`required`,title:`Status`,direction:`out`},valueStatus:{dpts:[`5.001`],channel:`required`,title:`Value status`,direction:`out`},scene:{dpts:[`17.001`],channel:`optional`,title:`Scene`,direction:`in`},...t},output:`dim`,createState(e){let t={};return e.channels.forEach(n=>{let r=typeof n.initialState.levelPct==`number`?n.initialState.levelPct:0;t[n.id]={from:r,target:r,startMs:0,fadeMs:0,last:r||100,failures:0,kelvin:e.objects.some(e=>e.port===`colourTemperature`&&e.channel===n.id)?R(n.initialState.colourTemperatureK,4e3):null}}),{channels:t}},onInit(e){e.device.channels.forEach(t=>{let n=e.state.channels[t.id];e.setOutput(t.id,We(n,0)),z(e,`colourTemperatureStatus`,t.id).forEach(t=>n.kelvin===null?void 0:e.setObject(t.id,n.kelvin)),z(e,`status`,t.id).forEach(t=>e.setObject(t.id,+(n.target>0))),z(e,`valueStatus`,t.id).forEach(t=>e.setObject(t.id,n.target))}),He(e)&&(Xe(e,!1),e.schedule(`poll`,R(e.device.parameters.pollMs,2e3)))},onObjectWrite(e,t){let n=e.device.objects.find(e=>e.id===t.objectId);if(!n)return;let r=e.device.channels.map(e=>e.id);if(n.port===`broadcastSwitch`){e.note(e.t`DALI: broadcast ← ${t.newValue?e.t`RECALL MAX LEVEL`:e.t`OFF`}`),r.forEach(n=>Ue(e,n,t.newValue?100:0,0));return}if(n.port===`broadcastValue`){e.note(e.t`DALI: broadcast ← DAPC ${Re(t.newValue)} (${Math.round(t.newValue)} %)`),r.forEach(n=>Ue(e,n,t.newValue,0));return}if(n.port===`scene`)return Ye(e,n.channel?[n.channel]:r,t.newValue);n.channel&&(n.port===`switch`?Ke(e,n.channel,t.newValue!==0):n.port===`dim`?Je(e,n.channel,t.newValue):n.port===`value`?qe(e,n.channel,t.newValue):n.port===`colourTemperature`&&Ge(e,n.channel,t.newValue))},onTimer(e,t){if(t===`poll`){Xe(e,!0),e.schedule(`poll`,R(e.device.parameters.pollMs,2e3));return}let[n,r]=t.split(`:`);n&&(r===`end`?Be(e,n):r===`colour`?z(e,`colourTemperatureStatus`,n).forEach(t=>e.transmit(t.id)):r===`status`&&(z(e,`status`,n).forEach(t=>e.transmit(t.id)),z(e,`valueStatus`,n).forEach(t=>e.transmit(t.id))))},channelState(e,t){let n=e.channels[t];return n?{levelPct:n.target,fadeMs:n.fadeMs,failures:n.failures,colourTemperatureK:n.kelvin}:{}}}}var et=$e(`Dimmer: switching, relative (3.007) and absolute (5.001) dimming, tunable white (7.600), status feedback.`,{colourTemperature:{dpts:[`7.600`],channel:`required`,title:`Colour temperature`,direction:`in`,description:`colour temperature setpoint (K) of a tunable white channel`},colourTemperatureStatus:{dpts:[`7.600`],channel:`required`,title:`Colour temperature status`,direction:`out`,description:`applied colour temperature (K)`}}),tt={...$e(`KNX/DALI gateway: each channel is a DALI group of ballasts; broadcast, scenes and fault reporting.`,{error:{dpts:[`1.005`],channel:`required`,title:`Fault`,direction:`out`,description:`lamp or ballast fault in the group`},broadcastSwitch:{dpts:[`1.001`],channel:`none`,title:`Broadcast switching`,direction:`in`},broadcastValue:{dpts:[`5.001`],channel:`none`,title:`Broadcast value`,direction:`in`},generalError:{dpts:[`1.005`],channel:`none`,title:`General fault`,direction:`out`}}),parameters:{type:`object`,additionalProperties:!1,properties:{pollMs:{title:`Ballast polling`,unit:`ms`,expert:!0,type:`integer`,minimum:500,default:2e3,description:`Interval between ballast status polls for faults.`}}}},nt=e=>e===null?`null`:Array.isArray(e)?`array`:typeof e==`number`&&Number.isInteger(e)?`integer`:typeof e;function rt(e,t){let n=Array.isArray(e.type)?e.type:[e.type],r=nt(t);return n.some(e=>e===r||e===`number`&&(r===`integer`||r===`number`)&&Number.isFinite(t))}var it=(e,t)=>({integer:t`integer`,number:t`number`,boolean:t`boolean`,string:t`text`,null:`null`})[e]??e;function at(e,t,n,r,i=c){let a={};if(t!==void 0&&(typeof t!=`object`||!t||Array.isArray(t)))return r.push({path:n,code:`type`,message:i`object expected`}),a;let o=t??{},s=e?.properties??{};for(let t of Object.keys(o))Object.hasOwn(s,t)||r.push({path:`${n}.${t}`,code:`unknown-field`,message:e?i`unknown parameter “${t}”`:i`unknown parameter “${t}” (this behavior has no parameters)`});for(let[t,c]of Object.entries(s)){let s=o[t],l=`${n}.${t}`;if(s===void 0){e?.required?.includes(t)?r.push({path:l,code:`required`,message:i`required parameter`}):c.default!==void 0&&(a[t]=c.default);continue}if(!rt(c,s)){let e=(Array.isArray(c.type)?c.type:[c.type]).map(e=>it(e,i));r.push({path:l,code:`type`,message:i`${e.join(i` or `)} expected`});continue}if(typeof s==`number`&&(c.minimum!==void 0&&s<c.minimum||c.maximum!==void 0&&s>c.maximum||c.exclusiveMinimum!==void 0&&s<=c.exclusiveMinimum||c.exclusiveMaximum!==void 0&&s>=c.exclusiveMaximum)){let e=[c.minimum===void 0?``:`≥ ${c.minimum}`,c.exclusiveMinimum===void 0?``:`> ${c.exclusiveMinimum}`,c.maximum===void 0?``:`≤ ${c.maximum}`,c.exclusiveMaximum===void 0?``:`< ${c.exclusiveMaximum}`].filter(Boolean).join(` et `);r.push({path:l,code:`range`,message:i`value ${s} out of bounds (${e})`});continue}if(c.enum&&!c.enum.includes(s)){r.push({path:l,code:`enum`,message:i`unknown value “${String(s)}” (${c.enum.join(`, `)})`});continue}a[t]=s}return a}var ot=[`integer`,`number`,`boolean`,`string`,`null`],st=[`title`,`unit`,`expert`,`type`,`description`,`minimum`,`maximum`,`exclusiveMinimum`,`exclusiveMaximum`,`enum`,`enumTitles`,`nullTitle`,`default`],ct=[`minimum`,`maximum`,`exclusiveMinimum`,`exclusiveMaximum`];function lt(e,t,n){let r=l();if(e===void 0)return;let i=e;if(!i||typeof i!=`object`||i.type!==`object`||!i.properties||typeof i.properties!=`object`){n.push(r`${t}: { type: "object", properties: { … } } expected`);return}for(let e of Object.keys(i))[`type`,`description`,`properties`,`required`,`additionalProperties`].includes(e)||n.push(r`${t}.${e}: unsupported keyword (subset: type, properties, required, additionalProperties)`);i.additionalProperties!==void 0&&i.additionalProperties!==!1&&n.push(r`${t}.additionalProperties: only false is supported`),(i.required??[]).forEach(e=>{Object.hasOwn(i.properties,e)||n.push(r`${t}.required: “${e}” is not a declared property`)});for(let[e,a]of Object.entries(i.properties)){let i=`${t}.properties.${e}`;if(!a||typeof a!=`object`){n.push(r`${i}: object expected`);continue}for(let e of Object.keys(a))st.includes(e)||n.push(r`${i}.${e}: unsupported keyword (scalar values only)`);let o=Array.isArray(a.type)?a.type:[a.type];if((!o.length||o.some(e=>!ot.includes(e)))&&n.push(r`${i}.type: ${ot.join(`, `)} (or a list of these types) expected`),ct.forEach(e=>{let t=a[e];t!==void 0&&(typeof t!=`number`||!Number.isFinite(t))&&n.push(r`${i}.${e}: finite number expected`)}),a.enum!==void 0&&(!Array.isArray(a.enum)||!a.enum.length)&&n.push(r`${i}.enum: non-empty list expected`),a.enumTitles!==void 0&&(!Array.isArray(a.enum)||!Array.isArray(a.enumTitles)||a.enumTitles.length!==a.enum.length||a.enumTitles.some(e=>typeof e!=`string`))&&n.push(r`${i}.enumTitles: one label (text) per “enum” value expected`),a.default!==void 0){let t=[];at({type:`object`,properties:{[e]:a}},{[e]:a.default},i,t),t.forEach(e=>n.push(r`${i}.default: ${e.message}`))}}}function ut(e){if(e===void 0)return e;let t=structuredClone(e),n=e=>{e&&typeof e==`object`&&(Object.values(e).forEach(n),Object.freeze(e))};return n(t),t}function dt(e,t){let n=l(),r=[];if(!t||typeof t!=`object`)throw TypeError(n`Behavior “${e}”: definition expected`);if(typeof t.createState!=`function`&&r.push(n`createState: function required`),!t.ports||typeof t.ports!=`object`)r.push(n`ports: object required (possibly empty)`);else for(let[e,i]of Object.entries(t.ports)){if(!i||typeof i!=`object`){r.push(n`ports.${e}: object expected`);continue}i.dpts!==`any`&&(!Array.isArray(i.dpts)||i.dpts.some(e=>!te(e)))&&r.push(n`ports.${e}.dpts: "any" or list of supported DPTs expected`),i.channel!==void 0&&![`required`,`optional`,`none`].includes(i.channel)&&r.push(n`ports.${e}.channel: "required", "optional" or "none" expected`),i.direction!==void 0&&![`in`,`out`].includes(i.direction)&&r.push(n`ports.${e}.direction: "in" or "out" expected`)}if(t.output!==void 0&&![`switch`,`motor`,`dim`].includes(t.output)&&r.push(n`output: "switch", "motor" or "dim" expected`),[`onInit`,`onInput`,`onObjectWrite`,`onTick`,`onTimer`,`onRoomChange`,`channelState`,`deviceState`].forEach(e=>{let i=t[e];i!==void 0&&typeof i!=`function`&&r.push(n`${e}: function expected`)}),lt(t.parameters,`parameters`,r),lt(t.channelParameters,`channelParameters`,r),lt(t.channelInitialState,`channelInitialState`,r),r.length)throw TypeError(n`Invalid behavior “${e}”:`+`\n• ${r.join(`
• `)}`);return Object.freeze({...t,ports:ut(t.ports),parameters:ut(t.parameters),channelParameters:ut(t.channelParameters),channelInitialState:ut(t.channelInitialState)})}function ft(e,t){let n=l(),r=[];if(!t||typeof t!=`object`)throw TypeError(n`Equipment “${e}”: definition expected`);if(typeof t.create!=`function`&&r.push(n`create: function required`),typeof t.applyCommand!=`function`&&r.push(n`applyCommand: function required`),t.advance!==void 0&&typeof t.advance!=`function`&&r.push(n`advance: function expected`),t.interact!==void 0&&typeof t.interact!=`function`&&r.push(n`interact: function expected`),t.checkParameters!==void 0&&typeof t.checkParameters!=`function`&&r.push(n`checkParameters: function expected`),t.heatOutput!==void 0&&typeof t.heatOutput!=`function`&&r.push(n`heatOutput: function expected`),[`switch`,`motor`,`dim`].includes(t.accepts)||r.push(n`accepts: "switch", "motor" or "dim" expected`),lt(t.parameters,`parameters`,r),lt(t.initialState,`initialState`,r),r.length)throw TypeError(n`Invalid equipment “${e}”:`+`\n• ${r.join(`
• `)}`);return Object.freeze({...t,parameters:ut(t.parameters),initialState:ut(t.initialState)})}var pt={description:`USB interface: writes and reads group addresses from the USB interface panel of the diagram.`,parameters:{type:`object`,additionalProperties:!1,properties:{groupAddresses:{title:`Group addresses assigned to the interface`,type:`string`,default:``,description:`Group addresses assigned to this interface in the project, separated by spaces or commas. Coupler filter tables include them, so telegrams on these addresses cross couplers to and from the interface. Without them, a coupler filters an address that is not used on the interface side.`}}},ports:{},createState:()=>({})},mt=[`and`,`or`,`xor`,`not`];function ht(e){return e.device.objects.filter(e=>e.port===`logicIn`).map(t=>+!!e.getObject(t.id))}function gt(e,t){switch(e){case`and`:return t.length&&t.every(e=>e===1)?1:0;case`or`:return+!!t.some(e=>e===1);case`xor`:return t.filter(e=>e===1).length%2;case`not`:return t[0]===1?0:1}}var _t=e=>{let t=/^(\d{1,2}):(\d{2})$/.exec(String(e??``).trim());return t&&Number(t[1])<24&&Number(t[2])<60?Number(t[1])*60+Number(t[2]):null};function vt(e,t,n){let r=Math.floor(e%86400/60);return t<=n?r>=t&&r<n:r>=t||r<n}function yt(e){let t=_t(e.device.parameters.activeFrom),n=_t(e.device.parameters.activeTo);if(t===null||n===null)return!0;let r=e.device.objects.find(e=>e.port===`time`),i=r?e.getObject(r.id):null;return i!==null&&vt(i,t,n)}function bt(e,t,n=!1){let r=e.device.parameters,i=mt.includes(String(r.operation))?r.operation:`and`,a=e.device.objects.find(e=>e.port===`enable`);if(a&&e.getObject(a.id)===0){e.note(e.t`Logic module disabled: output not sent`);return}let o=ht(e),s=(!o.length||gt(i,o))&&yt(e)?1:0,c=e.device.objects.find(e=>e.port===`logicOut`);if(c){if(!t&&r.sendOnChangeOnly!==!1&&s===e.state.sent){n||e.note(e.t`Logic result unchanged (${s}): no telegram`);return}e.state.sent=s,e.setObject(c.id,s),e.transmit(c.id)}}var xt={description:`Logic module: combines one-bit inputs (AND, OR, XOR, NOT) and sends the result; an optional enable object blocks the output.`,parameters:{type:`object`,additionalProperties:!1,properties:{operation:{title:`Operation`,type:`string`,enum:[...mt],enumTitles:[`AND`,`OR`,`XOR`,`NOT (first input)`],default:`and`,description:`Logic function applied to the inputs; an input with no value yet counts as 0.`},activeFrom:{title:`Time window from`,type:`string`,default:``,description:`Start of a daily time window (HH:MM). With activeTo and a time object, the output is 1 only inside the window; the window may cross midnight.`},activeTo:{title:`Time window to`,type:`string`,default:``,description:`End of the daily time window (HH:MM), excluded.`},sendOnChangeOnly:{title:`Send on change only`,expert:!0,type:`boolean`,default:!0,description:`Send the result only when it differs from the last transmitted value.`}}},ports:{logicIn:{dpts:[`1.001`,`1.002`,`1.003`,`1.005`,`1.018`,`1.019`],channel:`none`,title:`Logic input`,direction:`in`,description:`one-bit input of the logic function`},enable:{dpts:[`1.003`,`1.001`],channel:`none`,title:`Enable`,direction:`in`,description:`0 blocks the output; 1 enables it again and sends the current result`},time:{dpts:[`10.001`],channel:`none`,title:`Time of day`,direction:`in`,description:`time received from a clock master, used by the time window`},logicOut:{dpts:[`1.001`,`1.002`,`1.003`,`1.005`,`1.008`,`1.009`],channel:`none`,title:`Logic output`,direction:`out`,description:`result of the logic function`}},createState:()=>({sent:null}),onObjectWrite(e,t){let n=e.device.objects.find(e=>e.id===t.objectId);n?.port===`logicIn`?bt(e,!1):n?.port===`time`?bt(e,!1,!0):n?.port===`enable`&&t.newValue===1&&bt(e,!0)},deviceState(e){return{result:e.sent}}},St=[{out:`windAlarm`,source:`wind`,on:`windThreshold`,hyst:`windHysteresis`,defaults:[10,2]},{out:`sunProtection`,source:`brightness`,on:`brightnessThreshold`,hyst:`brightnessHysteresis`,defaults:[4e4,5e3]}],Ct=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t;function wt(e){let t=e.device.parameters;for(let n of St){let r=e.device.objects.find(e=>e.port===n.source),i=e.device.objects.find(e=>e.port===n.out);if(!r||!i)continue;let a=e.getObject(r.id);if(a===null)continue;let o=Ct(t[n.on],n.defaults[0]),s=Ct(t[n.hyst],n.defaults[1]),c=e.state.alarms[n.out]??0,l=c?a<=o-s?0:1:+(a>=o);l!==c&&(e.state.alarms[n.out]=l,e.note(l?e.t`${a} reaches the threshold ${o}: output set`:e.t`${a} is below ${o-s} (threshold − hysteresis): output reset`),e.setObject(i.id,l),e.transmit(i.id))}}var Tt={description:`Weather station: sends measured wind speed, brightness, and temperature; sets one-bit outputs when wind or brightness thresholds are reached.`,parameters:{type:`object`,additionalProperties:!1,properties:{windThreshold:{title:`Wind alarm threshold`,type:`number`,minimum:0,default:10,description:`Wind speed (m/s) at which the wind alarm is set.`},windHysteresis:{title:`Wind alarm hysteresis`,expert:!0,type:`number`,minimum:0,default:2,description:`The alarm is reset when the wind speed falls below threshold − hysteresis (m/s).`},brightnessThreshold:{title:`Sun protection threshold`,type:`number`,minimum:0,default:4e4,description:`Brightness (lux) at which sun protection is requested.`},setsRoomOutdoorTemperature:{title:`Outdoor temperature applies to the rooms`,type:`boolean`,default:!0,description:`An entered outdoor temperature also becomes the outdoor temperature of every room in the thermal model, so that the building reacts to it.`},brightnessHysteresis:{title:`Sun protection hysteresis`,expert:!0,type:`number`,minimum:0,default:5e3,description:`The request is reset when brightness falls below threshold − hysteresis (lux).`}}},ports:{wind:{dpts:[`9.005`],channel:`none`,title:`Wind speed`,direction:`out`,description:`measured wind speed (m/s), sent when entered`},brightness:{dpts:[`9.004`],channel:`none`,title:`Brightness`,direction:`out`,description:`measured brightness (lux), sent when entered`},outdoorTemp:{dpts:[`9.001`],channel:`none`,title:`Outdoor temperature`,direction:`out`,description:`measured outdoor temperature (°C), sent when entered`},windAlarm:{dpts:[`1.005`,`1.001`],channel:`none`,title:`Wind alarm`,direction:`out`,description:`1 when the wind threshold is reached, 0 after hysteresis`},sunProtection:{dpts:[`1.001`,`1.002`],channel:`none`,title:`Sun protection`,direction:`out`,description:`1 when the brightness threshold is reached, 0 after hysteresis`}},acceptsInputs:!0,createState:()=>({alarms:{}}),onInput(e,t){if(t.gesture!==`value`||t.value===void 0)return;let n=e.device.inputs.find(e=>e.id===t.inputId);n&&(e.device.objects.find(e=>e.id===n.object)?.port===`outdoorTemp`&&e.device.parameters.setsRoomOutdoorTemperature!==!1&&(e.setOutsideTemperature(t.value),e.note(e.t`Outdoor temperature of the rooms set to ${t.value} °C`)),e.setObject(n.object,t.value),e.transmit(n.object),wt(e))},deviceState(e){return{...e.alarms}}},B=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t,Et=(e,t)=>{let n=e.device.objects.find(e=>e.port===t);return n?e.getObject(n.id):null};function Dt(e,t,n){e.device.objects.filter(e=>e.port===t).forEach(t=>{e.setObject(t.id,n),e.transmit(t.id)})}function Ot(e,t,n,r,i){if(n===null)return;let a=e.state[t],o=a?n<=r-i?0:1:+(n>=r);o!==a&&(e.state[t]=o,e.note(o?e.t`${n} reaches the alarm threshold ${r}: alarm set`:e.t`${n} is below ${r-i}: alarm reset`),Dt(e,t,o))}function kt(e,t,n,r){let i=t;for(;i<n.length&&e>=n[i]+r;)i++;for(;i>0&&e<n[i-1]-r;)i--;return i}function At(e){let t=Et(e,`co2`);if(t===null)return;let n=e.device.parameters,r=[B(n.step1Ppm,800),B(n.step2Ppm,1e3),B(n.step3Ppm,1200)].sort((e,t)=>e-t),i=e.state,a=kt(t,i.step,r,B(n.stepHysteresisPpm,50));if(a===i.step)return;let o=B(n.minStepTimeMs,0),s=i.stepAtMs===null?1/0:e.timeMs-i.stepAtMs;if(s<o){e.schedule(`step`,o-s),e.note(e.t`Ventilation step kept for its minimum time`);return}i.step=a,i.stepAtMs=e.timeMs;let c=[B(n.step0Pct,0),B(n.step1Pct,33),B(n.step2Pct,66),B(n.step3Pct,100)];e.note(e.t`CO₂ ${t} ppm: ventilation step ${a}`),Dt(e,`ventilation`,c[a])}function jt(e){let t=e.device.parameters;Ot(e,`co2Alarm`,Et(e,`co2`),B(t.co2AlarmPpm,1500),B(t.co2AlarmHysteresisPpm,100)),Ot(e,`humidityAlarm`,Et(e,`humidity`),B(t.humidityAlarmPct,70),B(t.humidityAlarmHysteresisPct,5)),At(e)}var Mt=(e,t,n)=>({title:e,type:`number`,minimum:0,maximum:1e4,default:t,description:n}),Nt=(e,t,n)=>({title:e,type:`number`,unit:`%`,minimum:0,maximum:100,default:t,description:n}),Pt={description:`Air quality sensor: sends measured temperature, relative humidity, and CO₂; sets alarms at thresholds and controls ventilation in three steps.`,parameters:{type:`object`,additionalProperties:!1,properties:{co2AlarmPpm:Mt(`CO₂ alarm threshold`,1500,`CO₂ concentration (ppm) at which the CO₂ alarm is set.`),co2AlarmHysteresisPpm:{...Mt(`CO₂ alarm hysteresis`,100,`The CO₂ alarm is reset below threshold − hysteresis (ppm).`),expert:!0},humidityAlarmPct:Nt(`Humidity alarm threshold`,70,`Relative humidity (%) at which the humidity alarm is set.`),humidityAlarmHysteresisPct:{...Nt(`Humidity alarm hysteresis`,5,`The humidity alarm is reset below threshold − hysteresis (%).`),expert:!0},step1Ppm:Mt(`Threshold step 0 ↔ 1`,800,`CO₂ concentration (ppm) between ventilation steps 0 and 1.`),step2Ppm:Mt(`Threshold step 1 ↔ 2`,1e3,`CO₂ concentration (ppm) between ventilation steps 1 and 2.`),step3Ppm:Mt(`Threshold step 2 ↔ 3`,1200,`CO₂ concentration (ppm) between ventilation steps 2 and 3.`),stepHysteresisPpm:{...Mt(`Step hysteresis`,50,`A step changes only above threshold + hysteresis or below threshold − hysteresis (ppm).`),expert:!0},step0Pct:{...Nt(`Control value step 0`,0,`Ventilation control value (%) sent in step 0.`),expert:!0},step1Pct:{...Nt(`Control value step 1`,33,`Ventilation control value (%) sent in step 1.`),expert:!0},step2Pct:{...Nt(`Control value step 2`,66,`Ventilation control value (%) sent in step 2.`),expert:!0},step3Pct:{...Nt(`Control value step 3`,100,`Ventilation control value (%) sent in step 3.`),expert:!0},minStepTimeMs:{title:`Minimum time per step`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`A step is kept at least this long before the next change (0 disables it).`}}},ports:{temperature:{dpts:[`9.001`],channel:`none`,title:`Temperature`,direction:`out`,description:`measured temperature (°C), sent when entered`},humidity:{dpts:[`9.007`],channel:`none`,title:`Relative humidity`,direction:`out`,description:`measured relative humidity (%), sent when entered`},co2:{dpts:[`9.008`],channel:`none`,title:`CO₂`,direction:`out`,description:`measured CO₂ concentration (ppm), sent when entered`},co2Alarm:{dpts:[`1.005`,`1.001`],channel:`none`,title:`CO₂ alarm`,direction:`out`,description:`1 when the CO₂ alarm threshold is reached, 0 after hysteresis`},humidityAlarm:{dpts:[`1.005`,`1.001`],channel:`none`,title:`Humidity alarm`,direction:`out`,description:`1 when the humidity alarm threshold is reached, 0 after hysteresis`},ventilation:{dpts:[`5.001`],channel:`none`,title:`Ventilation control value`,direction:`out`,description:`control value (%) of the current ventilation step`}},acceptsInputs:!0,createState:()=>({step:0,stepAtMs:null,co2Alarm:0,humidityAlarm:0}),onInput(e,t){if(t.gesture!==`value`||t.value===void 0)return;let n=e.device.inputs.find(e=>e.id===t.inputId);n&&(e.setObject(n.object,t.value),e.transmit(n.object),jt(e))},onTimer(e,t){t===`step`&&At(e)},deviceState(e){return{step:e.step,co2Alarm:e.co2Alarm,humidityAlarm:e.humidityAlarm}}},Ft=6e4,V=864e5,It=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t,Lt=e=>{let t=new Date(e).getUTCDay();return t===0?7:t},Rt=e=>Lt(e)*86400+Math.floor((e%V+V)%V/1e3),zt=e=>{let t=new Date(e);return t.getUTCFullYear()*1e4+(t.getUTCMonth()+1)*100+t.getUTCDate()};function Bt(e,t,n){e.device.objects.filter(e=>e.port===t).forEach(t=>{e.setObject(t.id,n),e.transmit(t.id)})}function Vt(e,t){e.device.objects.forEach(n=>{n.port===`time`&&e.setObject(n.id,Rt(t)),n.port===`date`&&e.setObject(n.id,zt(t))})}function Ht(e){let t=e.clock(),n=It(e.device.parameters.sendPeriodMin,1)*Ft;if(!t||n<=0)return;let r=n-t.nowMs%n;e.schedule(`send`,Math.max(1,Math.round(r/t.speed)))}function Ut(e){let t=e.clock();t&&e.state.lastMs!==t.nowMs&&(e.state.lastMs=t.nowMs,Bt(e,`time`,Rt(t.nowMs)),Bt(e,`date`,zt(t.nowMs)))}var Wt={description:`Clock master: sends the time of day (10.001) and the date (11.001) of the simulated clock at a fixed period and after the clock is set.`,parameters:{type:`object`,additionalProperties:!1,properties:{sendPeriodMin:{title:`Send period`,type:`integer`,minimum:0,maximum:1440,default:1,description:`Clock minutes between two broadcasts, aligned on the clock (1 = every full minute); 0 sends only at start and after the clock is set.`},sendOnStart:{title:`Send on start`,type:`boolean`,default:!0,description:`Send time and date shortly after the simulation starts.`},startDelayMs:{title:`Start-up send delay`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:1e3,description:`Delay after the simulation starts before time and date are sent.`}}},ports:{time:{dpts:[`10.001`],channel:`none`,title:`Time of day`,direction:`out`,description:`day of week and time of the simulated clock`},date:{dpts:[`11.001`],channel:`none`,title:`Date`,direction:`out`,description:`date of the simulated clock`}},createState:()=>({lastMs:null}),onInit(e){let t=e.clock();if(!t){e.note(e.t`Clock master: the scenario declares no clock`);return}Vt(e,t.nowMs),e.device.parameters.sendOnStart!==!1&&e.schedule(`start`,It(e.device.parameters.startDelayMs,1e3)),Ht(e)},onTimer(e,t){t===`start`&&Ut(e),t===`send`&&(Ut(e),Ht(e))},onClockChange(e){e.state.lastMs=null,Ut(e),e.cancel(`send`),Ht(e)}},Gt=[`mon`,`tue`,`wed`,`thu`,`fri`,`sat`,`sun`];function Kt(e){let t=e.trim().toLowerCase();if(t===`daily`||t===`*`||t===`mon-sun`)return[1,2,3,4,5,6,7];let n=new Set;for(let e of t.split(`,`)){let[t,r]=e.trim().split(`-`),i=Gt.indexOf(t??``),a=r===void 0?i:Gt.indexOf(r);if(i<0||a<0)return null;for(let e=i;n.add(e+1),e!==a;e=(e+1)%7);}return[...n].sort()}function qt(e){let t=[],n=[];for(let r of e.split(/[;\n]/)){let e=r.trim();if(!e)continue;let i=/^(.+?)\s+(\d{1,2}):(\d{2})\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(e),a=i?Kt(i[1]):null,o=i?Number(i[2]):NaN,s=i?Number(i[3]):NaN;if(!i||!a||o>23||s>59){n.push(e);continue}t.push({days:a,minute:o*60+s,value:Number(i[4])})}return{entries:t,errors:n}}function Jt(e,t){let n=t-(t%V+V)%V,r=null;for(let i=0;i<=7;i++){let a=n+i*V,o=Lt(a);for(let n of e){let e=a+n.minute*Ft;n.days.includes(o)&&e>t&&(!r||e<r.atMs)&&(r={atMs:e,entry:n})}if(r)return r}return r}function Yt(e,t){let n=t-(t%V+V)%V,r=null;for(let i=0;i<=7;i++){let a=n-i*V,o=Lt(a);for(let n of e){let e=a+n.minute*Ft;n.days.includes(o)&&e<=t&&(!r||e>r.atMs)&&(r={atMs:e,entry:n})}if(r)return r.entry}return null}var Xt=e=>`${String(Math.floor(e/60)).padStart(2,`0`)}:${String(e%60).padStart(2,`0`)}`;function Zt(e){return qt(String(e.device.parameters.program??``))}function Qt(e,t){let n=e.clock();if(e.cancel(`next`),e.state.nextAtMs=null,!n)return;let r=Jt(Zt(e).entries,Math.max(n.nowMs,t??0));r&&(e.state.nextAtMs=r.atMs,e.schedule(`next`,Math.max(1,Math.round((r.atMs-n.nowMs)/n.speed))))}function $t(e){let t=e.clock();if(!t)return;let n=Yt(Zt(e).entries,t.nowMs);n&&(e.note(e.t`Time switch: program of ${Xt(n.minute)} applies (${n.value})`),Bt(e,`output`,n.value))}var en={description:`Weekly time switch: sends the programmed value on its output objects at the programmed times of the simulated clock.`,parameters:{type:`object`,additionalProperties:!1,properties:{program:{title:`Weekly program`,type:`string`,default:``,description:`Switching points separated by semicolons: days, time, and value, for example “Mon-Fri 07:00 = 1; Sat,Sun 09:00 = 1; Daily 22:30 = 0”. Days: Mon … Sun, ranges (Mon-Fri), lists (Sat,Sun), or Daily.`},sendOnStart:{title:`Send current state on start`,type:`boolean`,default:!0,description:`At start, and after the clock is set, send the value of the most recent switching point.`}}},ports:{output:{dpts:[`1.001`,`1.002`,`1.003`,`1.008`,`5.001`,`5.010`,`17.001`,`20.102`],channel:`none`,title:`Output`,direction:`out`,description:`object that receives the programmed values`}},createState:()=>({nextAtMs:null}),onInit(e){if(!e.clock()){e.note(e.t`Time switch: the scenario declares no clock`);return}let{errors:t}=Zt(e);t.length&&e.note(e.t`Time switch: entries ignored: ${t.join(`; `)}`),e.device.parameters.sendOnStart!==!1&&e.schedule(`start`,1e3),Qt(e)},onTimer(e,t){if(t===`start`&&$t(e),t!==`next`)return;let n=e.clock(),r=Math.max(n?.nowMs??0,e.state.nextAtMs??0),i=n?Yt(Zt(e).entries,r):null;i&&(e.note(e.t`Time switch: ${Xt(i.minute)} → ${i.value}`),Bt(e,`output`,i.value)),Qt(e,r)},onClockChange(e){e.device.parameters.sendOnStart!==!1&&$t(e),Qt(e)},deviceState(e){return{nextAtMs:e.nextAtMs}}},H=(e,t)=>typeof e==`number`?e:t,tn=(e,t=0,n=100)=>Math.min(n,Math.max(t,e)),nn=e=>(Math.round(e*10)/10).toFixed(1),U={auto:0,comfort:1,standby:2,economy:3,protection:4},rn=e=>e.device.parameters;function W(e,t){return e.device.objects.filter(e=>e.port===t)}function an(e,t,n){W(e,t).forEach(t=>{e.getObject(t.id)!==n&&(e.setObject(t.id,n),e.transmit(t.id))})}function on(e){return e.window?U.protection:e.presence||e.preset===U.auto?U.comfort:e.preset}function sn(e,t,n){let r=rn(e);if(n===U.protection)return t.heating?H(r.frostProtectionC,7):H(r.heatProtectionC,35);let i=n===U.standby?H(r.standbyShiftK,2):n===U.economy?H(r.economyShiftK,4):0;return t.heating?t.baseC-i:t.baseC+H(r.deadZoneK,3)+i}function cn(e){let t=e.state,n=on(t),r=sn(e,t,n);if(n!==t.mode){let i=t.window?e.t`window open`:t.presence?e.t`presence`:e.t`preset`;e.note(e.t`thermostat: ${ln(e,n)} mode (${i}), setpoint ${nn(r)} °C`)}else r!==t.setpointC&&e.note(e.t`thermostat: setpoint ${nn(r)} °C`);t.mode=n,t.setpointC=r,an(e,`hvacModeStatus`,n),an(e,`setpointStatus`,r),an(e,`heatCoolStatus`,+!!t.heating)}function ln(e,t){switch(t){case U.comfort:return e.t`comfort`;case U.standby:return e.t`standby`;case U.economy:return e.t`economy`;case U.protection:return e.t`protection`;default:return e.t`auto`}}function un(e){let t=e.state,n=W(e,`externalTemp`).map(t=>e.getObject(t.id)).find(e=>e!==null),r=H(rn(e).externalTempTimeoutMs,0),i=r>0&&t.externalAtMs!==null&&e.timeMs-t.externalAtMs>r;return i!==t.externalStale&&(t.externalStale=i,e.note(i?e.t`thermostat: no external temperature for ${r/1e3} s: internal sensor used`:e.t`thermostat: external temperature received again`)),n!=null&&!i?n:e.readRoom()?.temperatureC??null}function dn(e,t){let n=e.state,r=rn(e),i=un(e);if(i===null){n.warned||e.note(e.t`thermostat: no temperature (room or “externalTemp” object): no control`),n.warned=!0;return}n.measuredC=i,fn(e,i);let a=n.heating?n.setpointC-i:i-n.setpointC;if((r.controlType===`twoPoint`?`twoPoint`:`pi`)==`twoPoint`){let e=H(r.hysteresisK,.5);n.switchOn&&a<=0?n.switchOn=!1:!n.switchOn&&a>=e&&(n.switchOn=!0),n.valuePct=n.switchOn?100:0}else{let e=100/Math.max(.1,H(r.proportionalBandK,2)),i=H(r.integralTimeMs,12e4),o=e*a,s=n.integral+(i>0?e*a*t/i:0),c=o+s;c>100&&a>0||c<0&&a<0||(n.integral=tn(s,-100,100)),i<=0&&(n.integral=0),n.valuePct=tn(o+n.integral)}pn(e),mn(e)}function fn(e,t){let n=e.state,r=rn(e),i=H(r.temperatureSendDeltaK,.2),a=H(r.temperatureCyclicMs,0);(n.lastSentTempC===null||Math.abs(t-n.lastSentTempC)>=i-1e-9||a>0&&e.timeMs-n.lastSentTempAt>=a)&&(n.lastSentTempC=t,n.lastSentTempAt=e.timeMs,W(e,`actualTemp`).forEach(n=>{e.setObject(n.id,t),e.transmit(n.id)}))}function pn(e){let t=e.state,n=rn(e),r=Math.round(t.valuePct),i=H(n.valueSendDeltaPct,5),a=H(n.valueCyclicMs,0),o=t.lastSentPct;if(!(o===null||Math.abs(r-o)>=i||r!==o&&(r===0||r===100)||a>0&&e.timeMs-t.lastSentPctAt>=a))return;t.lastSentPct=r,t.lastSentPctAt=e.timeMs;let[s,c]=t.heating?[`heatingValue`,`coolingValue`]:[`coolingValue`,`heatingValue`];W(e,s).forEach(t=>{e.setObject(t.id,r),e.transmit(t.id)}),an(e,c,0)}function mn(e){let t=e.state,n=rn(e),r=t.switchOn;if(n.controlType!==`twoPoint`){let i=H(n.pwmCycleMs,2e4);e.timeMs-t.pwmStartMs>=i&&(t.pwmStartMs+=i*Math.floor((e.timeMs-t.pwmStartMs)/i));let a=Math.round(t.valuePct);r=a>=100||a>0&&e.timeMs-t.pwmStartMs<a/100*i}t.switchOn=r;let[i,a]=t.heating?[`heatingSwitch`,`coolingSwitch`]:[`coolingSwitch`,`heatingSwitch`];an(e,i,+!!r),an(e,a,0)}var hn=(e,t)=>e===`1.009`?t===0:t!==0;function gn(e,t,n,r=``){let i=e.state,a=rn(e);switch(t){case`baseSetpoint`:i.baseC=tn(n,H(a.minSetpointC,5),H(a.maxSetpointC,35));break;case`setpointShift`:i.baseC=tn(H(a.comfortC,21)+n,H(a.minSetpointC,5),H(a.maxSetpointC,35));break;case`hvacMode`:n>=0&&n<=4&&(i.preset=n);break;case`presence`:i.presence=n!==0;break;case`window`:i.window=hn(r,n);break;case`heatCool`:{let e=n!==0;e!==i.heating&&(i.heating=e,i.integral=0,i.lastSentPct=null);break}default:return}cn(e),i.measuredC!==null&&dn(e,0)}var _n={description:`Room thermostat: comfort / standby / economy / protection modes (20.102), window and presence, PI control (5.001 or PWM) or two-point, heating and cooling.`,parameters:{type:`object`,additionalProperties:!1,properties:{controlType:{title:`Control type`,type:`string`,enum:[`pi`,`twoPoint`],enumTitles:[`PI (continuous or PWM)`,`Two-point`],default:`pi`,description:`pi uses proportional-integral control with a continuous value (5.001) or PWM (1 bit); twoPoint uses on/off control with hysteresis.`},comfortC:{title:`Base setpoint`,type:`number`,minimum:5,maximum:35,default:21,description:`Initial heating comfort setpoint (°C); the baseSetpoint object can replace it.`},standbyShiftK:{title:`Standby setback`,type:`number`,minimum:0,maximum:10,default:2,description:`Standby setpoint offset (K): lower for heating, higher for cooling.`},economyShiftK:{title:`Economy setback`,type:`number`,minimum:0,maximum:15,default:4,description:`Economy or night setpoint offset (K): lower for heating, higher for cooling.`},frostProtectionC:{title:`Frost protection setpoint`,type:`number`,minimum:3,maximum:15,default:7,description:`Heating setpoint in protection mode (°C).`},heatProtectionC:{title:`Heat protection setpoint`,expert:!0,type:`number`,minimum:25,maximum:45,default:35,description:`Cooling setpoint in protection mode (°C).`},deadZoneK:{title:`Dead zone`,expert:!0,type:`number`,minimum:0,maximum:10,default:3,description:`Difference between heating and cooling comfort setpoints (K), for example 21 °C and 24 °C.`},minSetpointC:{title:`Minimum setpoint`,expert:!0,type:`number`,minimum:0,maximum:30,default:5,description:`Lowest base setpoint accepted (°C); lower received or entered values are raised to it.`},maxSetpointC:{title:`Maximum setpoint`,expert:!0,type:`number`,minimum:10,maximum:50,default:35,description:`Highest base setpoint accepted (°C); higher received or entered values are lowered to it.`},hysteresisK:{title:`Hysteresis`,type:`number`,minimum:.1,maximum:5,default:.5,description:`Two-point control switches on again when temperature differs from the setpoint by this amount (K).`},proportionalBandK:{title:`Proportional band`,type:`number`,minimum:.5,maximum:10,default:2,description:`Temperature difference (K) that produces 100% output from the proportional term.`},integralTimeMs:{title:`Integral time`,unit:`ms`,type:`integer`,minimum:0,default:12e4,description:`PI integral time: a constant error doubles the proportional response after this duration (0 selects P control). Real installations use 60–240 minutes; the default follows compressed simulated room time.`},pwmCycleMs:{title:`PWM cycle time`,unit:`ms`,type:`integer`,minimum:1e3,default:2e4,description:`PWM cycle period for a 1-bit control object (real installations typically use 10–20 minutes).`},controlPeriodMs:{title:`Calculation period`,unit:`ms`,expert:!0,type:`integer`,minimum:100,default:1e3,description:`Interval at which the controller recalculates its control value from the measured temperature.`},valueSendDeltaPct:{title:`Send on change`,unit:`%`,type:`number`,minimum:1,maximum:50,default:5,description:`Send the control value when it changes by at least this many percentage points.`},externalTempTimeoutMs:{title:`External temperature timeout`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`If no externalTemp value arrives within this time, control uses the internal sensor again until a new value arrives (0 disables monitoring).`},valueCyclicMs:{title:`Cyclic sending of control value`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`Periodically resend the control value (0 disables it); needed when the actuator monitors incoming values.`},temperatureSendDeltaK:{title:`Temperature send threshold`,type:`number`,minimum:.1,maximum:5,default:.2,description:`Send measured temperature when it changes by at least this amount (K).`},temperatureCyclicMs:{title:`Cyclic sending of temperature`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`Also send the measured temperature at this interval, even without change; 0 disables cyclic sending.`}}},acceptsInputs:!0,ports:{actualTemp:{dpts:[`9.001`],channel:`none`,title:`Measured temperature`,direction:`out`},externalTemp:{dpts:[`9.001`],channel:`none`,title:`External temperature`,direction:`in`,description:`replaces the internal sensor after a value is received`},baseSetpoint:{dpts:[`9.001`],channel:`none`,title:`Base setpoint`,direction:`in`},setpointShift:{dpts:[`9.002`],channel:`none`,title:`Setpoint shift`,direction:`in`,description:`base setpoint = configured setpoint + offset`},setpointStatus:{dpts:[`9.001`],channel:`none`,title:`Current setpoint`,direction:`out`},hvacMode:{dpts:[`20.102`],channel:`none`,title:`Mode (preset)`,direction:`in`},hvacModeStatus:{dpts:[`20.102`],channel:`none`,title:`Current mode`,direction:`out`},presence:{dpts:[`1.018`,`1.001`],channel:`none`,title:`Presence`,direction:`in`,description:`1 = presence: comfort mode`},window:{dpts:[`1.019`,`1.001`,`1.009`],channel:`none`,title:`Window`,direction:`in`,description:`open window (1.019 / 1.001: 1 = open; 1.009: 0 = open): protection mode, highest priority`},heatCool:{dpts:[`1.100`],channel:`none`,title:`Heating / cooling`,direction:`in`,description:`1 = heating, 0 = cooling`},heatCoolStatus:{dpts:[`1.100`],channel:`none`,title:`Heating / cooling status`,direction:`out`},heatingValue:{dpts:[`5.001`],channel:`none`,title:`Heating control value`,direction:`out`,description:`continuous control value from 0 to 100%`},heatingSwitch:{dpts:[`1.001`],channel:`none`,title:`Heating 1-bit control`,direction:`out`,description:`two-point control, or PWM under PI control`},coolingValue:{dpts:[`5.001`],channel:`none`,title:`Cooling control value`,direction:`out`},coolingSwitch:{dpts:[`1.001`],channel:`none`,title:`Cooling 1-bit control`,direction:`out`}},createState(e){let t=H(e.parameters.comfortC,21);return{baseC:t,preset:U.comfort,presence:!1,window:!1,heating:!0,mode:U.comfort,setpointC:t,measuredC:null,integral:0,valuePct:0,switchOn:!1,pwmStartMs:0,elapsedMs:0,lastSentPct:null,lastSentPctAt:0,lastSentTempC:null,lastSentTempAt:0,warned:!1,externalAtMs:null,externalStale:!1}},onInit(e){let t=e.state;e.device.objects.forEach(n=>{let r=e.getObject(n.id);r!==null&&(n.port===`hvacMode`&&r>=0&&r<=4&&(t.preset=r),n.port===`presence`&&(t.presence=r!==0),n.port===`window`&&(t.window=hn(n.dpt,r)),n.port===`heatCool`&&(t.heating=r!==0),n.port===`baseSetpoint`&&(t.baseC=r))}),t.mode=on(t),t.setpointC=sn(e,t,t.mode),W(e,`hvacModeStatus`).forEach(n=>e.setObject(n.id,t.mode)),W(e,`setpointStatus`).forEach(n=>e.setObject(n.id,t.setpointC)),W(e,`baseSetpoint`).forEach(n=>e.setObject(n.id,t.baseC)),W(e,`heatCoolStatus`).forEach(n=>e.setObject(n.id,+!!t.heating));let n=un(e);n!==null&&(t.measuredC=n,t.lastSentTempC=n,W(e,`actualTemp`).forEach(t=>e.setObject(t.id,n)))},onTick(e,t){let n=e.state;n.elapsedMs+=t;let r=H(rn(e).controlPeriodMs,1e3);if(n.elapsedMs>=r){let t=n.elapsedMs;n.elapsedMs=0,dn(e,t)}else rn(e).controlType!==`twoPoint`&&n.measuredC!==null&&mn(e)},onObjectWrite(e,t){let n=e.device.objects.find(e=>e.id===t.objectId);n?.port===`externalTemp`&&(e.state.externalAtMs=e.timeMs),n&&gn(e,n.port,t.newValue,n.dpt)},onInput(e,t){let n=e.device;if(t.gesture===`value`){let r=n.inputs.find(e=>e.id===t.inputId),i=r&&n.objects.find(e=>e.id===r.object);if(!i||t.value===void 0)return;e.setObject(i.id,t.value),gn(e,i.port,e.getObject(i.id),i.dpt),i.flags.T&&e.transmit(i.id);return}let r=n.buttons.find(e=>e.id===t.inputId)?.[t.gesture],i=r&&n.objects.find(e=>e.id===r.object);if(!r||!i)return;let a=e.getObject(i.id)??0,o=r.value===`toggle`?+!a:r.value;e.setObject(i.id,o),gn(e,i.port,e.getObject(i.id),i.dpt),i.flags.T&&e.transmit(i.id)},deviceState(e){return{mode:e.mode,setpointC:e.setpointC,baseC:e.baseC,measuredC:e.measuredC,heating:e.heating,valuePct:Math.round(e.valuePct),switchOn:e.switchOn,window:e.window,presence:e.presence,externalStale:e.externalStale}}},vn=(e,t)=>e.device.channels.find(e=>e.id===t)?.parameters??{};function yn(e,t,n){return e.device.objects.filter(e=>e.port===t&&(!e.channel||e.channel===n))}function bn(e,t,n){let r=e.state.channels[t],i=n!==(vn(e,t).valveType===`normallyOpen`);i===r.energized&&e.getOutput(t)||(r.energized=i,e.setOutput(t,{type:`switch`,on:i}))}function xn(e,t){let n=e.state.channels[t],r=n.valuePct;if(n.direct||r<=0||r>=100){e.cancel(`${t}:off`),e.cancel(`${t}:cycle`),n.cycling=!1,bn(e,t,r>0);return}let i=H(vn(e,t).cycleMs,2e4);n.cycling||(n.cycling=!0,n.cycleStartMs=e.timeMs,e.schedule(`${t}:cycle`,i));let a=Math.round(r/100*i),o=n.cycleStartMs+a-e.timeMs;o>0?(bn(e,t,!0),e.schedule(`${t}:off`,o)):(e.cancel(`${t}:off`),bn(e,t,!1))}function Sn(e,t){let n=e.state.channels[t];yn(e,`valueStatus`,t).filter(e=>e.channel===t).forEach(t=>{e.getObject(t.id)!==n.valuePct&&(e.setObject(t.id,n.valuePct),e.transmit(t.id))})}function Cn(e,t){let n=H(vn(e,t).monitoringMs,0);n>0&&e.schedule(`${t}:watch`,n)}function wn(e,t,n){yn(e,`fault`,t).filter(e=>e.channel===t).forEach(t=>{e.getObject(t.id)!==+!!n&&(e.setObject(t.id,+!!n),e.transmit(t.id))})}var Tn={description:`Heating actuator: each output drives an electrothermal valve; continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.`,channelParameters:{type:`object`,additionalProperties:!1,properties:{valveType:{title:`Valve direction of action`,type:`string`,enum:[`normallyClosed`,`normallyOpen`],enumTitles:[`Closed when de-energised`,`Open when de-energised`],default:`normallyClosed`,description:`normallyClosed: valve closed without power (common); normallyOpen: valve open without power, so the output is inverted.`},cycleMs:{title:`PWM cycle time`,unit:`ms`,type:`integer`,minimum:1e3,default:2e4,description:`PWM period for a continuous control value: powered time equals value × period (real installations typically use 10–20 minutes).`},monitoringMs:{title:`Control value monitoring`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`If no control value arrives within this time, enter fallback mode and report a fault (0 disables monitoring).`},emergencyPct:{title:`Emergency control value`,unit:`%`,expert:!0,type:`number`,minimum:0,maximum:100,default:30,description:`Control value applied in fallback mode.`}}},ports:{value:{dpts:[`5.001`],channel:`required`,title:`Control value`,direction:`in`},switch:{dpts:[`1.001`],channel:`required`,title:`1-bit command`,direction:`in`,description:`two-point or thermostat PWM control`},valueStatus:{dpts:[`5.001`],channel:`required`,title:`Control value status`,direction:`out`},fault:{dpts:[`1.005`],channel:`required`,title:`Control value failure`,direction:`out`,description:`missing control value: fallback program`}},output:`switch`,createState(e){let t={};return e.channels.forEach(e=>t[e.id]={valuePct:0,direct:!1,cycleStartMs:0,cycling:!1,energized:!1,emergency:!1}),{channels:t}},onInit(e){e.device.channels.forEach(t=>{let n=e.state.channels[t.id];n.energized=vn(e,t.id).valveType===`normallyOpen`,e.setOutput(t.id,{type:`switch`,on:n.energized}),yn(e,`valueStatus`,t.id).filter(e=>e.channel===t.id).forEach(t=>e.setObject(t.id,0)),Cn(e,t.id)})},onObjectWrite(e,t){let n=e.device.objects.find(e=>e.id===t.objectId),r=n?.channel;if(!n||!r||!e.state.channels[r])return;let i=e.state.channels[r];(n.port===`value`||n.port===`switch`)&&(i.direct=n.port===`switch`,i.valuePct=i.direct?t.newValue?100:0:tn(t.newValue),i.emergency&&(i.emergency=!1,e.note(e.t`control value received: emergency mode ended`),wn(e,r,!1)),xn(e,r),Sn(e,r),Cn(e,r))},onTimer(e,t){let[n,r]=t.split(`:`),i=n?e.state.channels[n]:void 0;n&&i&&(r===`off`?bn(e,n,!1):r===`cycle`?(i.cycling=!1,xn(e,n)):r===`watch`&&(i.emergency=!0,i.direct=!1,i.valuePct=H(vn(e,n).emergencyPct,30),e.note(e.t`no control value received: emergency mode at ${i.valuePct} %`),wn(e,n,!0),xn(e,n),Sn(e,n)))},channelState(e,t){let n=e.channels[t];return n?{valuePct:n.valuePct,energized:n.energized,emergency:n.emergency}:{}}};function En(e,t,n){let r=e.device.parameters.contactType===`normallyClosed`?n:!n,i=e.device.parameters.invert===!0,a=!r!==i;return(t===`1.009`?!a:a)?1:0}var Dn={description:`Window contact (binary input): sends the opening and closing of its room's window.`,parameters:{type:`object`,additionalProperties:!1,properties:{contactType:{title:`Contact type`,expert:!0,type:`string`,enum:[`normallyOpen`,`normallyClosed`],enumTitles:[`Normally open`,`Normally closed`],default:`normallyOpen`,description:`Physical contact: a normally open contact is closed while the window is closed; a normally closed contact is open while the window is closed.`},invert:{title:`Invert input`,expert:!0,type:`boolean`,default:!1,description:`Interpret the electrical input for a normally closed contact. The transmitted value always follows the DPT (1.019: 1 = open; 1.009: 1 = closed).`},sendOnStart:{title:`Send on start`,type:`boolean`,default:!0,description:`Send contact state when the simulation starts, as after bus power returns, so a thermostat can detect an already open window.`},startDelayMs:{title:`Start-up send delay`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:1e3,description:`Delay after the simulation starts before the contact state is sent.`}}},ports:{contact:{dpts:[`1.019`,`1.001`,`1.009`],channel:`none`,title:`Contact`,direction:`out`,description:`1.019 / 1.001: 1 means open; 1.009: 1 means closed`}},createState:()=>null,onInit(e){let t=e.readRoom();e.device.objects.filter(e=>e.port===`contact`).forEach(n=>e.setObject(n.id,En(e,n.dpt,!!t?.windowOpen))),e.device.parameters.sendOnStart!==!1&&e.schedule(`start`,H(e.device.parameters.startDelayMs,1e3))},onTimer(e,t){t===`start`&&e.device.objects.filter(e=>e.port===`contact`).forEach(t=>e.transmit(t.id))},onRoomChange(e,t){e.device.objects.filter(e=>e.port===`contact`).forEach(n=>{let r=En(e,n.dpt,t.windowOpen);e.getObject(n.id)!==r&&(e.setObject(n.id,r),e.transmit(n.id))})}},On={description:`Room temperature sensor: sends its room's temperature on change and cyclically.`,parameters:{type:`object`,additionalProperties:!1,properties:{sendDeltaK:{title:`Send on change`,type:`number`,minimum:.1,maximum:5,default:.2,description:`Temperature change (K) that triggers a transmission.`},cyclicMs:{title:`Cyclic sending`,unit:`ms`,type:`integer`,minimum:0,default:0,description:`Periodic retransmission (0 disables it).`}}},ports:{temperature:{dpts:[`9.001`],channel:`none`,title:`Temperature`,direction:`out`}},createState:()=>({lastC:null,lastAt:0,elapsedMs:0}),onInit(e){let t=e.readRoom()?.temperatureC;t!==void 0&&(e.state.lastC=t,e.device.objects.filter(e=>e.port===`temperature`).forEach(n=>e.setObject(n.id,t)))},onTick(e,t){let n=e.state;if(n.elapsedMs+=t,n.elapsedMs<500)return;n.elapsedMs=0;let r=e.readRoom()?.temperatureC;if(r===void 0)return;let i=e.device.parameters,a=H(i.cyclicMs,0);n.lastC!==null&&Math.abs(r-n.lastC)<H(i.sendDeltaK,.2)-1e-9&&!(a>0&&e.timeMs-n.lastAt>=a)||(n.lastC=r,n.lastAt=e.timeMs,e.device.objects.filter(e=>e.port===`temperature`).forEach(t=>{e.setObject(t.id,r),e.transmit(t.id)}))}},kn={description:`Push button or sensor: each gesture writes a value into a local object, then transmits it.`,parameters:{type:`object`,additionalProperties:!1,properties:{longPressMs:{title:`Long press duration`,unit:`ms`,expert:!0,type:`integer`,minimum:100,maximum:1e4,default:500,description:`Press duration that counts as a long press (ms), for keys with short and long actions.`}}},ports:{input:{dpts:`any`,channel:`none`,title:`Transmission`,direction:`out`,description:`object sent by a key or input`},display:{dpts:`any`,channel:`none`,title:`Display`,direction:`in`,description:`object receiving a value (indicator or feedback)`}},acceptsInputs:!0,createState:()=>({}),onInput(e,t){let n=e.device;if(t.gesture===`value`){let r=n.inputs.find(e=>e.id===t.inputId);if(!r||t.value===void 0)return;e.setObject(r.object,t.value),e.transmit(r.object);return}let r=n.buttons.find(e=>e.id===t.inputId)?.[t.gesture];if(!r)return;let i=e.getObject(r.object),a=r.value===`toggle`?+!i:r.value;e.setObject(r.object,a),e.transmit(r.object)}},An={description:`Display / supervisor: receives and shows values, with no output or retransmission.`,ports:{display:{dpts:`any`,channel:`none`,title:`Display`,direction:`in`}},createState:()=>({})},jn={description:`Device without logic: it only keeps the values of its objects.`,ports:{input:{dpts:`any`,channel:`none`,title:`Transmission`,direction:`out`},display:{dpts:`any`,channel:`none`,title:`Display`,direction:`in`}},createState:()=>({})},Mn={description:`Presence detector: sends 1 on first detection, 0 when its hold time ends (restarted by each detection).`,parameters:{type:`object`,additionalProperties:!1,properties:{holdMs:{title:`Hold time`,unit:`ms`,type:`integer`,exclusiveMinimum:0,default:1e4,description:`Time with no detected presence before sending 0 (ms); restarted on each detection.`},retrigger:{title:`Hold time restarted by a detection`,expert:!0,type:`boolean`,default:!0,description:`Each activation restarts the timer; otherwise it runs from the first activation.`},sendOnEnd:{title:`Send 0 at the end`,expert:!0,type:`boolean`,default:!0,description:`Send 0 when the timer expires; otherwise the detector sends only 1 and the actuator handles switch-off.`}}},ports:{input:{dpts:[`1.001`],channel:`none`,title:`Presence`,direction:`out`,description:`output object: 1 on detection, 0 when the timer expires`}},acceptsInputs:!0,createState:()=>({active:!1}),onInput(e,t){let n=e.device.buttons.find(e=>e.id===t.inputId),r=n?.press??n?.short??n?.long;if(!r)return;let i=e.device.parameters,a=Number(i.holdMs??1e4);if(e.state.active){if(i.retrigger===!1){e.note(e.t`Detection: hold time not restarted`);return}e.schedule(`off`,a,r.object),e.note(e.t`Detection: hold time restarted, no new telegram`);return}e.schedule(`off`,a,r.object),e.state.active=!0,e.setObject(r.object,1),e.transmit(r.object)},onTimer(e,t,n){t===`off`&&typeof n==`string`&&(e.state.active=!1,e.device.parameters.sendOnEnd!==!1&&(e.setObject(n,0),e.transmit(n)))}},Nn=1e-6,Pn=e=>Math.min(100,Math.max(0,e));function G(e,t){let n=e.device.channels.find(e=>e.id===t)?.parameters??{};return{estimatedTravelTimeMs:Number(n.estimatedTravelTimeMs),startDelayMs:Number(n.startDelayMs??300),statusDelayMs:Number(n.statusDelayMs??300),stepPct:Number(n.stepPct??0),endSupplementPct:Number(n.endSupplementPct??0),invertOutput:n.invertOutput===!0,slatTravelMs:Math.max(0,Number(n.slatTravelMs??0)),slatStepPct:Number(n.slatStepPct??20)}}function Fn(e,t,n){if(e.phase!==`moving`||e.startedAtMs===null||!e.direction)return e.estimatedPositionPct;let r=e.direction===`down`?1:-1,i=Math.max(0,t-e.startedAtMs-(e.slatPhaseMs??0));return Pn(e.estimatedPositionPct+r*i*100/n)}function In(e,t,n){if(n<=0||e.phase!==`moving`||e.startedAtMs===null||!e.direction)return e.estimatedSlatPct;let r=e.direction===`down`?1:-1,i=Math.min(t-e.startedAtMs,e.slatPhaseMs);return Pn(e.estimatedSlatPct+r*i*100/n)}function Ln(e,t,n){let r=n??`stop`;n&&G(e,t).invertOutput&&(r=n===`up`?`down`:`up`),e.setOutput(t,{type:`motor`,direction:r})}function Rn(e,t){let n=e.state.channels[t];n.unpublished=!1;let r=e.device.objects.filter(e=>e.port===`positionStatus`&&e.channel===t),i=e.device.objects.filter(e=>e.port===`slatStatus`&&e.channel===t);(r.length||i.length)&&(r.forEach(t=>e.setObject(t.id,n.estimatedPositionPct)),e.device.objects.filter(e=>e.port===`slatStatus`&&e.channel===t).forEach(t=>e.setObject(t.id,n.estimatedSlatPct)),e.schedule(`${t}:status`,G(e,t).statusDelayMs))}function zn(e,t){let n=e.state.channels[t];return e.cancel(`${t}:start`),e.cancel(`${t}:stop`),n.phase===`moving`?(n.estimatedPositionPct=Fn(n,e.timeMs,G(e,t).estimatedTravelTimeMs),n.estimatedSlatPct=In(n,e.timeMs,G(e,t).slatTravelMs),n.targetSlatPct=null,n.phase=`idle`,n.direction=null,n.startedAtMs=null,n.stopAtMs=null,Ln(e,t,null),!0):(n.phase=`idle`,!1)}function Bn(e,t,n){let r=e.state.channels[t];if(!r)return;if(n=Pn(n),r.phase===`moving`&&r.targetPct!==null&&Math.abs(r.targetPct-n)<Nn){e.note(e.t`${t}: already moving to ${Math.round(n)} %, command has no effect`);return}e.cancel(`${t}:status`),zn(e,t)&&(r.unpublished=!0),r.targetPct=null;let i=(n===0||n===100)&&G(e,t).endSupplementPct>0;if(Math.abs(n-r.estimatedPositionPct)<Nn&&!i){r.unpublished&&Rn(e,t);return}r.phase=`pending`,r.targetPct=n,e.schedule(`${t}:start`,G(e,t).startDelayMs)}function Vn(e,t,n){let r=e.state.channels[t];if(!r)return;if(r.phase===`pending`||r.phase===`moving`){e.cancel(`${t}:status`);let n=zn(e,t);r.targetPct=null,(n||r.unpublished)&&Rn(e,t);return}let i=G(e,t);if(i.slatTravelMs>0){Hn(e,t,r.estimatedSlatPct+(n?i.slatStepPct:-i.slatStepPct));return}let a=i.stepPct;if(a<=0){e.note(e.t`${t}: shutter stopped, stop/step has no effect (no slats)`);return}Bn(e,t,r.estimatedPositionPct+(n?a:-a))}function Hn(e,t,n){let r=e.state.channels[t];if(r){if(G(e,t).slatTravelMs<=0){e.note(e.t`${t}: no slats configured, slat command ignored`);return}if(n=Pn(n),e.cancel(`${t}:status`),zn(e,t)&&(r.unpublished=!0),Math.abs(n-r.estimatedSlatPct)<Nn){r.unpublished&&Rn(e,t);return}r.phase=`pending`,r.targetPct=r.estimatedPositionPct,r.targetSlatPct=n,e.schedule(`${t}:start`,G(e,t).startDelayMs)}}function Un(e,t){let n=e.state.channels[t],r=n.targetPct;if(n.phase!==`pending`||r===null)return;let i=G(e,t);if(n.targetSlatPct!==null){let r=n.targetSlatPct-n.estimatedSlatPct;n.phase=`moving`,n.direction=r>0?`down`:`up`,n.slatPhaseMs=Math.round(Math.abs(r)*i.slatTravelMs/100),n.startedAtMs=e.timeMs,n.stopAtMs=e.timeMs+n.slatPhaseMs,Ln(e,t,n.direction),e.schedule(`${t}:stop`,n.slatPhaseMs);return}let a=r===0||r===100,o=Math.round(Math.abs(r-n.estimatedPositionPct)/100*i.estimatedTravelTimeMs+(a?i.endSupplementPct/100*i.estimatedTravelTimeMs:0));if(o<=0){n.phase=`idle`,n.estimatedPositionPct=r,Rn(e,t);return}n.phase=`moving`,n.direction=r>n.estimatedPositionPct||r===100&&a?`down`:`up`,n.slatPhaseMs=i.slatTravelMs>0?Math.round((n.direction===`down`?100-n.estimatedSlatPct:n.estimatedSlatPct)*i.slatTravelMs/100):0,n.startedAtMs=e.timeMs,n.stopAtMs=e.timeMs+o+n.slatPhaseMs,Ln(e,t,n.direction),e.schedule(`${t}:stop`,o+n.slatPhaseMs)}function Wn(e,t){let n=e.state.channels[t];if(n.phase!==`moving`)return;let r=n.targetPct??Fn(n,e.timeMs,G(e,t).estimatedTravelTimeMs);n.estimatedSlatPct=n.targetSlatPct??In(n,e.timeMs,G(e,t).slatTravelMs),n.targetSlatPct=null,n.phase=`idle`,n.direction=null,n.startedAtMs=null,n.stopAtMs=null,n.estimatedPositionPct=r,n.targetPct=null,Ln(e,t,null),Rn(e,t)}function Gn(e,t,n){let r=(n&63)+1;t.forEach(t=>{let n=e.device.channels.find(e=>e.id===t)?.scenes.get(r);if(n===void 0){e.note(e.t`${t}: no preset for scene ${r}, command ignored`);return}Bn(e,t,n)})}function Kn(e,t,n){let r=e.state.channels[t];r&&r.windLock!==n&&(r.windLock=n,n?(e.note(e.t`${t}: wind alarm, shutter raised and locked`),Bn(e,t,0)):e.note(e.t`${t}: wind alarm ended, shutter released in place`))}var qn={description:`Shutter actuator without sensor: position estimated from the configured travel time.`,channelParameters:{type:`object`,additionalProperties:!1,required:[`estimatedTravelTimeMs`],properties:{estimatedTravelTimeMs:{title:`Configured travel time`,unit:`ms`,type:`integer`,exclusiveMinimum:0,description:`Travel time configured in the actuator (ms).`},startDelayMs:{title:`Start delay`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:300,description:`Delay before starting or reversing motion (ms).`},statusDelayMs:{title:`Position feedback delay`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:300,description:`Delay before sending position feedback (ms).`},slatTravelMs:{title:`Configured slat rotation time`,unit:`ms`,type:`integer`,minimum:0,default:0,description:`Venetian blind: time configured for the slats to turn from open to closed (ms). A movement first turns the slats; a short press at rest turns them by slatStepPct. 0 for a roller shutter without slats.`},slatStepPct:{title:`Slat step`,unit:`%`,expert:!0,type:`number`,minimum:1,maximum:100,default:20,description:`Slat angle change for a short press at rest (%).`},stepPct:{title:`Stop/step increment`,unit:`%`,expert:!0,type:`number`,minimum:0,maximum:100,default:0,description:`Position step for a stop/step command received at rest by a shutter without slats (%). 0 (default): no movement, as in the KNX stop/step function, where the step turns slats; some actuators move a roller shutter by this amount instead.`},endSupplementPct:{title:`End-of-travel supplement`,unit:`%`,expert:!0,type:`number`,minimum:0,maximum:50,default:0,description:`Extra travel time toward 0% or 100%, as a percentage of full travel. The motor runs even if the estimate is already at the limit; the end stop recalibrates the estimate (often 5–10% on a real actuator).`},invertOutput:{title:`Inverted wiring`,expert:!0,type:`boolean`,default:!1,description:`Invert the up and down outputs to compensate a motor wired in reverse (shutter parameter wiringReversed). Without such wiring, enabling it makes the shutter move opposite to the commands.`}}},channelInitialState:{type:`object`,additionalProperties:!1,properties:{estimatedPositionPct:{title:`Estimated position at start`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0,description:`Position the actuator assumes at start (0 = fully open, 100 = fully closed); the connected shutter starts at its own position.`},estimatedSlatPct:{title:`Estimated slat angle at start`,unit:`%`,type:`number`,minimum:0,maximum:100,default:0,description:`Slat angle the actuator assumes at start (venetian blinds).`}}},ports:{move:{dpts:[`1.008`],channel:`required`,title:`Up/down`,direction:`in`},stopStep:{dpts:[`1.007`],channel:`required`,title:`Stop/step`,direction:`in`},positionCommand:{dpts:[`5.001`],channel:`required`,title:`Position setpoint`,direction:`in`},positionStatus:{dpts:[`5.001`],channel:`required`,title:`Position feedback`,direction:`out`},scene:{dpts:[`17.001`],channel:`optional`,title:`Scene`,direction:`in`},slatCommand:{dpts:[`5.001`],channel:`required`,title:`Slat angle setpoint`,direction:`in`,description:`slat angle (0 % open, 100 % closed) of a venetian blind`},slatStatus:{dpts:[`5.001`],channel:`required`,title:`Slat angle feedback`,direction:`out`,description:`estimated slat angle, sent after stopping`},windAlarm:{dpts:[`1.005`,`1.001`],channel:`optional`,title:`Wind alarm`,direction:`in`,description:`1 raises the shutter and locks it against other commands; 0 releases it in place`}},output:`motor`,createState(e){let t={};return e.channels.forEach(e=>{t[e.id]={estimatedPositionPct:Number(e.initialState.estimatedPositionPct??0),phase:`idle`,direction:null,targetPct:null,startedAtMs:null,stopAtMs:null,unpublished:!1,windLock:!1,estimatedSlatPct:Number(e.initialState.estimatedSlatPct??0),slatPhaseMs:0,targetSlatPct:null}}),{channels:t}},onInit(e){e.device.channels.forEach(t=>{Ln(e,t.id,null);let n=e.state.channels[t.id].estimatedPositionPct;e.device.objects.filter(e=>e.port===`positionStatus`&&e.channel===t.id).forEach(t=>e.setObject(t.id,n))})},onObjectWrite(e,t){let n=e.device.objects.find(e=>e.id===t.objectId);if(!n)return;let r=n.channel;if(n.port===`windAlarm`){(r?[r]:e.device.channels.map(e=>e.id)).forEach(n=>Kn(e,n,t.newValue===1));return}if(r?e.state.channels[r]?.windLock:n.port===`scene`&&e.device.channels.every(t=>e.state.channels[t.id]?.windLock)){e.note(e.t`${r??n.id}: wind alarm active, command ignored`);return}switch(n.port){case`move`:r&&Bn(e,r,t.newValue?100:0);break;case`positionCommand`:r&&Bn(e,r,t.newValue);break;case`stopStep`:r&&Vn(e,r,t.newValue);break;case`slatCommand`:r&&Hn(e,r,t.newValue);break;case`scene`:Gn(e,(r?[r]:e.device.channels.map(e=>e.id)).filter(t=>!e.state.channels[t]?.windLock),t.newValue)}},onTimer(e,t){let[n,r]=t.split(`:`);n&&(r===`start`?Un(e,n):r===`stop`?Wn(e,n):r===`status`&&e.device.objects.filter(e=>(e.port===`positionStatus`||e.port===`slatStatus`)&&e.channel===n).forEach(t=>e.transmit(t.id)))},channelState(e,t,n,r){let i=e.channels[t];if(!i)return{};let a=r.channels.find(e=>e.id===t)?.parameters;return{estimatedPositionPct:Fn(i,n,Number(a?.estimatedTravelTimeMs)),estimatedSlatPct:In(i,n,Math.max(0,Number(a?.slatTravelMs??0))),phase:i.phase,direction:i.direction,targetPct:i.targetPct,startedAtMs:i.startedAtMs,stopAtMs:i.stopAtMs,windLock:i.windLock}}},Jn=5,Yn=[`power`,`energy`,`totalPower`,`powerLimit`],Xn=(e,t)=>e.device.objects.filter(e=>e.port===`status`&&e.channel===t);function Zn(e,t,n){let r=e.device.channels.find(e=>e.id===t)?.parameters.relayMode===`normallyClosed`;e.setOutput(t,{type:`switch`,on:n!==r})}function Qn(e,t,n){let r=e.state.channels[t];if(!r||r.on===n)return;r.on=n,Zn(e,t,n),ar(e)&&e.schedule(`meterSoon`,100);let i=Xn(e,t);if(!i.length)return;i.forEach(t=>e.setObject(t.id,+!!n));let a=Number(e.device.channels.find(e=>e.id===t)?.parameters.statusDelayMs??300);e.schedule(`${t}:status`,a)}var $n=(e,t)=>e.device.channels.find(e=>e.id===t)?.parameters??{};function er(e,t){let n=e.state.channels[t];if(n.forced){e.note(n.forced===`on`?e.t`${t}: output forced (on), command stored without effect`:e.t`${t}: output forced (off), command stored without effect`);return}if(n.shed){e.note(e.t`${t}: output shed, command stored without effect`);return}Qn(e,t,n.commanded)}function tr(e,t,n){let r=e.state.channels[t];if(!r)return;let i=e.device.channels.find(e=>e.id===t)?.parameters??{},a=typeof i.timerMs==`number`?i.timerMs:null;if(n&&a){let n=i.timerRetrigger??`restart`,o=r.offAtMs!==null&&r.offAtMs>e.timeMs,s=e.timeMs+a;if(o&&n===`none`){e.note(e.t`${t}: timer cannot be retriggered, telegram has no effect`);return}o&&n===`add`&&(s=Math.min(r.offAtMs+a,e.timeMs+Jn*a)),e.schedule(`${t}:off`,s-e.timeMs),r.offAtMs=s;let c=Number(i.timerWarningMs??0);c>0&&s-e.timeMs>c?e.schedule(`${t}:warn`,s-e.timeMs-c):e.cancel(`${t}:warn`)}else if(!n){if(a&&r.offAtMs!==null&&i.timerOffAllowed===!1){e.note(e.t`${t}: early switch-off of the timer not allowed, telegram 0 has no effect`);return}e.cancel(`${t}:off`),e.cancel(`${t}:warn`),r.offAtMs=null}r.commanded=n,er(e,t)}function nr(e,t,n){let r=e.state.channels[t];if(!r)return;if(n&2){r.forced===null&&(r.beforeForcing=r.on),r.forced=n&1?`on`:`off`,Qn(e,t,r.forced===`on`);return}if(r.forced===null)return;let i=$n(e,t).afterForcing;r.forced=null,i===`previous`?r.commanded=r.beforeForcing??r.commanded:i===`unchanged`?r.commanded=r.on:i===`on`||i===`off`?r.commanded=i===`on`:i===`toggle`&&(r.commanded=!r.on),r.beforeForcing=null,Qn(e,t,r.commanded)}function rr(e,t,n){let r=(n&63)+1;t.forEach(t=>{let n=e.device.channels.find(e=>e.id===t)?.scenes.get(r);if(n===void 0){e.note(e.t`${t}: no preset for scene ${r}, command ignored`);return}tr(e,t,n>0)})}function ir(e){return e.channels.map(e=>e.id)}var ar=e=>e.device.objects.some(e=>Yn.includes(e.port)),or=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t;function sr(e,t,n,r){e.device.objects.filter(e=>e.port===t&&(n===null?!e.channel:e.channel===n)).forEach(t=>{e.setObject(t.id,r),e.transmit(t.id)})}function cr(e,t){let n=e.device.parameters,r=e.state.meter,i=or(n.energyTimeScale,60),a=(e.timeMs-r.atMs)/36e5*i;r.atMs=e.timeMs;let o=or(n.powerSendDeltaW,10),s=0;for(let n of ir(e.device)){var c;let i=(c=r.channels)[n]??(c[n]={energyWh:0,powerW:0,sentW:null});i.energyWh+=i.powerW*a,i.powerW=e.readPower(n)??0,s+=i.powerW,(t||i.sentW===null||Math.abs(i.powerW-i.sentW)>=o)&&(i.sentW=i.powerW,sr(e,`power`,n,i.powerW)),t&&sr(e,`energy`,n,Math.round(i.energyWh))}(t||r.totalSentW===null||Math.abs(s-r.totalSentW)>=o)&&(r.totalSentW=s,sr(e,`totalPower`,null,s));let l=or(n.powerLimitW,0);if(l>0){let t=or(n.powerLimitHysteresisW,50),i=r.limitAlarm,a=i?s<=l-t?0:1:+(s>=l);a!==i&&(r.limitAlarm=a,e.note(a?e.t`Total power ${Math.round(s)} W reaches the limit ${l} W`:e.t`Total power ${Math.round(s)} W is back below ${l-t} W`),sr(e,`powerLimit`,null,a)),r.limitAlarm&&lr(e)}}function lr(e){for(let t of e.device.channels){let n=e.state.channels[t.id];n&&t.parameters.loadShedding===!0&&!n.shed&&n.on&&(n.forced||(n.shed=!0,e.note(e.t`${t.id}: switched off by load shedding`),Qn(e,t.id,!1),e.schedule(`${t.id}:unshed`,or(e.device.parameters.sheddingTimeMs,2e4))))}}var ur={description:`Switch actuator: each channel drives a relay; optional timer, status feedback, and power and energy metering.`,parameters:{type:`object`,additionalProperties:!1,properties:{meterIntervalMs:{title:`Metering send interval`,unit:`ms`,expert:!0,type:`integer`,minimum:1e3,default:5e3,description:`Cyclic sending of power and energy values (ms), for channels with metering objects.`},powerSendDeltaW:{title:`Power send threshold`,expert:!0,type:`number`,minimum:0,default:10,description:`Send a power value when it changes by at least this many watts.`},energyTimeScale:{title:`Energy time scale`,expert:!0,type:`number`,exclusiveMinimum:0,default:60,description:`Energy counting speed: 60 counts one simulated second as one minute, so that the counter moves visibly; 1 counts real time.`},powerLimitW:{title:`Total power limit`,type:`number`,minimum:0,default:0,description:`Total power (W) of the actuator outputs at which the powerLimit object is set, for load shedding (0 disables it).`},sheddingTimeMs:{title:`Minimum shedding time`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:2e4,description:`A shed output is switched on again after this time, if its command still requests it; it is shed again if the limit is still exceeded.`},powerLimitHysteresisW:{title:`Power limit hysteresis`,expert:!0,type:`number`,minimum:0,default:50,description:`The powerLimit object is reset below limit − hysteresis (W).`}}},channelParameters:{type:`object`,additionalProperties:!1,properties:{timerMs:{title:`Timer`,unit:`ms`,type:[`integer`,`null`],nullTitle:`no timer`,exclusiveMinimum:0,default:null,description:`Timer duration (ms); null disables the timer.`},timerRetrigger:{title:`Timer retriggering`,expert:!0,type:`string`,enum:[`restart`,`none`,`add`],enumTitles:[`Restarts`,`No effect`,`Extends`],default:`restart`,description:`When 1 is received during a timer: restart begins a full period, none ignores it, and add extends the period (up to five times).`},timerWarningMs:{title:`Switch-off warning`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:0,description:`Time before the timer ends when the output briefly opens for one second as a warning (0 disables the warning).`},timerOffAllowed:{title:`Early switch-off by 0`,expert:!0,type:`boolean`,default:!0,description:`Allow a 0 write to switch off before the timer ends; otherwise ignore it.`},loadShedding:{title:`Shed on power limit`,type:`boolean`,default:!1,description:`Switch this output off while the total power limit of the actuator is exceeded (load shedding).`},relayMode:{title:`Relay operating mode`,type:`string`,enum:[`normallyOpen`,`normallyClosed`],enumTitles:[`Normally open`,`Normally closed`],default:`normallyOpen`,description:`normallyOpen closes the contact when the channel is on; normallyClosed closes it when the channel is off, so the load is powered while the switching state is 0. Status feedback reports the switching state, not the contact.`},statusDelayMs:{title:`Status feedback delay`,unit:`ms`,expert:!0,type:`integer`,minimum:0,default:300,description:`Delay before sending status feedback (ms).`},afterForcing:{title:`End of forcing`,expert:!0,type:`string`,enum:[`lastCommand`,`previous`,`unchanged`,`on`,`off`,`toggle`],enumTitles:[`Last command`,`Previous state`,`Unchanged`,`Start`,`Stop`,`Toggle`],default:`lastCommand`,description:`State after a priority override ends: follow the latest command received during the override, restore the previous state, keep the forced state, switch on, switch off, or invert the forced state.`}}},channelInitialState:{type:`object`,additionalProperties:!1,properties:{on:{title:`On at start`,type:`boolean`,default:!1,description:`Switching state of the channel when the simulation starts.`}}},ports:{switch:{dpts:[`1.001`],channel:`required`,title:`Command`,direction:`in`},status:{dpts:[`1.001`],channel:`required`,title:`Status feedback`,direction:`out`},scene:{dpts:[`17.001`],channel:`optional`,title:`Scene`,direction:`in`},forced:{dpts:[`2.001`],channel:`required`,title:`Forcing`,direction:`in`},power:{dpts:[`14.056`],channel:`required`,title:`Power`,direction:`out`,description:`electrical power (W) drawn by the load of the channel`},energy:{dpts:[`13.010`],channel:`required`,title:`Energy`,direction:`out`,description:`active energy (Wh) counted for the channel, sent cyclically`},totalPower:{dpts:[`14.056`],channel:`none`,title:`Total power`,direction:`out`,description:`sum of the power of all channels (W)`},powerLimit:{dpts:[`1.005`,`1.001`],channel:`none`,title:`Power limit`,direction:`out`,description:`1 when the total power reaches powerLimitW, 0 after hysteresis (load shedding)`}},output:`switch`,createState(e){let t={};return e.channels.forEach(e=>{let n=e.initialState.on===!0;t[e.id]={on:n,commanded:n,offAtMs:null,forced:null,beforeForcing:null,shed:!1}}),{channels:t,meter:{channels:{},atMs:0,totalSentW:null,limitAlarm:0,started:!1}}},onInit(e){ar(e)&&e.schedule(`meterSoon`,500),ir(e.device).forEach(t=>{let n=e.state.channels[t].on;Zn(e,t,n),Xn(e,t).forEach(t=>e.setObject(t.id,+!!n))})},onObjectWrite(e,t){let n=e.device.objects.find(e=>e.id===t.objectId);n&&(n.port===`switch`&&n.channel?tr(e,n.channel,t.newValue!==0):n.port===`forced`&&n.channel?nr(e,n.channel,t.newValue):n.port===`scene`&&rr(e,n.channel?[n.channel]:ir(e.device),t.newValue))},onTimer(e,t){if(t===`meterSoon`||t===`meter`){cr(e,t===`meter`);let n=e.state.meter;(t===`meter`||!n.started)&&(n.started=!0,e.schedule(`meter`,or(e.device.parameters.meterIntervalMs,5e3)));return}let[n,r]=t.split(`:`);if(n){if(r===`unshed`){let t=e.state.channels[n];if(!t?.shed)return;t.shed=!1,e.note(e.t`${n}: load shedding ended, stored command applied`),er(e,n);return}if(r===`off`){let t=e.state.channels[n];if(!t)return;t.offAtMs=null,t.commanded=!1,er(e,n)}else if(r===`warn`){let t=e.state.channels[n];if(!t?.on||t.forced)return;Zn(e,n,!1),e.note(e.t`${n}: switch-off warning`),e.schedule(`${n}:warnEnd`,1e3)}else if(r===`warnEnd`){let t=e.state.channels[n];t&&Zn(e,n,t.on)}else r===`status`&&Xn(e,n).forEach(t=>e.transmit(t.id))}},channelState(e,t){let n=e.channels[t];return n?{on:n.on,commanded:n.commanded,offAtMs:n.offAtMs,forced:n.forced,shed:n.shed,energyWh:e.meter.channels[t]?.energyWh??0,powerW:e.meter.channels[t]?.powerW??0}:{}}},dr=new Map,fr=new Map,pr=/^[A-Za-z][\w.-]*(\/v\d+)?$/;function mr(e,t,n){let r=l();if(typeof t!=`string`||!pr.test(t))throw TypeError(e===`behavior`?r`Behavior: invalid identifier “${String(t)}”`:r`Equipment: invalid identifier “${String(t)}”`);if(n.has(t))throw Error(e===`behavior`?r`Behavior “${t}” already registered`:r`Equipment “${t}” already registered`)}function K(e,t){mr(`behavior`,e,dr),dr.set(e,dt(e,t))}function hr(e,t){mr(`equipment`,e,fr),fr.set(e,ft(e,t))}function gr(){return{behaviors:new Map(dr),equipment:new Map(fr)}}var _r=()=>[...dr.keys()],vr=()=>[...fr.keys()];K(`pushButton/v1`,kn),K(`switchActuator/v1`,ur),K(`shutterActuator/v1`,qn),K(`display/v1`,An),K(`passive/v1`,jn),K(`presenceDetector/v1`,Mn),K(`usbInterface/v1`,pt),hr(`lamp`,xe),hr(`shutter`,Ee),hr(`dimmableLamp`,Ae),hr(`daliGroup`,Ne),K(`dimmerActuator/v1`,et),K(`daliGateway/v1`,tt),hr(`radiator`,Fe),hr(`fan`,je),hr(`appliance`,Se),K(`roomThermostat/v1`,_n),K(`heatingActuator/v1`,Tn),K(`windowContact/v1`,Dn),K(`temperatureSensor/v1`,On),K(`logicGate/v1`,xt),K(`weatherStation/v1`,Tt),K(`airQualitySensor/v1`,Pt),K(`clockMaster/v1`,Wt),K(`timeSwitch/v1`,en),new Set(dr.keys()),new Set(fr.keys());var yr=20,br=1e3,xr=500,Sr=new Set([`telegram-emitted`,`coupler-decision`,`object-write-accepted`,`object-write-ignored`,`output-changed`,`timer-fired`]),Cr=class extends Error{},wr=e=>e===void 0?e:JSON.parse(JSON.stringify(e)),Tr=(e,t)=>!!e&&e.type===t.type&&(e.type===`switch`?e.on===t.on:e.type===`dim`?e.level===t.level&&e.fadeMs===t.fadeMs&&e.colourTemperatureK===t.colourTemperatureK:e.direction===t.direction),Er=class{clock(){let e=this.scenario.clock;return e?{nowMs:Math.round(e.startMs+this.timeMs*e.speed+this.clockOffsetMs),speed:e.speed}:null}setClock(e){let t=this.clock();if(!t||!Number.isFinite(e)||this.fault)return[];this.clockOffsetMs+=Math.round(e)-t.nowMs;let n=this.nextTelegramId,r=this.log(`input`,null,{message:this.t`Clock set to ${new Date(Math.round(e)).toISOString().slice(0,19).replace(`T`,` `)}`,data:{action:`clock`,value:e}});return this.withCause(r.id,()=>this.devices.forEach(e=>e.def.onClockChange&&this.hook(e,`onClockChange`,()=>e.def.onClockChange(e.ctx)))),this.history.filter(e=>e.id>=n)}constructor(e,t={}){S(this,`scenario`,void 0),S(this,`network`,void 0),S(this,`t`,void 0),S(this,`registry`,void 0),S(this,`timeMs`,0),S(this,`paused`,!1),S(this,`fault`,null),S(this,`lastStop`,null),S(this,`journal`,[]),S(this,`history`,[]),S(this,`diagnostics`,[]),S(this,`queue`,new C),S(this,`devices`,new Map),S(this,`objects`,new Map),S(this,`outputs`,new Map),S(this,`equipment`,new Map),S(this,`rooms`,new Map),S(this,`active`,new Map),S(this,`physicsMs`,0),S(this,`clockOffsetMs`,0),S(this,`nextEventId`,1),S(this,`nextTelegramId`,1),S(this,`cause`,null),S(this,`initializing`,!1),S(this,`cascadeAt`,-1),S(this,`cascadeCount`,0),S(this,`listeners`,new Set),S(this,`maxSameTime`,void 0),S(this,`historyLimit`,void 0),S(this,`journalLimit`,void 0),S(this,`tickers`,[]),S(this,`telegramListeners`,new Set),S(this,`reported`,new Set),this.scenario=e,this.registry=t.registry??gr(),this.maxSameTime=t.maxEventsPerTimestamp??1e3,this.historyLimit=t.historyLimit??200,this.journalLimit=t.journalLimit??5e3,this.t=s(t.lang??`en`),this.network=new be(e,void 0,this.t),this.init()}init(){let e=this.scenario;this.initializing=!0,this.tickers.length=0,e.rooms.forEach(e=>this.rooms.set(e.id,{room:e,temperatureC:e.temperatureC,outsideTemperatureC:e.outsideTemperatureC,windowOpen:e.windowOpen})),e.devices.forEach(e=>{e.objects.forEach(e=>this.objects.set(e.key,{value:e.initial,updatedAtMs:null})),e.channels.forEach(t=>{let n=`${e.id}/${t.id}`;this.outputs.set(n,null);let r=t.equipmentConfig,i=r?this.registry.equipment.get(r.type):void 0;r&&i&&this.equipment.set(n,{type:r.type,config:r,def:i,state:i.create(r.parameters,r.initialState)})});let t=this.registry.behaviors.get(e.behavior);if(!t)throw new Cr(this.t`behavior “${e.behavior}” not registered`);let n={device:e,def:t,state:void 0,ctx:void 0,timers:new Map};n.state=t.createState(e),n.ctx=this.makeContext(n),this.devices.set(e.id,n),t.onTick&&this.tickers.push(n)}),v(e,this.t).forEach(e=>this.warn(e.code,e.message,e.deviceId)),this.devices.forEach(e=>this.hook(e,`onInit`,()=>e.def.onInit?.(e.ctx))),this.initializing=!1,this.tickers.length&&this.queue.push(20,{type:`tick`})}reset(){this.queue.clear(),this.devices.clear(),this.objects.clear(),this.outputs.clear(),this.equipment.clear(),this.rooms.clear(),this.active.clear(),this.history=[],this.journal=[],this.diagnostics=[],this.reported.clear(),this.timeMs=0,this.physicsMs=0,this.clockOffsetMs=0,this.nextEventId=1,this.nextTelegramId=1,this.cause=null,this.fault=null,this.lastStop=null,this.cascadeAt=-1,this.cascadeCount=0,this.network.resetModes(),this.init()}play(){this.paused=!1}pause(){this.paused=!0}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}advance(e){if(!Number.isInteger(e)||e<0)throw RangeError(this.t`advance: non-negative integer duration expected (got ${e})`);this.run(this.timeMs+e,!1)}advanceUntilExplained(e){if(!Number.isInteger(e)||e<0)throw RangeError(this.t`non-negative integer duration expected (got ${e})`);return this.run(this.timeMs+e,!0)}stepToNextEvent(e=36e5){let t=this.timeMs+e;for(;!this.fault;){let e=this.queue.peek();if(!e||e.timeMs>t)return null;let n=this.processNext(e,!0);if(n)return n}return null}nextEventTime(){let e=this.queue.list().find(e=>e.item.type!==`tick`);return e?e.timeMs:null}busy(){if(this.fault)return!1;if(this.queue.list().some(e=>e.item.type!==`tick`))return!0;for(let e of this.equipment.values())if(e.state.moving===!0)return!0;return this.tickers.length>0||this.rooms.size>0}run(e,t){for(;!this.fault;){let n=this.queue.peek();if(!n||n.timeMs>e)break;let r=this.processNext(n,t);if(r)return r}return this.fault||(this.advancePhysics(e),this.timeMs=e),null}processNext(e,t){if(this.advancePhysics(e.timeMs),this.timeMs=e.timeMs,e.timeMs===this.cascadeAt?this.cascadeCount++:(this.cascadeAt=e.timeMs,this.cascadeCount=1),this.cascadeCount>this.maxSameTime)return this.raise({timeMs:this.timeMs,level:`error`,code:`cascade`,message:this.t`more than ${this.maxSameTime} events at t = ${this.timeMs} ms: cascade stopped (see the chain of causes in the journal)`,deviceId:e.item.type===`timer`||e.item.type===`deliver`?e.item.deviceId:void 0}),null;this.queue.pop();let n=this.nextEventId;if(this.process(e.item),!t)return null;let r=this.journal.filter(e=>e.id>=n&&Sr.has(e.kind));return r.length?(this.lastStop={timeMs:this.timeMs,events:r},this.lastStop):null}advancePhysics(e){let t=this.rooms.size?br:1/0;for(;this.physicsMs<e;){let n=Math.min(t,e-this.physicsMs);this.physicsMs+=n,this.advanceEquipment(n),this.rooms.size&&this.advanceRooms(n)}}advanceRooms(e){let t=new Map;for(let[e,n]of this.equipment){let r=n.config.room;if(r&&n.def.heatOutput)try{let e=n.def.heatOutput(n.state,n.config.parameters);Number.isFinite(e)&&t.set(r,(t.get(r)??0)+e)}catch(t){this.reportOnce(`heat:${e}`,{code:`extension-error`,message:this.t`equipment ${e} (${n.type}): ${t?.message??t}`,extension:n.type})}}this.rooms.forEach((n,r)=>{let i=n.room.timeConstantMs,a=n.windowOpen?i/8:i,o=n.outsideTemperatureC+(t.get(r)??0)*a/i;n.temperatureC=o+(n.temperatureC-o)*Math.exp(-e/a)})}advanceEquipment(e){for(let[t,n]of this.equipment)if(n.def.advance)try{n.state=n.def.advance(n.state,e,n.config.parameters)}catch(e){this.raise({timeMs:this.timeMs,level:`error`,code:`extension-error`,message:this.t`equipment ${t} (${n.type}): ${e?.message??e}`,extension:n.type})}}process(e){switch(e.type){case`tick`:this.tickers.forEach(e=>this.hook(e,`onTick`,()=>e.def.onTick(e.ctx,20))),this.queue.push(this.timeMs+20,{type:`tick`});break;case`timer`:{let t=this.devices.get(e.deviceId);if(!t)return;t.timers.delete(e.key);let n=this.log(`timer-fired`,e.causeId,{deviceId:e.deviceId,message:this.t`timer “${e.key}”`,data:{key:e.key}});this.withCause(n.id,()=>this.hook(t,`onTimer`,()=>t.def.onTimer?.(t.ctx,e.key,e.payload)));break}case`coupler`:{let t=this.active.get(e.telegramId),n=t?.tel.plan.couplers.find(t=>t.couplerId===e.couplerId);if(!t||!n)return;let r=this.network.coupler(n.couplerId);this.log(`coupler-decision`,t.tel.eventId,{telegramId:t.tel.id,couplerId:n.couplerId,ga:t.tel.ga,message:this.t`${this.network.couplerName(r)} ${r.address}: ${n.pass?n.tag===`rep`?this.t`repeated`:this.t`forwarded`:this.t`filtered`}`,data:{tag:n.tag,pass:n.pass,rcBefore:n.rcBefore,rcAfter:n.rcAfter}}),this.settle(e.telegramId);break}case`deliver`:this.deliver(e.telegramId,e.deviceId,e.internal)}}log(e,t,n={}){let r={id:this.nextEventId++,timeMs:this.timeMs,kind:e,causeId:t,...n};return this.initializing?r:(this.journal.push(r),this.journal.length>this.journalLimit&&this.journal.splice(0,this.journal.length-this.journalLimit),this.listeners.forEach(e=>{try{e(r)}catch{}}),r)}withCause(e,t){let n=this.cause;this.cause=e;try{return t()}finally{this.cause=n}}raise(e){this.diagnostics.push(e),this.log(`diagnostic`,this.cause,{deviceId:e.deviceId,message:e.message,data:{code:e.code,level:e.level}}),e.level===`error`&&(this.fault=e,this.paused=!0)}warn(e,t,n){let r={timeMs:this.timeMs,level:`warning`,code:e,message:t,deviceId:n};this.diagnostics.push(r),this.diagnostics.length>200&&this.diagnostics.shift(),this.log(`diagnostic`,this.cause,{deviceId:n,message:t,data:{code:e,level:`warning`}})}hook(e,t,n){if(!this.fault)try{n()}catch(n){this.raise({timeMs:this.timeMs,level:`error`,code:`extension-error`,message:this.t`${e.device.name} (${e.device.id}) · ${e.device.behavior}.${t}: ${n?.message??n}`,deviceId:e.device.id,extension:e.device.behavior})}}makeContext(e){let t=e.device,n=e=>{let n=t.objects.find(t=>t.id===e);if(!n)throw Error(this.t`unknown object “${e}” in ${t.id}`);return n},r=e=>{let n=t.channels.find(t=>t.id===e);if(!n)throw Error(this.t`unknown channel “${e}” in ${t.id}`);return n},i=()=>this.timeMs;return{get timeMs(){return i()},device:t,get state(){return e.state},getObject:e=>this.objects.get(n(e).key)?.value??null,setObject:(e,t)=>this.setObject(n(e),t),transmit:t=>this.transmit(e,n(t)),setOutput:(e,n)=>this.setOutput(t,r(e),n),getOutput:e=>this.outputs.get(`${t.id}/${r(e).id}`)??null,readEquipment:e=>{let n=this.equipment.get(`${t.id}/${r(e).id}`);return n?wr(n.state):null},readPower:e=>{let n=this.equipment.get(`${t.id}/${r(e).id}`);if(!n?.def.powerW)return null;try{let e=n.def.powerW(n.state,n.config.parameters);return Number.isFinite(e)?e:null}catch{return null}},readRoom:()=>t.room?this.room(t.room):null,clock:()=>this.clock(),setOutsideTemperature:e=>{if(!Number.isFinite(e))return;let t=Math.min(50,Math.max(-30,e));this.rooms.forEach(e=>e.outsideTemperatureC=t)},schedule:(t,n,r)=>this.schedule(e,t,n,r??null),cancel:t=>{let n=e.timers.get(t);n&&(this.queue.cancel(n),e.timers.delete(t))},t:this.t,note:e=>{this.log(`note`,this.cause,{deviceId:t.id,message:e})}}}setObject(e,t){if(typeof t!=`number`||!Number.isFinite(t))throw Error(this.t`non-numeric value for ${e.key}`);let n=ce(e.dpt,t),r=this.objects.get(e.key),i=r.value!==n;r.value=n,!this.initializing&&(r.updatedAtMs=this.timeMs,i&&this.log(`object-changed`,this.cause,{deviceId:e.deviceId,objectId:e.id,value:n}))}schedule(e,t,n,r){if(typeof t!=`string`||!t)throw Error(this.t`timer key required`);if(typeof n!=`number`||!Number.isFinite(n)||n<0)throw Error(this.t`invalid delay for “${t}”: ${n}`);let i=e.timers.get(t);i&&this.queue.cancel(i);let a=this.queue.push(this.timeMs+Math.round(n),{type:`timer`,deviceId:e.device.id,key:t,payload:wr(r),causeId:this.cause});e.timers.set(t,a)}setOutput(e,t,n){if(!(n?.type===`switch`&&typeof n.on==`boolean`||n?.type===`motor`&&[`up`,`down`,`stop`].includes(n.direction)||n?.type===`dim`&&Number.isFinite(n.level)&&Number.isFinite(n.fadeMs)&&n.fadeMs>=0))throw Error(this.t`invalid output command on ${t.id}: ${JSON.stringify(n)}`);let r=`${e.id}/${t.id}`;if(Tr(this.outputs.get(r),n))return;let i=this.equipment.get(r);if(i&&i.def.accepts!==n.type){this.raise({timeMs:this.timeMs,level:`error`,code:`incompatible-command`,message:this.t`${r}: command “${n.type}” incompatible with equipment ${i.type}`,deviceId:e.id});return}this.outputs.set(r,{...n}),i&&(i.state=i.def.applyCommand(i.state,n,i.config.parameters)),this.log(`output-changed`,this.cause,{deviceId:e.id,channelId:t.id,message:Dr(n,this.t),data:{command:{...n}}})}transmit(e,t){let n=e.device,r=e=>this.log(`transmit-ignored`,this.cause,{deviceId:n.id,objectId:t.id,message:e});if(this.initializing)return;if(!t.flags.T)return void r(this.t`T flag disabled: value changed locally, no telegram`);let i=t.gas[0];if(!i)return r(this.t`no group address associated`),this.warn(`no-ga`,this.t`${n.id}/${t.id}: transmission requested without a group address`,n.id);let a=this.objects.get(t.key).value;if(a===null)return void r(this.t`unknown value`);this.emit(n,{objectId:t.id,ga:i,dpt:t.dpt,value:a,service:`GroupValueWrite`,kind:t.port===`status`||t.port===`positionStatus`?`state`:`cmd`})}emit(e,t){let{ga:n,value:r}=t,i=t.service===`GroupValueRead`?0:F(t.dpt,r),a=this.nextTelegramId++,o=this.network.plan(e.id,n,this.timeMs),s=this.log(`telegram-emitted`,this.cause,{deviceId:e.id,objectId:t.objectId||void 0,telegramId:a,ga:n,value:t.service===`GroupValueRead`?null:r,data:{raw:i,dpt:t.dpt,service:t.service}}),c={id:a,timeMs:this.timeMs,sourceDeviceId:e.id,sourceAddress:e.address,objectId:t.objectId,ga:n,dpt:t.dpt,value:r,raw:i,kind:t.kind,service:t.service,causeId:this.cause,eventId:s.id,plan:o,receptions:[]},l=0;return e.objects.some(e=>e.id!==t.objectId&&e.gas.includes(n))&&(this.queue.push(this.timeMs,{type:`deliver`,telegramId:a,deviceId:e.id,internal:!0}),l++),o.couplers.forEach(e=>this.queue.push(e.tDecisionMs,{type:`coupler`,telegramId:a,couplerId:e.couplerId})),o.deliveries.forEach(e=>{this.queue.push(e.tDeliverMs,{type:`deliver`,telegramId:a,deviceId:e.deviceId,internal:!1}),l++}),l+o.couplers.length&&this.active.set(a,{tel:c,pending:l+o.couplers.length}),this.history.push(c),this.history.length>this.historyLimit&&this.history.splice(0,this.history.length-this.historyLimit),this.telegramListeners.forEach(e=>{try{e(c)}catch{}}),c}gaDpt(e){let t=this.scenario.groupAddresses.get(e)?.dpt;if(t)return t;for(let t of this.scenario.devices)for(let n of t.objects)if(n.gas.includes(e))return n.dpt;return`1.001`}groupWrite(e,t,n){return this.request(e,t,`GroupValueWrite`,n)}groupRead(e,t){return this.request(e,t,`GroupValueRead`,0)}request(e,t,n,r){let i=this.devices.get(e);if(!i||!m(t)||h(t)||this.fault)return null;let a=this.gaDpt(t);if(n===`GroupValueWrite`){let e=re(a,r,this.t);if(e)throw RangeError(this.t`write to ${t} refused: ${e}`);r=ce(a,r)}let o=this.log(`input`,null,{deviceId:e,ga:t,value:n===`GroupValueRead`?null:r,message:n===`GroupValueRead`?this.t`USB interface: reading ${t}`:this.t`USB interface: writing ${t}`,data:{service:n}}),s=null;return this.withCause(o.id,()=>{s=this.emit(i.device,{objectId:``,ga:t,dpt:a,value:r,service:n,kind:`cmd`})}),s}onTelegram(e){return this.telegramListeners.add(e),()=>this.telegramListeners.delete(e)}settle(e){let t=this.active.get(e);t&&--t.pending<=0&&this.active.delete(e)}deliver(e,t,n){let r=this.active.get(e),i=this.devices.get(t);if(!r||!i)return;let a=r.tel,o=i.device.objects.filter(e=>e.gas.includes(a.ga)&&!(n&&e.id===a.objectId)),s=this.log(`telegram-received`,a.eventId,{deviceId:t,telegramId:e,ga:a.ga,value:a.value,message:o.length?void 0:this.t`reached but no association`,data:{internal:n,associated:o.length}}),c={deviceId:t,timeMs:this.timeMs,internal:n,objects:[]};if(a.receptions.push(c),a.service===`GroupValueRead`){this.answerRead(i,a,s.id,c,n),this.settle(e);return}let l=a.service===`GroupValueResponse`;for(let r of o){if(this.fault)break;if(l&&!r.flags.U){this.log(`object-write-ignored`,s.id,{deviceId:t,objectId:r.id,telegramId:e,ga:a.ga,value:a.value,message:this.t`U flag off: response ignored, value unchanged`}),c.objects.push({objectId:r.id,result:`ignored`});continue}if(!l&&!r.flags.W){this.log(`object-write-ignored`,s.id,{deviceId:t,objectId:r.id,telegramId:e,ga:a.ga,value:a.value,message:this.t`W flag disabled: value and behavior unchanged`}),c.objects.push({objectId:r.id,result:`ignored`});continue}let o=this.objects.get(r.key),u=o.value,d=ie(r.dpt,a.raw);o.value=d,o.updatedAtMs=this.timeMs;let f=this.log(`object-write-accepted`,s.id,{deviceId:t,objectId:r.id,telegramId:e,ga:a.ga,value:d,data:{oldValue:u,internal:n}});c.objects.push({objectId:r.id,result:`accepted`}),this.withCause(f.id,()=>this.hook(i,`onObjectWrite`,()=>i.def.onObjectWrite?.(i.ctx,{objectId:r.id,oldValue:u,newValue:d,origin:n?`internal`:`bus`,telegramId:e,ga:a.ga})))}this.settle(e)}answerRead(e,t,n,r,i){i||e.device.objects.filter(e=>e.gas.includes(t.ga)).forEach(i=>{let a=this.objects.get(i.key),o=i.flags.R?a.value===null?this.t`unknown value: no response`:null:this.t`R flag off: no response`;if(r.objects.push({objectId:i.id,result:o?`ignored`:`accepted`}),o){this.log(`object-write-ignored`,n,{deviceId:e.device.id,objectId:i.id,telegramId:t.id,ga:t.ga,message:o});return}let s=i.gas[0];s!==t.ga&&this.log(`note`,n,{deviceId:e.device.id,objectId:i.id,telegramId:t.id,ga:t.ga,message:this.t`read on ${t.ga}: the response is sent on the object's sending address ${s}`}),this.withCause(n,()=>this.emit(e.device,{objectId:i.id,ga:s,dpt:i.dpt,value:a.value,service:`GroupValueResponse`,kind:`state`}))})}input(e,t,n,r){let i=this.devices.get(e);if(!i||this.fault)return[];let a=i.device;if(n===`value`){let e=a.inputs.find(e=>e.id===t);if(!e||typeof r!=`number`||!Number.isFinite(r))return[];r=Math.min(e.max,Math.max(e.min,r))}else{let e=a.buttons.find(e=>e.id===t);if(!e||!e[n])return[]}let o=this.nextTelegramId,s=this.nextEventId,c=this.log(`input`,null,{deviceId:e,message:n===`value`?`${t} = ${r}`:`${t} · ${n}`,data:{inputId:t,gesture:n,...r===void 0?{}:{value:r}}});this.withCause(c.id,()=>this.hook(i,`onInput`,()=>i.def.onInput?.(i.ctx,{inputId:t,gesture:n,value:r})));let l=this.journal.filter(e=>e.id>=s&&Sr.has(e.kind));return l.length&&(this.lastStop={timeMs:this.timeMs,events:l}),this.history.filter(e=>e.id>=o)}press(e,t,n){let r=this.scenario.devicesById.get(e),i=typeof t==`number`?r?.buttons[t]:r?.buttons.find(e=>e.id===t);return i?this.input(e,i.id,n)[0]??null:null}objectValue(e,t){return this.objects.get(`${e}/${t}`)?.value??null}objectUpdatedAt(e,t){return this.objects.get(`${e}/${t}`)?.updatedAtMs??null}output(e,t){return this.outputs.get(`${e}/${t}`)??null}equipmentState(e,t){return this.equipment.get(`${e}/${t}`)?.state??null}equipmentAction(e,t,n,r=null){let i=this.equipment.get(`${e}/${t}`);if(!i?.def.interact||this.fault)return!1;let a;try{if(a=i.def.interact(i.state,n,i.config.parameters??{},r),!a||typeof a!=`object`||Array.isArray(a))throw Error(this.t`interact must return the state (object)`)}catch(r){return this.raise({timeMs:this.timeMs,level:`error`,code:`extension-error`,message:this.t`equipment ${e}/${t} (${i.type}).interact(${n}): ${r?.message??r}`,deviceId:e,extension:i.type}),!1}return a!==i.state&&(i.state=a,this.log(`note`,null,{deviceId:e,channelId:t,message:this.t`equipment action: ${n}`,data:{action:n,payload:r}}),!0)}room(e){let t=this.rooms.get(e);return t?{id:e,name:t.room.name,temperatureC:t.temperatureC,outsideTemperatureC:t.outsideTemperatureC,windowOpen:t.windowOpen}:null}roomAction(e,t,n){let r=this.rooms.get(e);if(!r||this.fault||!Number.isFinite(n))return[];if(t===`window`){if(r.windowOpen===!!n)return[];r.windowOpen=!!n}else{let e=Math.min(50,Math.max(-30,n));if(e===r.outsideTemperatureC)return[];r.outsideTemperatureC=e}let i=this.nextTelegramId,a=this.nextEventId,o=this.log(`input`,null,{message:t===`window`?r.windowOpen?this.t`${r.room.name}: window opened`:this.t`${r.room.name}: window closed`:this.t`${r.room.name}: outside temperature ${r.outsideTemperatureC} °C`,data:{room:e,action:t,value:n}}),s=this.room(e);this.withCause(o.id,()=>this.devices.forEach(t=>t.device.room===e&&t.def.onRoomChange&&this.hook(t,`onRoomChange`,()=>t.def.onRoomChange(t.ctx,s))));let c=this.journal.filter(e=>e.id>=a&&Sr.has(e.kind));return c.length&&(this.lastStop={timeMs:this.timeMs,events:c}),this.history.filter(e=>e.id>=i)}channelState(e,t){let n=this.devices.get(e);if(!n?.def.channelState)return{};try{return n.def.channelState(n.state,t,this.timeMs,n.device)}catch(r){return this.reportOnce(`projection:${e}/${t}`,{code:`extension-error`,message:this.t`${n.device.behavior}.channelState(${t}): ${r?.message??r}`,deviceId:e,extension:n.device.behavior}),{}}}deviceState(e){let t=this.devices.get(e);if(!t?.def.deviceState)return{};try{return t.def.deviceState(t.state,this.timeMs,t.device)}catch(n){return this.reportOnce(`projection:${e}`,{code:`extension-error`,message:this.t`${t.device.behavior}.deviceState: ${n?.message??n}`,deviceId:e,extension:t.device.behavior}),{}}}reportOnce(e,t){this.reported.has(e)||(this.reported.add(e),this.diagnostics.push({timeMs:this.timeMs,level:`warning`,...t}),this.diagnostics.length>200&&this.diagnostics.shift())}telegram(e){return this.active.get(e)?.tel??this.history.find(t=>t.id===e)}inFlight(){return[...this.active.values()].map(e=>e.tel)}visibleTelegrams(e=2e3){let t=new Map;return this.history.forEach(n=>this.timeMs<n.plan.endMs+e&&t.set(n.id,n)),this.active.forEach(e=>t.set(e.tel.id,e.tel)),[...t.values()].sort((e,t)=>e.id-t.id)}getState(){let e={},t={},n={};return this.scenario.devices.forEach(r=>{r.objects.forEach(t=>{let n=this.objects.get(t.key);e[t.key]={value:n.value,updatedAtMs:n.updatedAtMs,flags:{...t.flags}}}),r.channels.forEach(e=>{let i=`${r.id}/${e.id}`;t[i]={output:wr(this.outputs.get(i)??null),state:wr(this.channelState(r.id,e.id))};let a=this.equipment.get(i);a&&(n[i]={type:a.type,state:wr(a.state)})})}),{timeMs:this.timeMs,clock:this.clock(),paused:this.paused,faulted:this.fault!==null,objects:e,channels:t,equipment:n,rooms:Object.fromEntries([...this.rooms].map(([e,t])=>[e,{temperatureC:t.temperatureC,outsideTemperatureC:t.outsideTemperatureC,windowOpen:t.windowOpen}])),telegramsInFlight:this.active.size,diagnostics:wr(this.diagnostics)}}};function Dr(e,t=c){return e.type===`switch`?e.on?t`relay closed`:t`relay open`:e.type===`dim`?e.level<=0?t`off`:e.fadeMs>0?t`dimming to ${Math.round(e.level)} % in ${(e.fadeMs/1e3).toFixed(1)} s`:t`level ${Math.round(e.level)} %`:e.direction===`up`?t`motor ▲ up`:e.direction===`down`?t`motor ▼ down`:t`motor stopped`}function Or(e){let t=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(e);if(!t)return null;let[n,r,i,a,o,s]=t.slice(1).map(e=>Number(e??0)),c=Date.UTC(n,r-1,i,a,o,s??0),l=new Date(c);return l.getUTCMonth()===r-1&&l.getUTCDate()===i&&a<24&&o<60&&(s??0)<60?c:null}var kr=class extends Error{constructor(e){let t=e.map(e=>e.path?`${e.path} : ${e.message}`:e.message);super(t.join(`
`)),S(this,`details`,void 0),S(this,`problems`,void 0),this.details=e,this.name=`ScenarioError`,this.problems=t}},Ar=[`pushButton`,`switchActuator`,`shutterActuator`,`sensor`,`supervisor`,`generic`],jr={sensor:`input`,display:`display`,switch:`switch`,status:`status`,move:`move`,stop:`stopStep`,position:`positionStatus`,scene:`scene`,forced:`forced`},Mr={switch:`1.001`,status:`1.001`,move:`1.008`,stopStep:`1.007`,positionCommand:`5.001`,positionStatus:`5.001`,scene:`17.001`,forced:`2.001`,input:`1.001`,display:`1.001`},Nr=/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/,Pr=[`on`,`off`,`toggle`,`up`,`down`,`updown`,`scene`,`presence`,`clock`,`dimUp`,`dimDown`],Fr=[`$schema`,`formatVersion`,`title`,`description`,`lines`,`devices`,`groupAddresses`,`ipRouter`,`topology`,`rooms`,`clock`,`options`],Ir=[`id`,`name`,`temperatureC`,`outsideTemperatureC`,`windowOpen`,`timeConstantMs`],Lr=[`backbone`,`mainLines`,`ip`,`areas`,`couplers`],Rr=[`address`,`name`],zr=[`address`,`name`,`down`,`up`],Br=[`filter`,`route`,`block`],Vr=[`address`,`name`,`extension`],Hr=[`address`,`mode`,`switchable`],Ur=[`address`,`name`,`dpt`],Wr=[`id`,`name`,`address`,`kind`,`behavior`,`parameters`,`objects`,`buttons`,`inputs`,`channels`,`medium`,`downstream`,`description`,`inFilterTables`,`room`],Gr=[`id`,`name`,`ga`,`dpt`,`port`,`channel`,`value`,`flags`],Kr=[`id`,`label`,`icon`,`press`,`short`,`long`,`release`,`led`],qr=[`object`,`value`],Jr=[`id`,`type`,`label`,`object`,`min`,`max`,`step`],Yr=[`id`,`label`,`parameters`,`initialState`,`equipment`,`scenes`],Xr=[`type`,`view`,`room`,`parameters`,`initialState`],Zr=[`speed`,`filterTables`],Qr=(e,t)=>Object.hasOwn(e,t)?e[t]:void 0,q=e=>typeof e==`object`&&!!e&&!Array.isArray(e);function $r(e,t){switch(e){case`pushButton`:case`sensor`:return`pushButton/v1`;case`switchActuator`:return`switchActuator/v1`;case`shutterActuator`:return`shutterActuator/v1`;case`supervisor`:return`display/v1`;default:return t?`pushButton/v1`:`passive/v1`}}function ei(e,t=gr(),n=c){let r=[],i=(e,t,n)=>r.push({path:e,code:t,message:n});if(!q(e))throw new kr([{path:``,code:`type`,message:n`The scenario must be a JSON object.`}]);let a=1;if(e.formatVersion!==void 0){if(e.formatVersion===2)a=2;else if(e.formatVersion===1)a=1;else throw new kr([{path:`formatVersion`,code:`version`,message:n`unknown format version “${String(e.formatVersion)}” (supported versions: 1, 2)`}])}let o=a===2;!o&&e.formatVersion===void 0&&Array.isArray(e.devices)&&e.devices.some(e=>q(e)&&(e.behavior!==void 0||Array.isArray(e.objects)&&e.objects.some(e=>q(e)&&(e.port!==void 0||e.flags!==void 0))))&&i(`formatVersion`,`required`,n`missing: this file uses format 2 fields (behavior, port, flags); add "formatVersion": 2`);let s=(e,t,r)=>{o&&Object.keys(e).forEach(e=>{t.includes(e)||i(r?`${r}.${e}`:e,`unknown-field`,n`unknown field “${e}”`)})},l=(e,t,r,a=!1)=>{let o=e[t];if(o===void 0){a&&i(`${r}.${t}`.replace(/^\./,``),`required`,n`required field`);return}if(typeof o!=`string`){i(`${r}.${t}`.replace(/^\./,``),`type`,n`text expected`);return}return o},u=(e,t,r,a=!0)=>{let o=`${r}.${t}`.replace(/^\./,``);if(e[t]===``){i(o,`required`,n`empty identifier`);return}let s=l(e,t,r,a);if(s!==void 0){if(!Nr.test(s)){i(o,`id`,n`invalid identifier “${s}”: letters, digits, “_”, “-” or “.”, no space or “/”`);return}return s}},d=(e,t,r)=>{if(e[t]===``){i(`${r}.${t}`.replace(/^\./,``),`required`,n`empty value`);return}return l(e,t,r,!0)},f=(e,t,r,a=!1)=>{let o=e[t];return o===void 0?(a&&i(`${r}${t}`,`required`,n`list required`),[]):Array.isArray(o)?o:(i(`${r}${t}`,`type`,n`list expected`),[])};s(e,Fr,``);let _=l(e,`title`,``)??``,v=l(e,`description`,``)??``,y=[],b=f(e,`lines`,``,!0);Array.isArray(e.lines)&&b.length===0&&i(`lines`,`required`,n`at least one line is required`),b.forEach((e,t)=>{let r=`lines[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Vr,r);let a=l(e,`address`,r,!0);if(a===void 0)return;let o=g(a);if(!o)return i(`${r}.address`,`address`,n`“${a}” is not a valid line address (e.g. 1.1, area and line 0–15)`);if(o[0]===0&&o[1]!==0)return i(`${r}.address`,`address`,n`lines 0.1 to 0.15, connected directly to the backbone, exist in KNX but are not supported by BusDiagram; use an area from 1 to 15`);if(o[0]===0||o[1]===0)return i(`${r}.address`,`address`,n`${a} is not a line: Z.0 is the main line of area Z and 0.0 the backbone; they appear through “topology” (area and line 1–15)`);if(y.some(e=>e.address===a))return i(r,`duplicate`,n`duplicate line ${a}`);let c=null;if(e.extension!==void 0){let t=e.extension;if(!q(t))i(`${r}.extension`,`type`,n`object expected`);else{s(t,Hr,`${r}.extension`);let e=l(t,`address`,`${r}.extension`,!0)??``,o=p(e);o?`${o[0]}.${o[1]}`===a?o[2]===0&&i(`${r}.extension.address`,`address`,n`${e} is reserved for the line coupler; a line repeater or segment coupler uses a device number from 1 to 255, for example ${a}.64`):i(`${r}.extension.address`,`address`,n`extension ${e} does not belong to line ${a}`):i(`${r}.extension.address`,`address`,n`“${e}” is not a valid individual address`),t.mode!==void 0&&t.mode!==`repeater`&&t.mode!==`segmentCoupler`&&i(`${r}.extension.mode`,`enum`,n`“repeater” or “segmentCoupler” expected`),t.switchable!==void 0&&typeof t.switchable!=`boolean`&&i(`${r}.extension.switchable`,`type`,n`boolean expected`),c={address:e,mode:t.mode===`segmentCoupler`?`segmentCoupler`:`repeater`,switchable:t.switchable===!0}}}y.push({address:a,area:o[0],line:o[1],name:l(e,`name`,r)??``,extension:c})}),y.sort((e,t)=>e.area-t.area||e.line-t.line);let x=[...new Set(y.map(e=>e.area))].sort((e,t)=>e-t),S=e.topology,C=q(S)?S:{};S!==void 0&&!q(S)?i(`topology`,`type`,n`object expected`):S!==void 0&&s(C,Lr,`topology`);let w=e=>{let t=C[e];return t!==void 0&&typeof t!=`boolean`&&i(`topology.${e}`,`type`,n`boolean expected`),t===!0},T=w(`backbone`),E=w(`mainLines`),D=null;C.ip!==void 0&&(C.ip!==`areaCouplers`&&C.ip!==`lineCouplers`?i(`topology.ip`,`enum`,n`“areaCouplers” or “lineCouplers” expected`):D=C.ip);let O=n`KNX/IP router`,k=null;if(e.ipRouter!==void 0){let t=e.ipRouter;if(!q(t))i(`ipRouter`,`type`,n`object expected`);else{s(t,[`address`,`name`],`ipRouter`);let e=l(t,`address`,`ipRouter`,!0)??``;p(e)||i(`ipRouter.address`,`address`,n`“${e}” is not a valid individual address`),O=l(t,`name`,`ipRouter`)??O,D?i(`ipRouter`,`conflict`,n`“ipRouter” and “topology.ip” both describe the IP network: keep “topology.ip”`):(D=y.length===1&&!T&&!E?`lineCouplers`:`areaCouplers`,k={address:e,path:`ipRouter.address`})}}D===`lineCouplers`&&(T||E)&&i(`topology.ip`,`conflict`,n`with IP routers as line couplers, the IP network acts as main lines and backbone: remove “backbone” and “mainLines”`);let A=D!==`lineCouplers`&&(x.length>1||T||D===`areaCouplers`),j=D===`lineCouplers`?[]:x.filter(e=>A||E||y.filter(t=>t.area===e).length>1),ne=A&&D!==`areaCouplers`,M=new Map;if(j.forEach(e=>y.filter(t=>t.area===e).forEach(e=>M.set(`${e.address}.0`,n`line coupler ${e.address}`))),A&&x.forEach(e=>M.set(`${e}.0.0`,D===`areaCouplers`?n`KNXnet/IP router of area ${e}`:n`area coupler ${e}`)),D===`lineCouplers`&&y.forEach(e=>M.set(`${e.address}.0`,n`KNXnet/IP router of line ${e.address}`)),k&&p(k.address)){let e=D===`lineCouplers`?[`${y[0]?.address}.0`]:x.map(e=>`${e}.0.0`);e.length>1?i(k.path,`address`,n`several areas: one KNXnet/IP router per area (${e.join(`, `)}); write “topology”: { "ip": "areaCouplers" } instead of “ipRouter”`):e[0]!==k.address&&i(k.path,`address`,n`a KNXnet/IP router is a coupler: its address is ${e[0]} (Z.L.0 for a line, Z.0.0 for an area)`)}let P=new Map;f(C,`areas`,`topology.`).forEach((e,t)=>{let r=`topology.areas[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Rr,r);let a=e.address;if(typeof a!=`number`||!Number.isInteger(a)||a<1||a>15)return i(`${r}.address`,`range`,n`area number 1–15 expected`);if(!x.includes(a))return i(`${r}.address`,`reference`,n`area ${a} has no declared line`);if(P.has(a))return i(`${r}.address`,`duplicate`,n`duplicate area ${a}`);P.set(a,l(e,`name`,r)??``)});let F=new Map;f(C,`couplers`,`topology.`).forEach((e,t)=>{let r=`topology.couplers[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,zr,r);let a=l(e,`address`,r,!0);if(a===void 0)return;if(!M.has(a))return i(`${r}.address`,`reference`,n`no coupler at ${a} (couplers of this installation: ${[...M.keys()].join(`, `)||n`none`})`);if(F.has(a))return i(`${r}.address`,`duplicate`,n`duplicate coupler ${a}`);let o=t=>{let a=e[t];return a===void 0?`filter`:Br.includes(a)?a:(i(`${r}.${t}`,`enum`,n`“filter”, “route” or “block” expected`),`filter`)};F.set(a,{down:o(`down`),up:o(`up`),name:l(e,`name`,r)??``})});let ie={ip:D,backbone:ne,mainLines:j,forced:{backbone:T,mainLines:E},areas:x.map(e=>({address:e,name:P.get(e)??``})),couplers:F,routerName:O},ae=[];f(e,`rooms`,``).forEach((e,t)=>{let r=`rooms[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Ir,r);let a=u(e,`id`,r);if(!a)return;if(ae.some(e=>e.id===a))return i(`${r}.id`,`duplicate`,n`duplicate room “${a}”`);let o=(t,a,o,s)=>{let c=e[t];return c===void 0?a:typeof c!=`number`||!Number.isFinite(c)||c<o||c>s?(i(`${r}.${t}`,`range`,n`number ${o}…${s} expected`),a):c};e.windowOpen!==void 0&&typeof e.windowOpen!=`boolean`&&i(`${r}.windowOpen`,`type`,n`boolean expected`);let c=o(`timeConstantMs`,3e5,1e3,864e5);Number.isInteger(c)||i(`${r}.timeConstantMs`,`type`,n`integer expected`),ae.push({id:a,name:l(e,`name`,r)??a,temperatureC:o(`temperatureC`,20,-30,60),outsideTemperatureC:o(`outsideTemperatureC`,5,-30,50),windowOpen:e.windowOpen===!0,timeConstantMs:Math.round(c)})});let oe=null;if(e.clock!==void 0){let t=e.clock;if(!q(t))i(`clock`,`type`,n`object expected`);else{s(t,[`start`,`speed`],`clock`);let e=l(t,`start`,`clock`,!0),r=e===void 0?null:Or(e);e!==void 0&&r===null&&i(`clock.start`,`format`,n`“${e}” is not a local date and time (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)`);let a=t.speed===void 0?1:t.speed;typeof a!=`number`||!Number.isFinite(a)||a<=0||a>3600?i(`clock.speed`,`range`,n`number > 0 and ≤ 3600 expected`):e!==void 0&&r!==null&&(oe={start:e,startMs:r,speed:a})}}let se=(e,t)=>e.room===void 0||e.room===null?null:typeof e.room!=`string`||!ae.some(t=>t.id===e.room)?(i(`${t}.room`,`unknown-room`,n`unknown room “${String(e.room)}” (declared rooms: ${ae.map(e=>e.id).join(`, `)||n`none`})`),null):e.room,I=new Map;f(e,`groupAddresses`,``).forEach((e,t)=>{let r=`groupAddresses[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Ur,r);let a=l(e,`address`,r,!0);if(a===void 0)return;if(!m(a))return i(`${r}.address`,`address`,n`“${a}” is not a valid 3-level group address (0–31/0–7/0–255)`);if(h(a))return i(`${r}.address`,`address`,n`0/0/0 is the broadcast address and cannot be used as a group address`);if(I.has(a))return i(r,`duplicate`,n`duplicate group address ${a}`);o&&e.dpt===``&&i(`${r}.dpt`,`dpt`,n`empty DPT (remove the field or write a DPT)`);let c=l(e,`dpt`,r)??``;c&&!te(c)&&i(`${r}.dpt`,`dpt`,n`DPT “${c}” not supported`),I.set(a,{address:a,name:l(e,`name`,r)??``,dpt:c})});let le=[],L=new Map,ue=new Map;M.forEach((e,t)=>ue.set(t,e)),y.forEach((e,t)=>{if(!e.extension)return;let r=ue.get(e.extension.address);r?i(`lines[${t}].extension.address`,`duplicate`,n`individual address ${e.extension.address} already used (${r})`):ue.set(e.extension.address,`line ${e.address} extension`)}),f(e,`devices`,``,!0).forEach((e,t)=>{let r=`devices[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Wr,r);let a=de(e,r);a&&(le.push(a),L.set(a.id,a))});function de(e,a){let c=u(e,`id`,a);if(!c)return null;if(L.has(c))return i(`${a}.id`,`duplicate`,n`duplicate identifier “${c}”`),null;let g=f(e,`buttons`,`${a}.`),_=o?f(e,`inputs`,`${a}.`):[],v=l(e,`kind`,a,o)??`generic`;!o&&!Ar.includes(v)&&i(`${a}.kind`,`enum`,n`unknown type “${v}”`);let b;b=o?d(e,`behavior`,a)??``:$r(v,g.length>0);let x=t.behaviors.get(b);b&&!x&&i(`${a}.behavior`,`unknown-behavior`,n`unknown behavior “${b}” (extension not loaded? Available behaviors: ${[...t.behaviors.keys()].join(`, `)})`);let S=v===`supervisor`?`IP`:`TP`;e.medium!==void 0&&(e.medium!==`TP`&&e.medium!==`IP`?i(`${a}.medium`,`enum`,n`“TP” or “IP” expected`):S=e.medium);let C=l(e,`address`,a)??``,w=null;if(e.downstream!==void 0&&typeof e.downstream!=`boolean`&&i(`${a}.downstream`,`type`,n`boolean expected`),e.inFilterTables!==void 0&&typeof e.inFilterTables!=`boolean`&&i(`${a}.inFilterTables`,`type`,n`boolean expected`),S===`TP`){let t=p(C);if(!t)i(`${a}.address`,`address`,n`“${C}” is not a valid individual address (e.g. 1.1.10; area and line 0–15, device 0–255)`);else{w=`${t[0]}.${t[1]}`,t[2]===0&&i(`${a}.address`,`address`,t[1]===0?t[0]===0?n`${C} is not a device address: device number 0 is reserved for couplers`:n`${C} is reserved for the area (backbone) coupler`:n`${C} is reserved for the line coupler`);let r=y.find(e=>e.address===w);t[0]===0&&t[1]===0?ie.backbone||i(`${a}.address`,`reference`,n`${C} is on the backbone (0.0), absent from this installation: add an area or “topology”: { "backbone": true }`):t[1]===0?ie.mainLines.includes(t[0])||i(`${a}.address`,`reference`,n`${C} is on main line ${w}, absent from this installation: add a line to area ${t[0]} or “topology”: { "mainLines": true }`):r||i(`${a}.address`,`reference`,n`line ${w} is not declared in “lines”`),e.downstream===!0&&!r?.extension&&i(`${a}.downstream`,`reference`,n`line ${w} has no extension (repeater/segment coupler)`)}}else ie.ip||i(`${a}.medium`,`reference`,n`an IP device requires an IP network (“topology”: { "ip": … })`),C&&!p(C)&&i(`${a}.address`,`address`,n`“${C}” is not a valid individual address`);if(C){let e=ue.get(C);e?i(`${a}.address`,`duplicate`,n`individual address ${C} already used (${e})`):ue.set(C,`${a}.address`)}let T=at(x?.parameters,e.parameters,`${a}.parameters`,r,n),E=[];if(b===`usbInterface/v1`&&typeof T.groupAddresses==`string`)for(let e of T.groupAddresses.split(/[\s,;]+/).filter(Boolean))m(e)?h(e)?i(`${a}.parameters.groupAddresses`,`address`,n`0/0/0 is the broadcast address and cannot be used as a group address`):E.push(e):i(`${a}.parameters.groupAddresses`,`address`,n`“${e}” is not a valid 3-level group address (0–31/0–7/0–255)`);let D=[],O=f(e,`channels`,`${a}.`);if(b===`daliGateway/v1`&&O.length>16&&i(`${a}.channels`,`range`,n`DALI gateway supports at most 16 groups`),O.forEach((e,c)=>{let f=`${a}.channels[${c}]`;if(!q(e))return i(f,`type`,n`object expected`);s(e,Yr,f);let p=u(e,`id`,f);if(!p)return;if(D.some(e=>e.id===p))return i(`${f}.id`,`duplicate`,n`duplicate channel “${p}”`);let m=l(e,`label`,f)??p,h=e.parameters,g=e.initialState,_=null,y=e.equipment;if(!o){let t=t=>{let r=e[t];if(r!==void 0){if(typeof r!=`number`||!Number.isFinite(r)||r<=0){i(`${f}.${t}`,`range`,n`strictly positive duration in seconds expected`);return}return Math.round(r*1e3)}},r=t(`timer`),a=t(`travel`)??12e3,o=e.load??(v===`shutterActuator`?`shutter`:v===`switchActuator`?`lamp`:`none`);o!==`lamp`&&o!==`shutter`&&o!==`none`&&i(`${f}.load`,`enum`,n`“lamp”, “shutter” or “none” expected`),h=b===`switchActuator/v1`?{timerMs:r??null}:b===`shutterActuator/v1`?{estimatedTravelTimeMs:a}:void 0,g=void 0,y=o===`lamp`?{type:`lamp`}:o===`shutter`?{type:`shutter`,parameters:{actualTravelTimeMs:a}}:null}let S=at(x?.channelParameters,h,`${f}.parameters`,r),C=at(x?.channelInitialState,g,`${f}.initialState`,r);if(y!=null){let e=`${f}.equipment`;if(!q(y))i(e,`type`,n`object or null expected`);else{s(y,Xr,e);let a=d(y,`type`,e)??``,o=t.equipment.get(a);a&&!o&&i(`${e}.type`,`unknown-equipment`,n`unknown equipment “${a}” (available: ${[...t.equipment.keys()].join(`, `)})`),o&&x&&x.output&&o.accepts!==x.output&&i(`${e}.type`,`incompatible`,n`“${a}” expects “${o.accepts}” commands, behavior ${b} sends “${x.output}”`),o&&x&&!x.output&&i(`${e}.type`,`incompatible`,n`behavior ${b} drives no output`);let c=se(y,e);!c&&o?.heatOutput&&i(`${e}.room`,`required`,n`heated or cooled room required (“room”)`);let u=r.length,f=at(o?.parameters,y.parameters,`${e}.parameters`,r,n);o?.checkParameters&&r.length===u&&o.checkParameters(f,n).forEach(t=>i(`${e}.parameters.${t.parameter}`,`range`,t.message)),_={type:a,view:l(y,`view`,e)??(a===`shutter`&&Number(f.slatTravelMs??0)>0?`venetianBlind`:a),room:c,parameters:f,initialState:at(o?.initialState,y.initialState,`${e}.initialState`,r,n)}}}let w=new Map;e.scenes!==void 0&&(q(e.scenes)?Object.entries(e.scenes).forEach(([e,t])=>{let r=Number(e),a=`${f}.scenes.${e}`;if(!/^([1-9]|[1-5][0-9]|6[0-4])$/.test(e))return i(a,`range`,n`integer scene number 1–64 expected`);if(b===`daliGateway/v1`&&r>16)return i(a,`range`,n`DALI scene number 1–16 expected`);if(typeof t!=`number`||!Number.isFinite(t))return i(a,`type`,n`number expected`);if(x?.output===`switch`&&t!==0&&t!==1)return i(a,`range`,n`preset 0 or 1 expected for a switching channel`);if(x?.output===`motor`&&(t<0||t>100))return i(a,`range`,n`position 0–100 % expected for a shutter`);w.set(r,t)}):i(`${f}.scenes`,`type`,n`object { scene number: value } expected`)),D.push({id:p,label:m,parameters:S,initialState:C,scenes:w,equipment:_?.type??null,equipmentConfig:_})}),b===`daliGateway/v1`){let e=new Map;D.forEach((t,r)=>{let o=t.equipmentConfig;if(o?.type!==`daliGroup`)return;let s=Number(o.parameters.firstAddress??0),c=Number(o.parameters.ballasts??2);if(!(!Number.isInteger(s)||!Number.isInteger(c)||s<0||c<1||s+c>64))for(let o=s;o<s+c;o++){let s=e.get(o);s?i(`${a}.channels[${r}].equipment.parameters.firstAddress`,`duplicate`,n`DALI short address A${o} is already assigned to channel ${s}; overlapping groups are outside this model`):e.set(o,t.id)}})}let k=[],A=new Map,j=f(e,`objects`,`${a}.`,!0);j.forEach((e,t)=>{let r=`${a}.objects[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Gr,r);let f=u(e,`id`,r);if(!f)return;if(k.some(e=>e.id===f))return i(`${r}.id`,`duplicate`,n`duplicate object “${f}”`);let p=[];Array.isArray(e.ga)?p=e.ga:typeof e.ga==`string`?(e.ga===``&&o&&i(`${r}.ga`,`address`,n`empty address: write [] for an unassociated object`),p=e.ga===``?[]:[e.ga]):e.ga===void 0?o&&i(`${r}.ga`,`required`,n`required field (empty list for an unassociated object)`):i(`${r}.ga`,`type`,n`group address or list of addresses expected`),p=p.filter((e,t)=>typeof e!=`string`||!m(e)?(i(`${r}.ga`,`address`,n`“${String(e)}” is not a valid 3-level group address (e.g. 1/1/1)`),!1):h(e)?(i(`${r}.ga`,`address`,n`0/0/0 is the broadcast address and cannot be used as a group address`),!1):p.indexOf(e)===t||(i(`${r}.ga`,`duplicate`,n`duplicate address ${e} in the object`),!1));let g;if(o)g=d(e,`port`,r)??``;else{let t=e.role??(v===`supervisor`?`display`:`sensor`);g=typeof t==`string`?Qr(jr,t)??``:``,g||i(`${r}.role`,`enum`,n`unknown role “${String(t)}”`)}let _=x?Qr(x.ports,g):void 0;g&&x&&!_&&i(`${r}.${o?`port`:`role`}`,`port`,n`port “${g}” not accepted by ${b} (ports: ${Object.keys(x.ports).join(`, `)})`);let y=null,S=l(e,`channel`,r);S?(D.some(e=>e.id===S)?y=S:i(`${r}.channel`,`reference`,n`channel “${S}” missing from ${a}.channels`),_?.channel===`none`&&i(`${r}.channel`,`port`,n`port “${g}” does not refer to a channel`)):!o&&_&&_.channel!==`none`&&D.length===1?y=D[0].id:_?.channel===`required`&&i(`${r}.channel`,`required`,n`port “${g}” requires a channel`);let C=l(e,`dpt`,r)??I.get(p[0]??``)?.dpt??``;!C&&!o&&(C=Qr(Mr,g)??`1.001`),C?te(C)?_&&_.dpts!==`any`&&!_.dpts.includes(C)&&i(`${r}.dpt`,`dpt`,n`DPT ${C} incompatible with port “${g}” (expected: ${_.dpts.join(`, `)})`):i(`${r}.dpt`,`dpt`,n`DPT “${C}” not supported`):i(`${r}.dpt`,`required`,n`DPT required (on the object or on its first group address)`);let w=ti(g,C);if(e.value!==void 0){if(e.value===null)w=null;else if(typeof e.value!=`number`)i(`${r}.value`,`type`,n`number expected`);else if(ee(C)){let t=re(C,e.value,n);t?i(`${r}.value`,`range`,t):w=ce(C,e.value)}}let T={key:`${c}/${f}`,id:f,deviceId:c,name:l(e,`name`,r)??f,gas:p,port:g,channel:y,dpt:C,initial:w,flags:{W:!0,T:!1,R:!1,U:!1}};k.push(T),A.set(T,e.flags)});let ne=(e,t)=>{let r=k.find(e=>e.id===t);return r||i(e,`reference`,n`object “${String(t)}” not found in this device`),r??null},M=new Set,P=new Set,F=[];g.length&&x&&!x.acceptsInputs&&i(`${a}.buttons`,`incompatible`,n`behavior ${b} does not use keys`),g.forEach((e,t)=>{let r=`${a}.buttons[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Kr,r);let c=o?u(e,`id`,r):e.id===void 0?`button-${t}`:u(e,`id`,r);c&&M.has(c)&&i(`${r}.id`,`duplicate`,n`duplicate key identifier “${c}”`),c&&M.add(c),e.icon!==void 0&&!Pr.includes(e.icon)&&i(`${r}.icon`,`enum`,n`unknown icon “${String(e.icon)}”`),e.press===void 0&&e.short===void 0&&e.long===void 0&&i(r,`required`,n`a “press”, “short” or “long” action is required`),e.press!==void 0&&(e.short!==void 0||e.long!==void 0)&&i(r,`conflict`,n`“press” cannot be combined with “short”/“long”`);let d=t=>{let a=e[t],o=`${r}.${t}`;if(a===void 0)return null;if(!q(a))return i(o,`type`,n`object { object, value } expected`),null;s(a,qr,o);let c=ne(`${o}.object`,a.object);if(a.value!==`toggle`&&typeof a.value!=`number`)return i(`${o}.value`,`type`,n`number or “toggle” expected`),null;if(!c)return null;if(c.gas.length===0&&i(`${o}.object`,`no-ga`,n`object “${c.id}” has no group address`),a.value===`toggle`&&N(c.dpt)!==1&&i(`${o}.value`,`toggle`,n`“toggle” only makes sense for a 1-bit object (DPT ${c.dpt})`),typeof a.value==`number`&&ee(c.dpt)){let e=re(c.dpt,a.value,n);e&&i(`${o}.value`,`range`,e)}return P.add(c),{object:c.id,value:a.value}},f=d(`press`),p=d(`short`),m=d(`long`),h=d(`release`);h&&!m&&i(`${r}.release`,`conflict`,n`“release” (release after a long press) requires “long”`);let g=f?k.find(e=>e.id===f.object):void 0,_=e.icon??ii(f,m,g?.dpt,k.find(e=>e.id===m?.object)?.dpt),v=null;e.led!==void 0&&(v=ne(`${r}.led`,e.led)?.id??null),F.push({id:c??`button-${t}`,index:t,label:l(e,`label`,r)??`Key ${t+1}`,icon:_,press:f,short:p,long:m,release:h,led:v})});let ae=[];_.length&&x&&!x.acceptsInputs&&i(`${a}.inputs`,`incompatible`,n`behavior ${b} does not use inputs`),_.forEach((e,t)=>{let r=`${a}.inputs[${t}]`;if(!q(e))return i(r,`type`,n`object expected`);s(e,Jr,r);let o=u(e,`id`,r);o&&M.has(o)&&i(`${r}.id`,`duplicate`,n`identifier “${o}” already used by a key or an input`),o&&M.add(o),e.type!==`number`&&i(`${r}.type`,`enum`,n`“number” expected`);let c=ne(`${r}.object`,e.object);c&&(c.port!==`input`&&(!x||x.ports.input)&&i(`${r}.object`,`port`,n`object “${c.id}” must have port “input”`),c.gas.length===0&&i(`${r}.object`,`no-ga`,n`object “${c.id}” has no group address`),P.add(c));let d=c?ee(c.dpt):void 0,f=(t,a)=>{let o=e[t];return o===void 0?(a===void 0&&i(`${r}.${t}`,`required`,n`number required`),a??0):typeof o!=`number`||!Number.isFinite(o)?(i(`${r}.${t}`,`type`,n`number expected`),a??0):o},p=f(`min`,d?.min),m=f(`max`,d?.max),h=f(`step`,(d?.integer,1));p>=m&&i(r,`range`,n`“min” must be less than “max”`),h<=0&&i(`${r}.step`,`range`,n`strictly positive step expected`),d&&(p<d.min||m>d.max)&&i(r,`range`,n`bounds outside the range ${d.min}…${d.max} of DPT ${d.id}`),ae.push({id:o??`input-${t}`,index:t,type:`number`,label:l(e,`label`,r)??o??``,object:c?.id??``,min:p,max:m,step:h})}),k.forEach((e,t)=>{let r=A.get(e),s=`${a}.objects[${j.findIndex(t=>q(t)&&t.id===e.id)}].flags`;if(o){if(!q(r)){i(s,r===void 0?`required`:`type`,n`flags { W, T } required in v2`);return}Object.keys(r).forEach(e=>{[`W`,`T`,`R`,`U`].includes(e)||i(`${s}.${e}`,`unknown-field`,n`flag “${e}” not simulated (W, T, R and U are; C is always active)`)}),typeof r.W!=`boolean`&&i(`${s}.W`,`type`,n`boolean expected`),typeof r.T!=`boolean`&&i(`${s}.T`,`type`,n`boolean expected`);for(let e of[`R`,`U`])r[e]!==void 0&&typeof r[e]!=`boolean`&&i(`${s}.${e}`,`type`,n`boolean expected`);e.flags={W:r.W===!0,T:r.T===!0,R:typeof r.R==`boolean`?r.R:ni(e.port),U:typeof r.U==`boolean`?r.U:ri(e.port)}}else e.flags={W:!0,T:P.has(e)||e.port===`status`||e.port===`positionStatus`,R:ni(e.port),U:ri(e.port)}});let oe=v===`switchActuator`||v===`shutterActuator`||v===`supervisor`||F.length===0&&ae.length===0&&D.length>0;return{id:c,name:l(e,`name`,a)??c,address:C,kind:v,behavior:b,parameters:T,medium:S,line:w,downstream:e.downstream===!0,inFilterTables:e.inFilterTables!==!1,tableGAs:E,description:l(e,`description`,a)??``,room:se(e,a),objects:k,buttons:F,inputs:ae,channels:D,receiver:oe}}let fe=new Map;I.forEach(e=>e.dpt&&te(e.dpt)&&fe.set(e.address,{bits:N(e.dpt),where:`groupAddresses (${e.dpt})`})),le.forEach((e,t)=>e.objects.forEach((r,a)=>{te(r.dpt)&&r.gas.forEach(o=>{let s=fe.get(o),c=N(r.dpt);s?s.bits!==c&&i(`devices[${t}].objects[${a}].dpt`,`association`,n`${o} is associated with objects of different sizes: ${r.dpt} here, ${s.where} elsewhere`):fe.set(o,{bits:c,where:`${e.id}/${r.id} (${r.dpt})`})})}));let pe=1,me=!1;if(e.options!==void 0){if(!q(e.options))i(`options`,`type`,n`object expected`);else{s(e.options,Zr,`options`);let t=e.options.speed;t!==void 0&&(typeof t!=`number`||!Number.isFinite(t)||t<=0?i(`options.speed`,`range`,n`strictly positive number expected`):pe=t);let r=e.options.filterTables;r!==void 0&&(typeof r==`boolean`?me=r:i(`options.filterTables`,`type`,n`boolean expected`))}}if(r.length)throw new kr(r);return{formatVersion:a,title:_,description:v,lines:y,rooms:ae,clock:oe,topology:ie,groupAddresses:I,devices:le,devicesById:L,options:{speed:pe,filterTables:me}}}var ti=(e,t)=>e===`display`||t.startsWith(`9.`)?null:0,ni=e=>[`status`,`positionStatus`,`valueStatus`,`error`,`generalError`].includes(e),ri=e=>e===`display`;function ii(e,t,n,r){return t&&r===`3.007`&&typeof t.value==`number`?t.value&8?`dimUp`:`dimDown`:t?`updown`:e?.value===`toggle`?`toggle`:e?.value===0?`off`:n===`17.001`?`scene`:`on`}function ai(e,t){return e.groupAddresses.get(t)?.name??``}function oi(e,t,n,r,i=6,a=c,o=`GroupValueWrite`){let s=o===`GroupValueRead`,l=s?0:F(r,n),u=s?0:o===`GroupValueResponse`?64:128,d=p(e)??[0,0,0],f=m(t)??[0,0,0],h=d[0]<<12|d[1]<<8|d[2],g=f[0]<<11|f[1]<<8|f[2],_=N(r),v=s||_<8,y=v?[]:_===32?[l>>>24&255,l>>>16&255,l>>>8&255,l&255]:_===24?[l>>>16&255,l>>>8&255,l&255]:_===16?[l>>8,l&255]:[l&255],b=1+y.length,x=v?[0,u|l&63]:[0,u,...y],S=[{label:a`Control`,bytes:[188],hint:a`standard frame, low priority`},{label:a`Source`,bytes:[h>>8,h&255],hint:e},{label:a`Destination`,bytes:[g>>8,g&255],hint:t},{label:a`Group · RC · length`,bytes:[128|(i&7)<<4|b],hint:b>1?a`group address, RC ${i}, ${b} bytes`:a`group address, RC ${i}, ${b} byte`},{label:a`TPCI/APCI + data`,bytes:x,hint:s?a`GroupValueRead, no data`:y.length>1?a`${o}, payload bytes 0x${y.map(si).join(` `)}`:a`${o}, payload byte 0x${si(l)}`}],C=~S.flatMap(e=>e.bytes).reduce((e,t)=>e^t,0)&255;return S.push({label:a`Checksum`,bytes:[C],hint:a`inverted XOR`}),S}var si=e=>e.toString(16).toUpperCase().padStart(2,`0`);function ci(e,t){let n={};for(let[r,i]of Object.entries(e)){let e=t?.required?.includes(r)??!1,a=t&&Object.hasOwn(t.properties,r)?t.properties[r].default:void 0;(e||a===void 0||JSON.stringify(a)!==JSON.stringify(i))&&(n[r]=i)}return Object.keys(n).length?n:void 0}var J=e=>Object.fromEntries(Object.entries(e).filter(([,e])=>e!==void 0));function li(e){let t=e.topology,n=J({backbone:t.forced.backbone||void 0,mainLines:t.forced.mainLines||void 0,ip:t.ip??void 0,areas:t.areas.some(e=>e.name)?t.areas.filter(e=>e.name).map(e=>({...e})):void 0,couplers:t.couplers.size?[...t.couplers].map(([e,t])=>J({address:e,name:t.name||void 0,down:t.down===`filter`?void 0:t.down,up:t.up===`filter`?void 0:t.up})):void 0});return Object.keys(n).length?n:void 0}function ui(e,t=gr()){return J({formatVersion:2,title:e.title||void 0,description:e.description||void 0,lines:e.lines.map(e=>J({address:e.address,name:e.name||void 0,extension:e.extension?J({address:e.extension.address,mode:e.extension.mode,switchable:e.extension.switchable||void 0}):void 0})),topology:li(e),rooms:e.rooms.length?e.rooms.map(e=>J({id:e.id,name:e.name===e.id?void 0:e.name,temperatureC:e.temperatureC===20?void 0:e.temperatureC,outsideTemperatureC:e.outsideTemperatureC===5?void 0:e.outsideTemperatureC,windowOpen:e.windowOpen||void 0,timeConstantMs:e.timeConstantMs===3e5?void 0:e.timeConstantMs})):void 0,clock:e.clock?J({start:e.clock.start,speed:e.clock.speed===1?void 0:e.clock.speed}):void 0,groupAddresses:[...e.groupAddresses.values()].map(e=>J({address:e.address,name:e.name||void 0,dpt:e.dpt||void 0})),devices:e.devices.map(e=>{let n=t.behaviors.get(e.behavior),r=new Map(e.objects.map(e=>[e.id,e])),i=e.kind===`supervisor`?`IP`:`TP`;return J({id:e.id,name:e.name,address:e.address||void 0,kind:e.kind,behavior:e.behavior,parameters:ci(e.parameters,n?.parameters),medium:e.medium===i?void 0:e.medium,downstream:e.downstream||void 0,inFilterTables:e.inFilterTables?void 0:!1,room:e.room??void 0,description:e.description||void 0,objects:e.objects.map(e=>J({id:e.id,name:e.name,ga:e.gas.length===1?e.gas[0]:[...e.gas],dpt:e.dpt,port:e.port,channel:e.channel??void 0,value:e.initial===ti(e.port,e.dpt)?void 0:e.initial,flags:J({W:e.flags.W,T:e.flags.T,R:e.flags.R===ni(e.port)?void 0:e.flags.R,U:e.flags.U===ri(e.port)?void 0:e.flags.U})})),buttons:e.buttons.length?e.buttons.map(e=>J({id:e.id,label:e.label,icon:e.icon===ii(e.press,e.long,r.get(e.press?.object??``)?.dpt,r.get(e.long?.object??``)?.dpt)?void 0:e.icon,press:e.press??void 0,short:e.short??void 0,long:e.long??void 0,release:e.release??void 0,led:e.led??void 0})):void 0,inputs:e.inputs.length?e.inputs.map(e=>({id:e.id,type:e.type,label:e.label,object:e.object,min:e.min,max:e.max,step:e.step})):void 0,channels:e.channels.length?e.channels.map(e=>{let r=e.equipmentConfig,i=r?t.equipment.get(r.type):void 0;return J({id:e.id,label:e.label===e.id?void 0:e.label,parameters:ci(e.parameters,n?.channelParameters),initialState:ci(e.initialState,n?.channelInitialState),equipment:r?J({type:r.type,view:r.view===r.type?void 0:r.view,room:r.room??void 0,parameters:ci(r.parameters,i?.parameters),initialState:ci(r.initialState,i?.initialState)}):null,scenes:e.scenes.size?Object.fromEntries([...e.scenes].map(([e,t])=>[String(e),t])):void 0})}):void 0})}),options:{speed:e.options.speed,filterTables:e.options.filterTables}})}var di=t;function fi(e,t={}){let n=t.registry??gr();return new Er(ei(e,n,s(t.lang??`en`)),{...t,registry:n})}var pi=globalThis,mi=pi.ShadowRoot&&(pi.ShadyCSS===void 0||pi.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,hi=Symbol(),gi=new WeakMap,_i=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==hi)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(mi&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=gi.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&gi.set(t,e))}return e}toString(){return this.cssText}},Y=e=>new _i(typeof e==`string`?e:e+``,void 0,hi),vi=(e,...t)=>new _i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,hi),yi=(e,t)=>{if(mi)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),r=pi.litNonce;r!==void 0&&t.setAttribute(`nonce`,r),t.textContent=n.cssText,e.appendChild(t)}},bi=mi?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return Y(t)})(e):e,xi,{is:Si,defineProperty:Ci,getOwnPropertyDescriptor:wi,getOwnPropertyNames:Ti,getOwnPropertySymbols:Ei,getPrototypeOf:Di}=Object,Oi=globalThis,ki=Oi.trustedTypes,Ai=ki?ki.emptyScript:``,ji=Oi.reactiveElementPolyfillSupport,Mi=(e,t)=>e,Ni={toAttribute(e,t){switch(t){case Boolean:e=e?Ai:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},Pi=(e,t)=>!Si(e,t),Fi={attribute:!0,type:String,converter:Ni,reflect:!1,useDefault:!1,hasChanged:Pi};(xi=Symbol).metadata??(xi.metadata=Symbol(`metadata`)),Oi.litPropertyMetadata??(Oi.litPropertyMetadata=new WeakMap);var Ii=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Fi){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&Ci(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=wi(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Fi}static _$Ei(){if(this.hasOwnProperty(Mi(`elementProperties`)))return;let e=Di(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(Mi(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Mi(`properties`))){let e=this.properties,t=[...Ti(e),...Ei(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(bi(e))}else e!==void 0&&t.push(bi(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return yi(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?Ni:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?Ni:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??(n=a.getPropertyOptions(e)),!((n.hasChanged??Pi)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(e=>this._$ET(e,this[e]))),this._$EM()}updated(e){}firstUpdated(e){}};Ii.elementStyles=[],Ii.shadowRootOptions={mode:`open`},Ii[Mi(`elementProperties`)]=new Map,Ii[Mi(`finalized`)]=new Map,ji?.({ReactiveElement:Ii}),(Oi.reactiveElementVersions??(Oi.reactiveElementVersions=[])).push(`2.1.2`);var Li=globalThis,Ri=e=>e,zi=Li.trustedTypes,Bi=zi?zi.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,Vi=`$lit$`,Hi=`lit$${Math.random().toFixed(9).slice(2)}$`,Ui=`?`+Hi,Wi=`<${Ui}>`,Gi=document,Ki=()=>Gi.createComment(``),qi=e=>e===null||typeof e!=`object`&&typeof e!=`function`,Ji=Array.isArray,Yi=e=>Ji(e)||typeof e?.[Symbol.iterator]==`function`,Xi=`[ 	
\f\r]`,Zi=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Qi=/-->/g,$i=/>/g,ea=RegExp(`>|${Xi}(?:([^\\s"'>=/]+)(${Xi}*=${Xi}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),ta=/'/g,na=/"/g,ra=/^(?:script|style|textarea|title)$/i,ia=e=>(t,...n)=>({_$litType$:e,strings:t,values:n}),X=ia(1),Z=ia(2),aa=Symbol.for(`lit-noChange`),Q=Symbol.for(`lit-nothing`),oa=new WeakMap,sa=Gi.createTreeWalker(Gi,129);function ca(e,t){if(!Ji(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return Bi===void 0?t:Bi.createHTML(t)}var la=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=Zi;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===Zi?c[1]===`!--`?o=Qi:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=ea):(ra.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=ea):o=$i:o===ea?c[0]===`>`?(o=i??Zi,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?ea:c[3]===`"`?na:ta):o===na||o===ta?o=ea:o===Qi||o===$i?o=Zi:(o=ea,i=void 0);let d=o===ea&&e[t+1].startsWith(`/>`)?` `:``;a+=o===Zi?n+Wi:l>=0?(r.push(s),n.slice(0,l)+Vi+n.slice(l)+Hi+d):n+Hi+(l===-2?t:d)}return[ca(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},ua=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=la(t,n);if(this.el=e.createElement(l,r),sa.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=sa.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(Vi)){let t=u[o++],n=i.getAttribute(e).split(Hi),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?ha:r[1]===`?`?ga:r[1]===`@`?_a:ma}),i.removeAttribute(e)}else e.startsWith(Hi)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(ra.test(i.tagName)){let e=i.textContent.split(Hi),t=e.length-1;if(t>0){i.textContent=zi?zi.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],Ki()),sa.nextNode(),c.push({type:2,index:++a});i.append(e[t],Ki())}}}else if(i.nodeType===8){if(i.data===Ui)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(Hi,e+1))!==-1;)c.push({type:7,index:a}),e+=Hi.length-1}}a++}}static createElement(e,t){let n=Gi.createElement(`template`);return n.innerHTML=e,n}};function da(e,t,n=e,r){if(t===aa)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=qi(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??(n._$Co=[]))[r]=i),i!==void 0&&(t=da(e,i._$AS(e,t.values),i,r)),t}var fa=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??Gi).importNode(t,!0);sa.currentNode=r;let i=sa.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new pa(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new va(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=sa.nextNode(),a++)}return sa.currentNode=Gi,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},pa=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=Q,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=da(this,e,t),qi(e)?e===Q||e==null||e===``?(this._$AH!==Q&&this._$AR(),this._$AH=Q):e!==this._$AH&&e!==aa&&this._(e):e._$litType$===void 0?e.nodeType===void 0?Yi(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==Q&&qi(this._$AH)?this._$AA.nextSibling.data=e:this.T(Gi.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=ua.createElement(ca(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new fa(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=oa.get(e.strings);return t===void 0&&oa.set(e.strings,t=new ua(e)),t}k(t){Ji(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(Ki()),this.O(Ki()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=Ri(e).nextSibling;Ri(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},ma=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=Q,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=Q}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=da(this,e,t,0),a=!qi(e)||e!==this._$AH&&e!==aa,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=da(this,r[n+o],t,o),s===aa&&(s=this._$AH[o]),a||(a=!qi(s)||s!==this._$AH[o]),s===Q?e=Q:e!==Q&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===Q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},ha=class extends ma{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===Q?void 0:e}},ga=class extends ma{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==Q)}},_a=class extends ma{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=da(this,e,t,0)??Q)===aa)return;let n=this._$AH,r=e===Q&&n!==Q||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==Q&&(n===Q||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},va=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){da(this,e)}},ya=Li.litHtmlPolyfillSupport;ya?.(ua,pa),(Li.litHtmlVersions??(Li.litHtmlVersions=[])).push(`3.3.3`);var ba=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new pa(t.insertBefore(Ki(),e),e,void 0,n??{})}return i._$AI(e),i},xa=globalThis,Sa=class extends Ii{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e;let t=super.createRenderRoot();return(e=this.renderOptions).renderBefore??(e.renderBefore=t.firstChild),t}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ba(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return aa}};Sa._$litElement$=!0,Sa.finalized=!0,xa.litElementHydrateSupport?.({LitElement:Sa});var Ca=xa.litElementPolyfillSupport;Ca?.({LitElement:Sa}),(xa.litElementVersions??(xa.litElementVersions=[])).push(`4.2.2`);var wa=6,Ta=128,Ea=56,Da=(e,t,n,r,i,a)=>({id:e,kind:t,pts:n,a:n[0],b:n[n.length-1],label:r,labelAt:i,labelDir:a}),Oa={lamp:{width:84,height:32},shutter:{width:92,height:142,anchorY:58},venetianBlind:{width:92,height:178,anchorY:58},dimmableLamp:{width:84,height:32},daliGroup:{width:168,height:78,anchorY:22},radiator:{width:96,height:36},fan:{width:84,height:34},appliance:{width:84,height:34}},ka=e=>(2+e.objects.length)*38,Aa=(e,t)=>e.top+(2.5+t)*38,ja=(e,t,n)=>[e.x+(t.receiver?.25:.75)*e.w,Aa(e,n)],Ma=(e,t)=>Math.hypot(t[0]-e[0],t[1]-e[1]),Na=e=>e.pts.reduce((t,n,r)=>r?t+Ma(e.pts[r-1],n):0,0);function Pa(e,t){let n=Math.max(0,t);for(let t=1;t<e.pts.length;t++){let r=e.pts[t-1],i=e.pts[t],a=Ma(r,i);if(n<=a||t===e.pts.length-1){let e=a?Math.min(1,n/a):0;return[r[0]+(i[0]-r[0])*e,r[1]+(i[1]-r[1])*e]}n-=a}return e.a}function Fa(e,t,n){let r=[Pa(e,t)],i=0;for(let a=1;a<e.pts.length-1;a++)i+=Ma(e.pts[a-1],e.pts[a]),i>t&&i<n&&r.push(e.pts[a]);return r.push(Pa(e,n)),r}function Ia(e,t){let n=1/0,r=0,i=0;for(let a=1;a<e.pts.length;a++){let o=e.pts[a-1],s=e.pts[a],c=Ma(o,s),l=c?Math.max(0,Math.min(1,((t[0]-o[0])*(s[0]-o[0])+(t[1]-o[1])*(s[1]-o[1]))/(c*c))):0,u=Ma(t,[o[0]+(s[0]-o[0])*l,o[1]+(s[1]-o[1])*l]);u<n-.01&&(n=u,r=i+l*c),i+=c}return r}var La=[`switch`,`dim`,`value`,`move`,`stopStep`,`positionCommand`,`scene`],Ra=48;function za(e){let t=e.objects.filter(e=>[`actualTemp`,`setpointStatus`,`hvacModeStatus`].includes(e.port)).map(e=>e.id);return new Set(t.length?t:e.objects.slice(0,1).map(e=>e.id))}function Ba(e,t){let n=ka(e),r=t=>e.objects.flatMap((e,n)=>t.has(e.id)?[n]:[]),i=e.kind===`thermostat`&&e.objects.length?za(e):null,a=[...i?[{kind:`screen`,id:`screen`,ids:i}]:[],...e.buttons.map(e=>({kind:`button`,id:e.id,ids:new Set([e.press,e.short,e.long].flatMap(e=>e?[e.object]:[]))})),...e.inputs.map(e=>({kind:`input`,id:e.id,ids:new Set([e.object])}))].map(e=>{let t=r(e.ids),n=Math.min(...t),i=Math.max(...t),a=(2+n)*38+4,o=(i-n+1)*38-8;return e.kind===`screen`&&o<Ra?{kind:e.kind,id:e.id,top:a+(o-Ra)/2,h:Ra,rows:t}:{kind:e.kind,id:e.id,top:a,h:o,rows:t}});if(a.some((e,t)=>a.some((n,r)=>r!==t&&e.top<n.top+n.h&&n.top<e.top+e.h))&&a.length){let t=e.objects.length*38,r=Math.max(40,Math.min(64,t/a.length)),i=Math.min(76+(t-r*a.length)/2,n-r*a.length);a=a.map((e,t)=>({...e,top:i+t*r+4,h:r-8}))}let o=[],s=(e,n,r)=>{let i=e.equipmentConfig.view,a=t(i);return{channel:e.id,view:i,x:0,top:0,cy:r,w:a.width,h:a.height,rows:n}};e.channels.forEach(t=>{if(!t.equipmentConfig)return;let n=e.objects.flatMap((e,n)=>e.channel===t.id&&La.includes(e.port)?[n]:[]),r=n.length?n:e.objects.flatMap((e,n)=>e.channel===t.id?[n]:[]);r.length&&o.push(s(t,r,((Math.min(...r)+Math.max(...r)+1)/2+2)*38))});let c=e.channels.filter(e=>e.equipmentConfig&&!o.some(t=>t.channel===e.id));if(c.length){let r=e.objects.flatMap((e,t)=>e.channel?[]:[t]),i=e=>t(e.equipmentConfig.view).height+6,a=c.reduce((e,t)=>e+i(t),0),l=Math.min(76,n-a);c.forEach(e=>{let n=t(e.equipmentConfig.view);o.push(s(e,r,l+(n.anchorY??n.height/2)+3)),l+=i(e)})}let l=0,u=e=>t(e.view).anchorY??e.h/2,d=e=>n-Math.min(e.h-u(e),60)-u(e);o.forEach(e=>{e.top=Math.min(e.cy-u(e),d(e))});let f=[...o].sort((e,t)=>e.top-t.top);for(let e=1;e<f.length;e++){let t=f[e-1],n=f[e];n.top=Math.max(n.top,t.top+t.h+wa)}for(let e=f.length-1;e>=0;e--){let t=f[e],n=f[e+1];t.top=Math.min(t.top,d(t),n?n.top-t.h-wa:1/0)}o.forEach(e=>{e.cy=e.top+u(e),l=Math.min(l,e.top-4)}),a.forEach(e=>l=Math.min(l,e.top-6));let p=a.length?116:0,m=34+Math.max(0,o.length-1)*10,h=o.length?m+Math.max(84,...o.map(e=>e.w)):0;return{h:n,keys:a,loads:o,minRel:l,left:p,right:h,loadGap:m}}function Va(e,t=_e(e),n={}){let r=n.t??c,i=n.deviceGap??58,a=e=>n.equipmentSize?.(e)??(Object.hasOwn(Oa,e)?Oa[e]:void 0)??{width:84,height:40},o=e.topology,s=o.areas.map(e=>e.address),l=new Map(o.areas.map(e=>[e.address,e.name])),u=o.backbone||o.ip===`areaCouplers`,d=o.mainLines.length>0||o.ip===`lineCouplers`,f=0,p=0,m=0,h=0,g=64;u?(f=64,p=f+116,m=p+116,h=m+116,g=h+78):d&&(m=64,h=m+116,g=h+78);let _=g+44,v=o.ip===`areaCouplers`?f:m,y=new Map,b=new Map,x=[],S=[],C=new Map,w=n=>(t.segments.get(n)?.points??[]).flatMap(t=>t.deviceId?[e.devicesById.get(t.deviceId)]:[]),T=(e,t,n)=>{let r=t;return n.forEach(t=>{let n=Ba(t,a),o=r+n.left,s=e.busY-42-n.h,c=n.keys.length?{x:o-12-104,top:s+Math.min(...n.keys.map(e=>e.top))-6,h:Math.max(...n.keys.map(e=>e.top+e.h))-Math.min(...n.keys.map(e=>e.top))+12,keys:n.keys.map(e=>({...e,top:s+e.top}))}:null,l=n.loads.map(e=>({...e,x:o+224+n.loadGap,cy:s+e.cy,top:s+e.top})),u=o+112;y.set(t.id,{id:t.id,x:o,top:s,w:224,h:n.h,seg:e.seg,drop:[u,s+n.h],at:[u,e.busY],plate:c,loads:l}),C.set(`dev:${t.id}`,[u,e.busY]),r=o+224+n.right+i}),r-i},E=e=>{let t=56;return e.devices.forEach(e=>{let n=Ba(e,a);t=Math.max(t,42+n.h-n.minRel)}),t},D=16,O=0,k=[],A=(e,t,n)=>{let r={seg:e,label:t,devices:w(e),busY:0};if(!r.devices.length)return{busY:D,right:n,devices:!1};r.busY=D+E(r);let i=T(r,n+44,[...r.devices].reverse());return O=Math.max(O,i),D=r.busY+44+18,{busY:r.busY,right:i,devices:!0}},j=null;o.ip&&(j=A(`IP`,r`IP network · KNXnet/IP`,v),j.devices||(j.busY=D+30,D=j.busY+44));let ee=o.backbone?A(`BB`,r`Backbone 0.0`,f):null,te=[];s.forEach(t=>{let n=D,i=s.length>1||!!l.get(t);i&&(D+=30);let a=o.mainLines.includes(t)?A(`ML${t}`,r`Main line ${t}.0`,m):null;a&&!a.devices&&(D+=u?44:20,a.busY=D);let c=[];e.lines.filter(e=>e.area===t).forEach(e=>{let t={seg:`L${e.address}`,label:r`Line ${e.address}`+(e.name?` · ${e.name}`:``),devices:w(`L${e.address}`),busY:0};if(t.busY=D+E(t),k.push(t),c.push(t.busY),D=t.busY+44+18,e.extension){let t={seg:`L${e.address}b`,label:r`Line ${e.address} · downstream segment`,devices:w(`L${e.address}b`),busY:0};t.busY=D+E(t),k.push(t),D=t.busY+44+18}}),a&&!a.devices&&c.length&&(a.busY=Math.min(a.busY,c[0]-(u?72:44))),te.push({area:t,top:n,bottom:D-6,lineYs:c,corner:a}),i&&(D+=18)}),k.forEach(e=>{let t=e.seg.endsWith(`b`)?[...e.devices].reverse():e.devices;O=Math.max(O,T(e,_,t))});let ne=e.lines.some(e=>e.extension),M=Math.max(O+(ne?96:60),g+420);k.forEach(e=>{let t=e.seg.endsWith(`b`),n=t?[M,e.busY]:[g,e.busY],r=t?[g,e.busY]:[M,e.busY];b.set(e.seg,Da(e.seg,`line`,[n,r],e.label,[g+14,e.busY+9],`h`))}),e.lines.forEach(e=>{if(!e.extension)return;let t=b.get(`L${e.address}`),n=b.get(`L${e.address}b`);t&&n&&x.push({id:`EXT${e.address}`,kind:`extension`,address:e.extension.address,c:[M,(t.a[1]+n.a[1])/2],w:148,h:Ea,A:{seg:t.id,p:[M,t.a[1]]},B:{seg:n.id,p:[M,n.a[1]]},line:e.address})});let N=(e,t,n,r,i,a)=>{let o=[];(i.devices||t===`ip`)&&o.push([Math.max(i.right+30,r+(t===`ip`?260:120)),i.busY]),o.push([r,i.busY]),(a>i.busY+.5||o.length===1)&&o.push([r,Math.max(a,i.busY+1)]);let s=o.length>1&&o[0][1]===o[1][1];b.set(e,Da(e,t,o,n,s?t===`ip`?[o[0][0]-8,i.busY+7]:[r+14,i.busY+9]:[r-24,Math.max(a,i.busY)-30],s?`h`:`v`))};te.forEach(t=>{let n=`ML${t.area}`;if(e.lines.filter(e=>e.area===t.area).forEach(e=>{let r=b.get(`L${e.address}`).a[1];(t.corner||o.ip===`lineCouplers`)&&x.push({id:`LC${e.address}`,kind:o.ip===`lineCouplers`?`router`:`line`,address:`${e.address}.0`,c:[h,r],w:Ta+(o.ip===`lineCouplers`?16:0),h:Ea,A:{seg:o.ip===`lineCouplers`?`IP`:n,p:[m,r]},B:{seg:`L${e.address}`,p:[g,r]},line:e.address})}),t.corner&&N(n,`main`,r`Main line ${t.area}.0`,m,t.corner,Math.max(t.corner.busY,...t.lineYs)),u){let e=t.corner.busY;x.push({id:`AC${t.area}`,kind:o.ip===`areaCouplers`?`router`:`area`,address:`${t.area}.0.0`,c:[p,e],w:Ta+(o.ip===`areaCouplers`?16:0),h:Ea,A:{seg:o.ip===`areaCouplers`?`IP`:`BB`,p:[f,e]},B:{seg:n,p:[m,e]},line:null})}(s.length>1||l.get(t.area))&&S.push({x:(u?p:m)+20,y:t.top,w:0,h:t.bottom-t.top,label:r`Area ${t.area}`+(l.get(t.area)?` · ${l.get(t.area)}`:``)})});let re=(e,t)=>Math.max(-1/0,...x.filter(t=>e.includes(t.kind)).map(e=>e[t].p[1]));if(ee&&N(`BB`,`backbone`,r`Backbone 0.0`,f,ee,Math.max(ee.busY,re([`area`],`A`))),j&&N(`IP`,`ip`,r`IP network · KNXnet/IP`,v,j,Math.max(j.busY,re([`router`],`A`))),ee&&!ee.devices){let e=Math.min(...x.filter(e=>e.kind===`area`).map(e=>e.A.p[1])),t=re([`area`],`A`);b.set(`BB`,Da(`BB`,`backbone`,[[f,e],[f,Math.max(t,e+1)]],r`Backbone 0.0`,[f-24,t-30],`v`))}x.forEach(e=>{C.set(`cpl:${e.id}:A`,e.A.p),C.set(`cpl:${e.id}:B`,e.B.p)});let P=Math.max(M+(ne?90:70),O+40);return b.forEach(e=>e.pts.forEach(e=>P=Math.max(P,e[0]+40))),S.forEach(e=>e.w=P-e.x-14),{W:P,H:D+4,segs:b,couplers:x,devices:y,zones:S,points:C}}var Ha=(e,t,n)=>Math.min(n,Math.max(t,e)),Ua=e=>1-(1-Ha(e,0,1))**3,Wa=(e,t)=>Math.hypot(e[0]-t[0],e[1]-t[1]),Ga=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n],Ka=1.1,qa=1400,Ja=250;function Ya(e,t){if(t<=e[0].t)return e[0].u;for(let n=1;n<e.length;n++){let r=e[n-1],i=e[n];if(t<=i.t)return i.t===r.t?i.u:r.u+(i.u-r.u)*(t-r.t)/(i.t-r.t)}return e[e.length-1].u}function Xa(e,t,n,r,i){let a=i>0?Na(e):0;if(Math.abs(a-t)<.5)return null;let o=[{t:n,u:t}];r.filter(e=>(e.u-t)*i>.5).sort((e,n)=>Math.abs(e.u-t)-Math.abs(n.u-t)).forEach(e=>o.push({t:Math.max(e.t,o[o.length-1].t),u:e.u}));let s=o[o.length-1],c=o[o.length-2],l=Ka;return c&&s.t>c.t&&(l=Math.abs(s.u-c.u)/(s.t-c.t)||Ka),o.push({t:s.t+Math.abs(a-s.u)/l,u:a}),o}function Za(e,t,n,r,i,a){let o=[],s=[],c=r,l=n.devices.get(e.sourceDeviceId);if(l&&c>=e.t0Ms&&c<e.busMs){let t=(c-e.t0Ms)/ve.emitMs,n=[i,[l.drop[0],i[1]],l.drop,l.at];o.push({p:Qa(n,t),o:Ua(t*4),small:!1}),s.push({a:l.drop,b:Qa([l.drop,l.at],Ha((t-.5)*2,0,1)),o:.5})}return e.fronts.forEach(e=>{if(c<e.tStartMs)return;let r=n.segs.get(e.segId),i=t.segments.get(e.segId);if(!r||!i)return;let a=n.points.get(i.points[e.originIndex].id);if(!a)return;let l=Ia(r,a),u=i.points.flatMap((t,i)=>{let a=n.points.get(t.id);return a&&i!==e.originIndex?[{t:e.arrivalsMs[i],u:Ia(r,a)}]:[]}),d=[Xa(r,l,e.tStartMs,u,1),Xa(r,l,e.tStartMs,u,-1)].filter(e=>e!==null),f=Math.max(e.tStartMs,...d.map(e=>e[e.length-1].t)),p=1-Ua((c-f)/qa);if(p<=0)return;let m=l,h=l;d.forEach(e=>{let t=Ya(e,c);m=Math.min(m,t),h=Math.max(h,t);let n=e[e.length-1].t,i=Math.abs(t-l);c<n?o.push({p:Pa(r,t),o:Ua(i/40),small:!1}):c<n+Ja&&o.push({p:Pa(r,t),o:1-(c-n)/Ja,small:!0})}),s.push({a:Pa(r,m),b:Pa(r,h),o:.45*p,pts:r.pts.length>2?Fa(r,m,h):void 0})}),e.couplers.forEach(e=>{if(c<e.tArriveMs)return;let t=n.couplers.find(t=>t.id===e.couplerId);if(!t)return;let r=e.from===`A`?`B`:`A`,i=t[e.from].p,a=t[r].p;if(c<e.tInMs){let n=(c-e.tArriveMs)/(e.tInMs-e.tArriveMs||1);o.push({p:Ga(i,t.c,n),o:1-Ua((n-.6)/.4),small:n>.6})}else if(e.pass&&c>=e.tDecisionMs&&c<e.tOutMs){let n=(c-e.tDecisionMs)/(e.tOutMs-e.tDecisionMs||1);o.push({p:Ga(t.c,a,n),o:Ua(n/.4),small:n<.4})}}),e.deliveries.forEach(e=>{if(!e.objectIds.length||c<e.tArriveMs||c>=e.tDeliverMs+150)return;let t=a(e),r=n.devices.get(e.deviceId);if(!t||!r)return;let i=Ha((c-e.tArriveMs)/(e.tDeliverMs-e.tArriveMs||1),0,1),l=[r.at,r.drop,[r.drop[0],t[1]],t];o.push({p:Qa(l,i),o:c>e.tDeliverMs?1-(c-e.tDeliverMs)/150:1,small:i>.85}),s.push({a:r.at,b:Qa([r.at,r.drop],Ha(i*2,0,1)),o:.5})}),{pills:o,glows:s}}function Qa(e,t){let n=e.slice(1).map((t,n)=>Wa(e[n],t)),r=n.reduce((e,t)=>e+t,0)||1,i=Ha(t,0,1)*r;for(let t=0;t<n.length;t++){let r=n[t];if(i<=r||t===n.length-1)return Ga(e[t],e[t+1],r?i/r:0);i-=r}return e[e.length-1]}var $a=new Map;function eo(e,t){if(typeof e!=`string`||!e)throw TypeError(l()`view identifier required`);if($a.has(e))throw Error(l()`Equipment view “${e}” already registered`);if(typeof t?.render!=`function`||!t.size)throw TypeError(l()`View “${e}”: size and render are required`);let{width:n,height:r,anchorY:i}=t.size,a=e=>typeof e==`number`&&Number.isFinite(e)&&e>0;if(!a(n)||!a(r)||i!==void 0&&!(typeof i==`number`&&Number.isFinite(i)))throw TypeError(l()`View “${e}”: size.width and size.height must be finite positive numbers`);$a.set(e,Object.freeze({...t}))}var to=e=>$a.get(e),no={size:{width:84,height:32},render:({state:e,label:t,box:n,note:r})=>X`<div
      class="lamp ${e.on?`on`:``}"
      style="left:${n.x}px;top:${n.y}px"
    >
      <svg viewBox="0 0 30 36">
        <path
          class="glass"
          stroke-width="1.8"
          d="M15 2 C7.5 2 3 7.6 3 13.4 c0 4.4 2.4 7 4.6 9.4 c1.3 1.4 2.1 2.9 2.1 4.6 h10.6 c0-1.7 0.8-3.2 2.1-4.6 C24.6 20.4 27 17.8 27 13.4 C27 7.6 22.5 2 15 2z"
        ></path>
        <path
          class="fil"
          stroke-width="1.5"
          d="M11.5 27 v-6 l2-5 l1.5 3 l1.5-3 l2 5 v6"
        ></path>
        <rect
          class="base"
          x="9.6"
          y="28.2"
          width="10.8"
          height="2.6"
          rx="1"
        ></rect>
        <rect
          class="base"
          x="10.6"
          y="31.6"
          width="8.8"
          height="2.6"
          rx="1.2"
        ></rect>
      </svg>
      <div class="loadlbl" title=${t}>
        ${t}${r?X`<small>${r}</small>`:Q}
      </div>
    </div>`},ro={size:{width:92,height:142,anchorY:58},render:({state:e,label:t,box:n,parameters:r,t:i=c})=>{let a=Number(e.positionPct??0),o=78*a/100,s=e.moving===!0,l=s?e.drive===`down`?`▼`:`▲`:``,u=Number(r?.slatTravelMs??0)>0,d=Math.max(0,Math.min(100,Number(e.slatPct??0))),f=1.2+4.8*d/100,p=u?`background-image:repeating-linear-gradient(#9aa0a8 0 ${f.toFixed(2)}px, transparent ${f.toFixed(2)}px 6px);background-color:transparent`:``;return X`<div
      class="shutter ${u?`venetian`:``}"
      style="left:${n.x}px;top:${n.y}px"
      title=${u?i`Actual blind: ${a.toFixed(1)} %, slats ${d.toFixed(0)} %`:i`Actual shutter: ${a.toFixed(1)} %`}
    >
      <div class="box"></div>
      <div class="win">
        <div
          class="slats"
          style="height:${o}px;${o<1?`border-bottom:none;`:``}${p}"
        ></div>
      </div>
      <div class="foot">
        <span style="font-weight:600" title=${t}>${t}</span
        ><span class=${s?`mv`:``}>${l}${Math.round(a)}%</span>
      </div>
      ${u?X`<div class="slatinfo">
              <svg
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden="true"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  fill="none"
                  stroke="#d6d2c6"
                  stroke-width="1"
                ></circle>
                <line
                  x1="2"
                  y1="8"
                  x2="14"
                  y2="8"
                  stroke="#6b7079"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  transform="rotate(${70*d/100} 8 8)"
                ></line>
              </svg>
              ${i`slats`} <b>${Math.round(d)}%</b>
            </div>`:Q}
    </div>`}},io={size:{width:84,height:32},render:({state:e,label:t,box:n})=>{let r=Number(e.levelPct??0),i=typeof e.colourTemperatureK==`number`?e.colourTemperatureK:null;return X`<div class="lamp dim" style="left:${n.x}px;top:${n.y}px">
      ${ao(r,i)}
      <div class="loadlbl" title=${t}>
        ${t}<small>${Math.round(r)} %</small>${i===null?Q:X`<small>${Math.round(i)} K</small>`}
      </div>
    </div>`}},ao=(e,t=null)=>{let n=e>0,r=n?.25+.75*Math.min(100,e)/100:0,i=t===null?null:Math.max(0,Math.min(1,(t-2700)/3800)),a=i===null?`255, 206, 50`:`${Math.round(255-50*i)}, ${Math.round(176+54*i)}, ${Math.round(70+185*i)}`;return X`<svg viewBox="0 0 30 36" class="bulb">
    <path
      d="M15 2 C7.5 2 3 7.6 3 13.4 c0 4.4 2.4 7 4.6 9.4 c1.3 1.4 2.1 2.9 2.1 4.6 h10.6 c0-1.7 0.8-3.2 2.1-4.6 C24.6 20.4 27 17.8 27 13.4 C27 7.6 22.5 2 15 2z"
      fill=${n?`rgba(${a}, ${r.toFixed(2)})`:`#f4f2ea`}
      stroke=${n?`#d99a00`:`#a9a496`}
      stroke-width="1.8"
    ></path>
    <rect
      x="9.6"
      y="28.2"
      width="10.8"
      height="2.6"
      rx="1"
      fill="#a9a496"
    ></rect>
    <rect
      x="10.6"
      y="31.6"
      width="8.8"
      height="2.6"
      rx="1.2"
      fill="#a9a496"
    ></rect>
  </svg>`};eo(`fan`,{size:{width:84,height:34},render:({state:e,label:t,box:n,t:r=c})=>{let i=Math.max(0,Math.min(100,Number(e.levelPct??0))),a=i>0?2.4-1.9*i/100:0;return X`<div
      class="lamp fan ${i>0?`on`:``}"
      style="left:${n.x}px;top:${n.y}px"
      title=${r`Fan: ${Math.round(i)} %`}
    >
      <svg viewBox="0 0 32 32" class="fanicon">
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="#fff"
          stroke=${i>0?`#2f6db3`:`#a9a496`}
          stroke-width="1.6"
        ></circle>
        <g
          class="blades"
          style=${a?`animation-duration:${a.toFixed(2)}s`:`animation:none`}
        >
          ${[0,120,240].map(e=>Z`<path transform="rotate(${e} 16 16)" d="M16 16 C 14 11 14 6 17 4.5 C 20 6 19 11 16 16 Z" fill=${i>0?`#7fb0e6`:`#d6d2c6`} stroke=${i>0?`#2f6db3`:`#a9a496`} stroke-width="0.8"></path>`)}
        </g>
        <circle
          cx="16"
          cy="16"
          r="2.2"
          fill=${i>0?`#2f6db3`:`#a9a496`}
        ></circle>
      </svg>
      <div class="loadlbl" title=${t}>
        ${t}<small>${Math.round(i)} %</small>
      </div>
    </div>`}}),eo(`appliance`,{size:{width:84,height:34},render:({state:e,label:t,box:n,note:r,parameters:i,t:a=c})=>{let o=e.on===!0;return X`<div
      class="lamp appliance ${o?`on`:``}"
      style="left:${n.x}px;top:${n.y}px"
      title=${a`Appliance: ${Number(i?.powerW??2e3)} W rated`}
    >
      <svg viewBox="0 0 30 30" class="appl">
        <rect
          x="2"
          y="3"
          width="26"
          height="24"
          rx="4"
          fill=${o?`#fff4d6`:`#f4f2ea`}
          stroke=${o?`#d99a00`:`#a9a496`}
          stroke-width="1.6"
        ></rect>
        <path
          d="M11 10 v4 M19 10 v4 M9 14 h12 v3 a6 6 0 0 1 -12 0 z M15 23 v2"
          fill="none"
          stroke=${o?`#d99a00`:`#a9a496`}
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
      <div class="loadlbl" title=${t}>
        ${t}${r?X`<small>${r}</small>`:Q}
      </div>
    </div>`}}),eo(`lamp`,no),eo(`radiator`,{size:{width:96,height:36},render:({state:e,label:t,box:n,parameters:r,t:i=c})=>{let a=Math.max(0,Math.min(100,Number(e.openPct??0))),o=r?.emitter===`cooling`,s=a/100,l=o?`rgb(${Math.round(236-150*s)}, ${Math.round(240-80*s)}, ${Math.round(242+10*s)})`:`rgb(${Math.round(236+12*s)}, ${Math.round(234-140*s)}, ${Math.round(226-160*s)})`,u=a>0?o?`#2f6db3`:`#c2410c`:`#a9a496`;return X`<div
      class="lamp radiator ${a>0?`hot`:``} ${o?`cool`:``}"
      style="left:${n.x}px;top:${n.y}px"
      title=${o?i`Cooling emitter: valve ${Math.round(a)} % open`:i`Radiator: valve ${Math.round(a)} % open`}
    >
      <svg viewBox="0 0 40 32" class="rad">
        ${[0,1,2,3,4].map(e=>Z`<rect
              x=${2+e*7.4}
              y="4"
              width="6"
              height="22"
              rx="2.6"
              fill=${l}
              stroke=${u}
              stroke-width="1.4"
            ></rect>`)}
        <rect x="1" y="7" width="38" height="2.2" fill=${u}></rect>
        <rect x="1" y="21" width="38" height="2.2" fill=${u}></rect>
        ${e.energized?Z`<path
                d="M35 0 l-3 5 h3 l-2.5 5"
                fill="none"
                stroke="#d99a00"
                stroke-width="1.6"
              ></path>`:Q}
      </svg>
      <div class="loadlbl" title=${t}>
        ${t}<small>${i`valve`} ${Math.round(a)} %</small>
      </div>
    </div>`}}),eo(`dimmableLamp`,io),eo(`daliGroup`,{size:{width:168,height:78,anchorY:22},render:({state:e,label:t,box:n,parameters:r,act:i,t:a=c})=>{let o=Number(e.levelPct??0),s=Math.max(1,Math.min(16,Number(r?.ballasts??2))),l=Number(r?.firstAddress??0),u=Number(e.failedMask??0),d=Math.min(s,8);return X`<div
      class="dali"
      style="left:${n.x}px;top:${n.y}px;width:${n.width}px"
    >
      <div class="dali-bus"><span>DALI</span></div>
      <div
        class="dali-ecgs"
        style="grid-template-columns:repeat(${d}, 1fr)"
      >
        ${Array.from({length:s},(e,t)=>{let n=u>>t&1;return X`<button
            class="dali-ecg ${n?`failed`:``}"
            title=${n?a`Ballast A${l+t} faulty (click to repair)`:a`Ballast A${l+t}: click to simulate a fault`}
            @click=${e=>{e.stopPropagation(),i?.(`toggleBallast`,t)}}
          >
            ${ao(n?0:o)}
            <small>A${l+t}</small>
          </button>`})}
      </div>
      <div class="dali-foot">
        <b title=${t}>${t}</b><span>${Math.round(o)} %</span>
      </div>
    </div>`}}),eo(`shutter`,ro),eo(`venetianBlind`,{...ro,size:{width:92,height:178,anchorY:58}});var oo={toolbar:`full`,monitor:!0,description:!0,hints:!0,fit:`width`,maxScale:1.2,minScale:.7,speed:null,stepMode:!1},so=[{name:`toolbar`,attribute:`toolbar`,type:`"full" | "compact" | "none"`,default:`"full"`,summary:`Toolbar above the diagram.`,details:`‘full’ shows the title, speed, filter tables, step control, pause, and reset. ‘compact’ shows three small floating buttons in a corner of the diagram, suitable for a slide. ‘none’ hides the controls while leaving the diagram interactive.`,example:`<bus-diagram toolbar="compact">`},{name:`monitor`,attribute:`monitor`,type:`boolean`,default:`true`,summary:`Group monitor and telegram details below the diagram.`,details:`Set to false when a slide or page needs only the diagram. Telegrams still travel over the bus.`,example:`<bus-diagram monitor="false">`},{name:`description`,attribute:`description`,type:`boolean`,default:`true`,summary:"Scenario `description` below the toolbar.",details:`Hide when the page or slide already explains the interaction.`,example:`<bus-diagram description="false">`},{name:`hints`,attribute:`hints`,type:`boolean`,default:`true`,summary:`Hint explaining short and long button presses.`,details:`Shown only when a button distinguishes short and long presses.`,example:`<bus-diagram hints="false">`},{name:`fit`,attribute:`fit`,type:`"width" | "contain"`,default:`"width"`,summary:`Diagram scaling.`,details:`‘width’ uses the available width between minScale and maxScale; oversized diagrams scroll horizontally instead of becoming unreadable. ‘contain’ fits the entire diagram within the component; give the component an explicit height, such as 100% of a slide.`,example:`<bus-diagram fit="contain" style="height:560px">`},{name:`maxScale`,attribute:`max-scale`,type:`number`,default:`1.2`,summary:`Maximum diagram scale.`,details:`Prevents a small diagram from becoming oversized on a large screen.`,example:`<bus-diagram max-scale="1">`},{name:`minScale`,attribute:`min-scale`,type:`number`,default:`0.7`,summary:`Minimum scale in ‘width’ mode before horizontal scrolling.`,details:`Below this scale, labels would become unreadable, so the diagram scrolls.`,example:`<bus-diagram min-scale="0.5">`},{name:`speed`,attribute:`speed`,type:`number`,default:"scenario `options.speed`, otherwise 1",summary:`Initial simulation speed.`,details:`1 is real time, 0.35 is slower, and 2 is faster. The long-press threshold (0.5 real seconds) does not change.`,example:`<bus-diagram speed="0.35">`},{name:`stepMode`,attribute:`step-mode`,type:`boolean`,default:`false`,summary:`Start in step mode.`,details:`Pause at each transmission, coupler decision, reception, output change, and scheduled event, with an explanation and a Next button.`,example:`<bus-diagram step-mode>`}],co=[``,`true`,`1`,`yes`,`oui`],lo=[`false`,`0`,`no`,`non`];function uo(e,t){if(t!==null){if(typeof oo[e.name]==`boolean`){let e=t.trim().toLowerCase();return co.includes(e)?!0:!lo.includes(e)&&void 0}if(e.name===`speed`||e.name===`maxScale`||e.name===`minScale`){let e=Number(t);return Number.isFinite(e)&&e>0?e:void 0}if(e.name===`toolbar`)return[`full`,`compact`,`none`].includes(t)?t:void 0;if(e.name===`fit`)return[`width`,`contain`].includes(t)?t:void 0}}function fo(e,t){let n={...oo};for(let r of so){let i=uo(r,e(r.attribute));i!==void 0&&(n[r.name]=i);let a=t?.[r.name];a!==void 0&&uo(r,String(a))!==void 0&&(n[r.name]=uo(r,String(a)))}return n}var $={bg:`#f3f2ee`,ink:`#1c1e23`,mute:`#5f646d`,line:`#dedbd2`,bus:`#1e9a6d`,v230:`#d0602f`,tg:`#2c68e0`,cpl:`#6a4fc4`,cplSoft:`#f1edfb`,rep:`#555b68`,repSoft:`#eeeff1`,amber:`#e2a012`,amberSoft:`#fbf1d8`,ip:`#6b7280`,red:`#b3452f`,cream:`#fff2cc`,creamHi:`#f6d77f`,grid:`#2b2a27`};function po(e,t){let n=parseInt(e.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${t})`}var mo=vi`
  :host {
    display: block;
    font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    color: ${Y($.ink)};
    --mono:
      "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas,
      monospace;
    margin: 1rem 0;
  }
  :host([data-fit="contain"]) {
    margin: 0;
    height: 100%;
  }
  * {
    box-sizing: border-box;
  }
  .kv.contain {
    height: 100%;
  }
  .kv.contain .stage-wrap {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .kv.contain .scroller {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .kv.contain .stage-size {
    min-width: 0;
    flex: none;
  }
  .viewfault {
    position: absolute;
    border: 1.5px dashed ${Y($.red)};
    color: ${Y($.red)};
    background: #fdf1ee;
    border-radius: 8px;
    font-size: 11.5px;
    padding: 4px 6px;
  }
  .mini {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    z-index: 7;
  }
  .mini button {
    width: 30px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid #cfccc1;
    background: rgba(255, 255, 255, 0.92);
    cursor: pointer;
    font-size: 13px;
    color: ${Y($.ink)};
  }
  .mini button.on {
    background: ${Y($.ink)};
    border-color: ${Y($.ink)};
    color: #fff;
  }
  .kv {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    padding: 6px 10px;
    background: #fff;
    border: 1px solid ${Y($.line)};
    border-radius: 12px;
  }
  .bar h2 {
    margin: 0 auto 0 0;
    font-size: 15px;
    font-weight: 600;
  }
  .grp {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lbl {
    font-size: 11px;
    font-weight: 600;
    color: ${Y($.mute)};
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  button {
    font: inherit;
  }
  .btn {
    font-size: 13px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    border: 1.5px solid #cfccc1;
    background: #fff;
    color: ${Y($.ink)};
  }
  .btn:hover {
    background: #f3f2ee;
  }
  .btn.on {
    background: ${Y($.ink)};
    border-color: ${Y($.ink)};
    color: #fff;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .btn.primary {
    background: ${Y($.tg)};
    border-color: ${Y($.tg)};
    color: #fff;
  }
  .seg {
    display: flex;
    background: #eceae3;
    border-radius: 9px;
    padding: 2px;
    gap: 2px;
  }
  .seg button {
    font-size: 12.5px;
    font-weight: 600;
    padding: 4px 9px;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    background: transparent;
    color: ${Y($.mute)};
    white-space: nowrap;
  }
  .seg button.sel {
    background: #fff;
    color: ${Y($.ink)};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  .hint {
    font-size: 12px;
    color: ${Y($.mute)};
  }
  .desc {
    font-size: 13.5px;
    color: ${Y($.mute)};
    margin: 0 4px;
    line-height: 1.45;
  }
  .stage-wrap {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid ${Y($.line)};
    background-color: #f7f6f1;
  }
  .stage-wrap:fullscreen {
    border: 0;
    border-radius: 0;
  }
  .stage-wrap:fullscreen {
    display: flex;
    flex-direction: column;
  }
  .stage-wrap:fullscreen .scroller {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage-wrap:fullscreen .stage-size {
    min-width: 0;
    flex: none;
  }
  .cfgwarn {
    margin: 0 0 10px;
    padding: 8px 12px;
    border: 1px solid #e3c77a;
    border-left: 4px solid ${Y($.amber)};
    border-radius: 8px;
    background: #fdf6e3;
    font-size: 13px;
    color: ${Y($.ink)};
  }
  .cfgwarn ul {
    margin: 4px 0 0;
    padding-left: 18px;
  }
  .clock {
    position: relative;
    z-index: 7;
    margin: 6px 8px 0;
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 10px;
    border: 1px solid #cfccc1;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.94);
    font-size: 12.5px;
    color: ${Y($.ink)};
  }
  .clock b {
    font-family: var(--mono);
    font-weight: 600;
  }
  .clock .btn {
    font-size: 11.5px;
    padding: 2px 7px;
  }
  .clock input {
    font: inherit;
    font-size: 12px;
    padding: 1px 4px;
    border: 1px solid #cfc9ba;
    border-radius: 6px;
  }
  .fsbtn {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 7;
    width: 30px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 8px;
    border: 1px solid #cfccc1;
    background: rgba(255, 255, 255, 0.92);
    color: ${Y($.ink)};
    cursor: pointer;
  }
  .fsbtn:hover {
    background: #fff;
  }
  .fsbtn:focus-visible {
    outline: 2px solid ${Y($.tg)};
    outline-offset: 1px;
  }
  .scroller {
    overflow-x: auto;
    overflow-y: hidden;
  }
  .stage-size {
    position: relative;
    min-width: 100%;
    background-image: radial-gradient(#e2dfd4 1.1px, transparent 1.3px);
  }
  .stage {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .stage > svg {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
  }
  .card {
    position: absolute;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: #cdbd8e;
    border: 1.5px solid #b9a877;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    box-shadow:
      0 1px 2px rgba(70, 55, 20, 0.08),
      0 8px 20px -6px rgba(70, 55, 20, 0.18);
    transition: box-shadow 0.2s;
  }
  .card:hover {
    box-shadow:
      0 1px 2px rgba(70, 55, 20, 0.1),
      0 10px 26px -6px rgba(70, 55, 20, 0.28);
  }
  .cell {
    background: ${Y($.cream)};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-width: 0;
    transition:
      background 0.45s,
      color 0.45s;
    font-size: 14px;
    text-align: center;
    line-height: 1.1;
    padding: 0 6px;
  }
  .cell.hi {
    background: ${Y($.creamHi)};
    font-weight: 600;
  }
  .cell.ia {
    grid-column: span 2;
    font-family: var(--mono);
    font-size: 14.5px;
    letter-spacing: 0.5px;
    color: #5c4c1d;
    background: #f6e3a6;
  }
  .cell.name {
    grid-column: span 2;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    line-height: 37px;
    background: #fcecbd;
  }
  .card.sup {
    background: #3a3f4b;
    border-color: #1f2229;
  }
  .card.sup .cell.ia,
  .card.sup .cell.name {
    background: #1f2229;
    color: #fff;
  }
  .cell.ga {
    font-family: var(--mono);
    font-size: 14px;
    flex-direction: column;
  }
  .cell.ga small {
    font-size: 10.5px;
    color: #8a7a4c;
  }
  /* Free text of a cell: no more than two lines, the rest of them in infobulle. */
  .cell .txt {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  .cell .txt.long {
    font-size: 12px;
  }
  .cell .txt.one {
    -webkit-line-clamp: 1;
    display: -webkit-box;
  }
  .cell .sub {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: ${Y($.tg)};
  }
  .val {
    position: absolute;
    bottom: 3px;
    min-width: 19px;
    height: 19px;
    padding: 0 4px;
    border-radius: 5px;
    border: 1.5px solid ${Y($.amber)};
    background: #fff;
    color: ${Y($.ink)};
    font-family: var(--mono);
    font-size: 11.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.3s,
      color 0.3s;
  }
  .val.w {
    font-size: 10px;
    padding: 0 2px;
  }
  .cell.ga.pr {
    padding-right: 30px;
  }
  .cell.ga.pl {
    padding-left: 30px;
  }
  .val.set {
    background: #ffe7a3;
  }
  .val.r {
    right: 3px;
  }
  .val.l {
    left: 3px;
  }
  .val.fresh {
    color: ${Y($.red)};
    animation: pop 0.6s ease-out;
  }
  @keyframes pop {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 ${Y(po($.amber,.7))};
    }
    35% {
      transform: scale(1.35);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 8px ${Y(po($.amber,0))};
    }
  }
  .plate {
    position: absolute;
    background: linear-gradient(145deg, #ffffff, #f1efe8);
    border: 1px solid #d6d1c3;
    border-radius: 14px;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.06),
      0 8px 18px -8px rgba(0, 0, 0, 0.22);
  }
  .key {
    position: absolute;
    left: 8px;
    right: 8px;
    border-radius: 9px;
    border: 1px solid #cfc9ba;
    background: linear-gradient(#ffffff, #ece9e1);
    box-shadow:
      inset 0 1px 0 #fff,
      0 2px 0 #d2ccbd,
      0 3px 6px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    touch-action: none;
    user-select: none;
    color: ${Y($.ink)};
    padding: 0;
    font-size: 12px;
    transition:
      transform 0.08s,
      box-shadow 0.08s,
      background 0.15s;
  }
  .key:hover {
    border-color: ${Y($.amber)};
  }
  .key:focus-visible {
    outline: 2px solid ${Y($.tg)};
    outline-offset: 2px;
  }
  .key:active,
  .key.down {
    background: linear-gradient(#f5b83a, ${Y($.amber)});
    border-color: #b98200;
    color: #fff;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.18);
    transform: translateY(2px);
  }
  .key .ico {
    font-size: 13px;
    line-height: 1;
    color: ${Y($.mute)};
  }
  .key.down .ico {
    color: #fff;
  }
  .key .kl {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    max-width: 62px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .key .kx {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    line-height: 1.1;
  }
  .key:has(.kx) {
    gap: 4px;
    padding: 0 4px;
  }
  .key .ks {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.1px;
    color: ${Y($.mute)};
    max-width: 58px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .key.down .ks {
    color: #fff;
  }
  .led {
    width: 7px;
    height: 7px;
    border-radius: 4px;
    background: #d6d2c6;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.2);
  }
  .led.on {
    background: #ffb400;
    box-shadow: 0 0 7px 1px #ffb400;
  }
  .holdbar {
    position: absolute;
    height: 6px;
    border-radius: 3px;
    background: #e5e2d8;
    overflow: hidden;
  }
  .holdbar div {
    height: 100%;
  }
  .holdtxt {
    position: absolute;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: #fff;
    padding: 1px 5px;
    border-radius: 5px;
    z-index: 6;
  }
  .coupler {
    position: absolute;
    border: 2px solid ${Y($.cpl)};
    background: ${Y($.cplSoft)};
    border-radius: 9px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      background 0.3s,
      border-color 0.3s;
  }
  .coupler b {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .coupler span {
    font-family: var(--mono);
    font-size: 12.5px;
    opacity: 0.85;
  }
  .chip {
    position: absolute;
    transform: translateX(-50%);
    background: #fff;
    border-radius: 6px;
    padding: 2px 7px;
    font-family: var(--mono);
    font-size: 11.5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1;
  }
  .tag {
    position: absolute;
    transform: translate(-50%, -100%);
    z-index: 3;
    pointer-events: none;
    background: #fff;
    border-radius: 7px;
    padding: 3px 9px;
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .tag b {
    background: ${Y($.amberSoft)};
    color: ${Y($.ink)};
    padding: 0 3px;
    border-radius: 3px;
  }
  .pill {
    position: absolute;
    padding: 3px 9px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--mono);
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
    z-index: 4;
    cursor: pointer;
  }
  .pill i {
    width: 7px;
    height: 7px;
    border-radius: 4px;
    background: ${Y($.amber)};
  }
  .pill em {
    font-style: normal;
    opacity: 0.85;
    font-weight: 400;
  }
  .seglabel {
    position: absolute;
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    color: ${Y($.bus)};
    white-space: nowrap;
  }
  .zone {
    position: absolute;
    border-radius: 18px;
    border: 1.5px dashed #c8c5b9;
    background: rgba(255, 255, 255, 0.4);
  }
  .zone span {
    position: absolute;
    left: 150px;
    top: 8px;
    font-size: 16px;
    font-weight: 600;
    color: ${Y($.mute)};
  }
  .lamp {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lamp svg {
    width: 26px;
    height: 32px;
    overflow: visible;
    transition: filter 0.35s;
  }
  .lamp svg.fanicon {
    width: 30px;
    height: 30px;
  }
  .fanicon .blades {
    transform-origin: 16px 16px;
    animation: fan-turn 1s linear infinite;
  }
  @keyframes fan-turn {
    to {
      transform: rotate(360deg);
    }
  }
  .lamp svg .glass {
    fill: #fff;
    stroke: #a9a393;
    transition:
      fill 0.35s,
      stroke 0.35s;
  }
  .lamp svg .base {
    fill: #bdb7a8;
  }
  .lamp svg .fil {
    stroke: #b7b1a2;
    fill: none;
    transition: stroke 0.35s;
  }
  .lamp.on svg {
    filter: drop-shadow(0 0 6px rgba(255, 190, 40, 0.95))
      drop-shadow(0 0 16px rgba(255, 190, 40, 0.6));
  }
  .lamp.on svg .glass {
    fill: #ffd84d;
    stroke: #d99a00;
  }
  .lamp.on svg .fil {
    stroke: #b46a00;
  }
  .loadlbl {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.15;
    max-width: 88px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .loadlbl small {
    display: block;
    font-family: var(--mono);
    font-weight: 400;
    color: ${Y($.mute)};
    font-size: 11.5px;
  }
  .radiator .rad {
    width: 40px;
    height: 32px;
    flex: none;
    filter: none;
  }
  .radiator.hot .rad {
    filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.45));
  }
  .radiator.hot.cool .rad {
    filter: drop-shadow(0 0 5px rgba(47, 109, 179, 0.45));
  }
  .lamp .bulb {
    width: 30px;
    height: 36px;
    flex: none;
  }
  .dali {
    position: absolute;
    font-size: 11px;
  }
  .dali-bus {
    position: relative;
    height: 14px;
    border-top: 2.5px dashed #7a57c9;
    margin-top: 6px;
  }
  .dali-bus span {
    position: absolute;
    right: 0;
    top: -16px;
    font-family: var(--mono);
    font-size: 9.5px;
    font-weight: 700;
    color: #7a57c9;
    letter-spacing: 0.5px;
  }
  .dali-ecgs {
    display: grid;
    gap: 2px;
    margin-top: -8px;
  }
  .dali-ecg {
    all: unset;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 5px;
  }
  .dali-ecg:hover {
    background: rgba(122, 87, 201, 0.1);
  }
  .dali-ecg .bulb {
    width: 16px;
    height: 20px;
  }
  .dali-ecg small {
    font-family: var(--mono);
    font-size: 8.5px;
    color: #7a57c9;
  }
  .dali-ecg.failed .bulb {
    opacity: 0.35;
  }
  .dali-ecg.failed small {
    color: ${Y($.red)};
    font-weight: 700;
    text-decoration: line-through;
  }
  .dali-foot {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
    margin-top: 2px;
  }
  .dali-foot b {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dali-foot span {
    font-family: var(--mono);
    color: ${Y($.mute)};
  }
  .shutter {
    position: absolute;
    width: 92px;
  }
  .shutter .box {
    height: 16px;
    background: #e4e1d8;
    border: 1.5px solid #b8b4a7;
    border-radius: 5px 5px 0 0;
  }
  .shutter .win {
    height: 78px;
    background: linear-gradient(#cfe3f3, #eaf3fa);
    border: 1.5px solid #b8b4a7;
    border-top: none;
    position: relative;
    overflow: hidden;
  }
  .shutter .slats {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    background-image: repeating-linear-gradient(
      #d8d4c7 0 7px,
      #bdb8a9 7px 8.5px
    );
    border-bottom: 3px solid #8f8a7b;
  }
  .shutter .slatinfo {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: ${Y($.mute)};
  }
  .shutter .slatinfo b {
    font-family: var(--mono);
    font-weight: 600;
  }
  .shutter .foot {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin-top: 3px;
    font-size: 12.5px;
  }
  .shutter .foot span:first-child {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .shutter .foot span:last-child {
    font-family: var(--mono);
    color: ${Y($.mute)};
  }
  .shutter .foot span.mv,
  .est b.mv {
    color: #9a6a00;
  }
  .est {
    position: absolute;
    width: 92px;
    display: flex;
    flex-direction: column;
    font-size: 11.5px;
    line-height: 1.3;
    color: ${Y($.mute)};
    border-top: 1px dashed #cfccc1;
    padding-top: 2px;
  }
  .est span {
    display: flex;
    justify-content: space-between;
  }
  .est b {
    font-family: var(--mono);
    font-weight: 600;
    color: ${Y($.cpl)};
  }
  .screen {
    position: absolute;
    left: 6px;
    right: 6px;
    border-radius: 7px;
    background: #22313a;
    color: #d8f3e6;
    font-family: var(--mono);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    box-shadow: inset 0 0 0 2px #3c4d57;
  }
  .screen b {
    font-size: 17px;
  }
  .screen b small {
    font-size: 10px;
    font-weight: 400;
    margin-left: 1px;
  }
  .screen span {
    font-size: 10.5px;
    color: #a9d6c2;
    white-space: nowrap;
  }
  .screen i {
    font-style: normal;
    color: #ff9a5c;
    margin-left: 3px;
  }
  .screen i.cool {
    color: #8cc6ff;
  }
  .numin {
    position: absolute;
    left: 6px;
    right: 6px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 1px;
  }
  .numin label {
    font-size: 9.5px;
    line-height: 10px;
    font-weight: 600;
    color: ${Y($.mute)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }
  .numin div {
    display: flex;
    gap: 3px;
  }
  .numin input {
    width: 100%;
    min-width: 0;
    height: 20px;
    border: 1px solid #cfc9ba;
    border-radius: 6px;
    padding: 0 3px;
    font-family: var(--mono);
    font-size: 12px;
    text-align: right;
    background: #fff;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  /* Native spin buttons leave no room for the value in the narrow key plate;
     arrow keys still step the value. */
  .numin input::-webkit-inner-spin-button,
  .numin input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .numin input:focus-visible,
  .numin button:focus-visible {
    outline: 2px solid ${Y($.tg)};
    outline-offset: 1px;
  }
  .numin button {
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1px solid #cfc9ba;
    background: linear-gradient(#ffffff, #ece9e1);
    cursor: pointer;
    padding: 0;
    font-size: 12px;
  }
  .banner {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    background: #fff;
    border: 1.5px solid ${Y($.cpl)};
    border-radius: 12px;
    padding: 7px 8px 7px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 6px 20px rgba(20, 20, 30, 0.15);
    max-width: 94%;
    font-size: 14px;
    z-index: 8;
  }
  .banner.fault {
    border-color: ${Y($.red)};
    color: ${Y($.red)};
  }
  .banner .more {
    color: ${Y($.mute)};
  }
  .cause {
    font-family: inherit !important;
    font-size: 13px !important;
    font-weight: 500;
  }
  .info {
    position: absolute;
    right: 12px;
    top: 12px;
    width: min(380px, calc(100% - 24px));
    background: #fff;
    border-radius: 12px;
    border: 1.5px solid ${Y($.cpl)};
    padding: 11px 14px;
    box-shadow: 0 8px 26px rgba(20, 20, 30, 0.16);
    z-index: 9;
    font-size: 13.5px;
    line-height: 1.45;
  }
  .info h3 {
    margin: 0 0 4px;
    font-size: 15.5px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .info h3 span {
    cursor: pointer;
    color: ${Y($.mute)};
  }
  .info table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 6px;
    font-size: 12.5px;
  }
  .info td {
    padding: 2px 4px;
    border-top: 1px solid #eee;
  }
  .info td.m {
    font-family: var(--mono);
    white-space: nowrap;
  }
  .info th {
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    color: ${Y($.mute)};
    padding: 2px 4px;
  }
  .info .behavior {
    font-size: 12px;
    color: ${Y($.mute)};
    margin-top: 2px;
  }
  .info code {
    font-family: var(--mono);
    color: ${Y($.ink)};
  }
  .info .flags span {
    display: inline-block;
    width: 15px;
    text-align: center;
    border-radius: 3px;
    margin-right: 2px;
    color: #b8b3a5;
    text-decoration: line-through;
  }
  .info .flags span.on {
    color: ${Y($.bus)};
    background: #e3f4ec;
    text-decoration: none;
    font-weight: 700;
  }
  .info details {
    margin-top: 6px;
  }
  .info summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 12.5px;
  }
  .info .chans tr.head td {
    font-weight: 600;
    padding-top: 6px;
  }
  .info .chans small {
    font-weight: 400;
    color: ${Y($.mute)};
    margin-left: 6px;
  }
  .info {
    max-height: calc(100% - 24px);
    overflow: auto;
  }
  .bottom {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 8px;
  }
  @media (max-width: 860px) {
    .bottom {
      grid-template-columns: 1fr;
    }
  }
  .panel {
    background: #fff;
    border: 1px solid ${Y($.line)};
    border-radius: 12px;
    padding: 8px 10px;
    min-width: 0;
  }
  .panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }
  .cap {
    font-size: 11.5px;
    font-weight: 600;
    color: ${Y($.mute)};
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .usb,
  .rooms {
    grid-column: 1 / -1;
  }
  .room-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 2px 2px;
  }
  .room {
    flex: 1 1 250px;
    max-width: 380px;
    min-width: 0;
    border: 1px solid ${Y($.line)};
    border-radius: 10px;
    padding: 6px 10px 8px;
    background: #fbfaf6;
  }
  .room.open {
    border-color: #7fb0e0;
    background: #f1f7fd;
  }
  .room-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .room-head b {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .room-t {
    font-family: var(--mono);
    font-size: 20px;
    font-weight: 700;
    color: ${Y($.ink)};
    white-space: nowrap;
  }
  .room-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${Y($.mute)};
    margin-top: 2px;
  }
  .room-line span:first-child {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .room-line b {
    color: ${Y($.ink)};
    font-weight: 600;
    white-space: nowrap;
  }
  .room-bar {
    flex: none;
    width: 60px;
    height: 6px;
    border-radius: 3px;
    background: #e6e3da;
    overflow: hidden;
  }
  .room-bar i {
    display: block;
    height: 100%;
    background: #ea580c;
  }
  .room-ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
  }
  .room-out {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${Y($.mute)};
  }
  .room-out b {
    font-family: var(--mono);
    color: ${Y($.ink)};
    min-width: 4.5em;
    text-align: center;
  }
  .room-out .btn {
    padding: 2px 8px;
  }
  .usb .hint select {
    font: inherit;
    font-size: 12px;
  }
  .usb-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: flex-end;
    padding: 8px 12px 4px;
  }
  .usb-row label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${Y($.mute)};
    min-width: 0;
  }
  .usb-row label small {
    font-weight: 400;
  }
  .usb-row select,
  .usb-row input {
    font: inherit;
    font-size: 13px;
    color: ${Y($.ink)};
    padding: 4px 6px;
    border: 1px solid #cfccc1;
    border-radius: 7px;
    background: #fff;
    max-width: 320px;
  }
  .usb-row input {
    width: 7em;
  }
  .usb-out {
    padding: 4px 12px 10px;
    font-size: 12.5px;
    color: ${Y($.mute)};
  }
  .usb-bad {
    color: ${Y($.red)};
    margin-bottom: 2px;
  }
  .usb-out b {
    color: ${Y($.ink)};
  }
  .mon {
    max-height: 196px;
    overflow: auto;
    container-type: inline-size;
  }
  .panel header .enlarge,
  .panel header .close {
    flex: none;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    padding: 0;
    font-size: 12px;
    line-height: 1;
  }
  dialog.enlarged {
    width: min(1400px, 96vw);
    max-height: 94vh;
    padding: 12px;
    border: 1px solid ${Y($.line)};
    border-radius: 14px;
    background: #fafaf7;
    box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.45);
    box-sizing: border-box;
    overflow: auto;
  }
  dialog.enlarged::backdrop {
    background: rgba(28, 30, 35, 0.45);
  }
  dialog.enlarged > .panel + .panel {
    margin-top: 10px;
  }
  dialog.enlarged .mon {
    max-height: 60vh;
  }
  dialog.enlarged .mon table {
    font-size: 14px;
  }
  dialog.enlarged .mon th,
  dialog.enlarged .mon td {
    padding: 5px 8px;
  }
  dialog.enlarged .mon td small {
    max-width: 18em;
  }
  /* On narrow panels, telegram type (always GroupValueWrite) and DPT remain in the details. */
  @container (max-width: 620px) {
    .mon .opt {
      display: none;
    }
  }
  .mon table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--mono);
    font-size: 12px;
  }
  .mon th {
    position: sticky;
    top: 0;
    background: #f4f3ef;
    text-align: left;
    font-family: inherit;
    font-weight: 600;
    color: ${Y($.mute)};
    padding: 3px 6px;
    white-space: nowrap;
  }
  .mon td {
    padding: 3px 6px;
    border-top: 1px solid #efede7;
    white-space: nowrap;
  }
  .mon tr {
    cursor: pointer;
  }
  .mon tbody tr:hover {
    background: #f7f6f2;
  }
  .mon tr.sel {
    background: ${Y($.amberSoft)};
  }
  .mon td small {
    color: ${Y($.mute)};
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    margin-left: 4px;
  }
  /* Truncate long device and address names with an ellipsis. */
  .mon td small {
    display: inline-block;
    max-width: 9em;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }
  .mon .state td:nth-child(4) {
    color: ${Y($.tg)};
  }
  .empty {
    font-size: 13px;
    color: ${Y($.mute)};
    padding: 6px 2px;
  }
  .kv-row {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 6px;
    align-items: baseline;
    font-size: 13px;
    padding: 1px 0;
  }
  .kv-row span:first-child {
    color: ${Y($.mute)};
  }
  .kv-row b {
    font-family: var(--mono);
    font-size: 14px;
  }
  .kv-row small {
    color: ${Y($.mute)};
    margin-left: 6px;
  }
  .frame {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 6px 0 2px;
  }
  .frame div {
    border-radius: 6px;
    padding: 2px 5px;
    font-family: var(--mono);
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid;
    cursor: help;
  }
  .sep {
    border-top: 1px solid #ecebe5;
    margin-top: 6px;
    padding-top: 5px;
    font-size: 12.5px;
  }
  .sep .line {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .badge {
    font-size: 11.5px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 10px;
    border: 1.5px solid ${Y($.tg)};
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .err {
    border: 1.5px solid ${Y($.red)};
    background: #fdf1ee;
    color: ${Y($.red)};
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13.5px;
    white-space: pre-wrap;
    font-family: var(--mono);
  }
  @media (prefers-reduced-motion: reduce) {
    /* Decorative effects removed; telegrams continue to circulate. */
    .val.fresh {
      animation: none;
    }
    .cell,
    .coupler,
    .key,
    .lamp svg,
    .lamp svg .glass {
      transition: none;
    }
    .fanicon .blades {
      animation: none !important;
    }
  }
`,ho=(e,t,n,r=250,i=400)=>Math.min(Ua((e-t)/r),1-Ua((e-n)/i)),go=100,_o={on:`I`,off:`O`,toggle:`I/O`,up:`▲`,down:`▼`,updown:`▲▼`,scene:`☰`,presence:`◉`,clock:`◷`,dimUp:`☼+`,dimDown:`☼−`},vo=(e,t)=>({line:t`Connects a line to the main line. It only forwards the group addresses of its filter table (used on both sides) and decrements the routing counter.`,area:t`Connects the main line of an area to the backbone. Same filter-table principle, at area level.`,router:t`Gateway between the TP bus and the IP network (KNXnet/IP). Its filter table only lets through addresses used on the other side.`,repeater:t`Extends the line electrically (new segment of 64 devices). No filtering: everything is repeated, and the routing counter is decremented.`,segmentCoupler:t`Splits the line into segments with a filter table: local traffic of one segment no longer reaches the other.`})[e]??``,yo=e=>[[`0.35`,e`Slow`],[`1`,e`Normal`],[`2`,e`Fast`],[`5`,`×5`]],bo=typeof document>`u`||document.readyState===`complete`?Promise.resolve():new Promise(e=>{document.addEventListener(`DOMContentLoaded`,()=>e(),{once:!0}),window.addEventListener(`load`,()=>e(),{once:!0})});function xo(e,t){try{return JSON.parse(e)}catch(n){let r=String(n.message),i=/position (\d+)/.exec(r),a=``;if(i){let t=e.slice(0,Number(i[1]));a=` (ligne ${t.split(`
`).length}, colonne ${t.length-t.lastIndexOf(`
`)})`}throw Error(`Invalid JSON in ${t}${a}: ${r}`,{cause:n})}}var So=e=>typeof e==`number`?`${Math.round(e)} %`:`—`,Co=class extends Sa{constructor(){super(),S(this,`model`,null),S(this,`topo`,null),S(this,`geo`,null),S(this,`sim`,null),S(this,`unsubscribe`,null),S(this,`error`,``),S(this,`width`,900),S(this,`raf`,0),S(this,`last`,0),S(this,`acc`,0),S(this,`hold`,null),S(this,`speed`,1),S(this,`stepMode`,!1),S(this,`showTables`,!1),S(this,`clockEdit`,!1),S(this,`monitorExpanded`,!1),S(this,`info`,null),S(this,`selId`,null),S(this,`seenTels`,0),S(this,`loadToken`,0),S(this,`ro`,null),S(this,`stageRo`,null),S(this,`stageBox`,{w:0,h:0}),S(this,`drafts`,new Map),S(this,`usbPanel`,{dev:null,ga:``,value:`1`,read:null}),S(this,`fullscreen`,!1),S(this,`onFullscreen`,()=>{let e=!!this.shadowRoot?.fullscreenElement;e!==this.fullscreen&&(this.fullscreen=e,this.requestUpdate())}),S(this,`onVisibility`,()=>{document.hidden?this.stopLoop():this.kick()}),S(this,`initialized`,!1),S(this,`keyLong`,null),S(this,`observedWrap`,null),this.scenario=``,this.src=``,this.options=null}get language(){return this.closest(`[lang]`)?.getAttribute(`lang`)||`en`}get tr(){return s(this.language)}get view(){return fo(e=>this.getAttribute(e),this.options)}connectedCallback(){super.connectedCallback(),this.ro=new ResizeObserver(e=>{let t=e[0]?.contentRect.width??0;t&&Math.abs(t-this.width)>1&&(this.width=t,this.requestUpdate())}),this.ro.observe(this),document.addEventListener(`visibilitychange`,this.onVisibility),document.addEventListener(`fullscreenchange`,this.onFullscreen),this.sim&&this.kick()}disconnectedCallback(){super.disconnectedCallback(),this.ro?.disconnect(),this.ro=null,this.stageRo?.disconnect(),this.stageRo=null,this.stopLoop(),this.hold=null,document.removeEventListener(`visibilitychange`,this.onVisibility),document.removeEventListener(`fullscreenchange`,this.onFullscreen)}toggleFullscreen(){this.fullscreen?document.exitFullscreen?.():this.renderRoot.querySelector(`.stage-wrap`)?.requestFullscreen?.().catch(()=>void 0)}willUpdate(e){let t=this.view;this.getAttribute(`data-fit`)!==t.fit&&this.setAttribute(`data-fit`,t.fit),(e.has(`options`)||e.has(`speedAttr`)||e.has(`stepModeAttr`))&&(t.speed!==null&&(this.speed=t.speed),(e.has(`stepModeAttr`)||this.options?.stepMode!==void 0)&&(this.stepMode=t.stepMode)),(e.has(`scenario`)||e.has(`src`)||!this.initialized)&&(this.initialized=!0,this.loadFromAttributes())}inlineScenario(){let e=this.querySelector(`:scope > script[type="application/json"]`);if(e)return e.textContent??``;let t=[...this.childNodes].filter(e=>e.nodeType===Node.TEXT_NODE).map(e=>e.textContent??``).join(``).trim();return t.startsWith(`{`)?t:null}async loadFromAttributes(){let e=++this.loadToken;try{if(await bo,e!==this.loadToken)return;if(this.scenario){let e=document.querySelector(this.scenario);if(!e)throw Error(this.tr`Element ${this.scenario} not found in the page.`);this.load(xo(e.textContent??``,this.scenario))}else if(this.src){let t=this.src,n=await fetch(t);if(e!==this.loadToken)return;if(!n.ok)throw Error(this.tr`Could not load ${t} (${n.status}).`);let r=await n.json();if(e!==this.loadToken)return;this.load(r)}else if(!this.model&&!this.sim){let e=this.inlineScenario();e!==null&&this.load(xo(e,`the content of <bus-diagram>`))}}catch(t){e===this.loadToken&&this.fail(t)}}load(e){this.loadToken++,this.teardown();try{let t=ei(e,void 0,this.tr),n=_e(t),r=Va(t,n,{equipmentSize:e=>to(e)?.size,t:this.tr});this.model=t,this.topo=n,this.geo=r,this.speed=this.view.speed??t.options.speed,this.stepMode=this.view.stepMode,this.showTables=t.options.filterTables,this.error=``,this.sim=new Er(t,{lang:this.language}),this.attach(this.sim),this.clearUi(),this.requestUpdate(),this.isConnected&&t.clock&&this.kick(),this.dispatchEvent(new CustomEvent(`bd-ready`,{bubbles:!0,composed:!0}))}catch(e){this.fail(e)}}reset(){this.sim&&(this.sim.reset(),this.clearUi(),this.stopLoop(),this.requestUpdate(),this.sim.clock()&&this.kick())}play(){this.sim?.play(),this.kick()}pause(){this.sim?.pause(),this.requestUpdate()}advance(e){this.sim?.advance(e),this.requestUpdate()}stepToNextEvent(){let e=this.sim?.stepToNextEvent()??null;return this.requestUpdate(),e}groupWrite(e,t,n){let r=n??this.interfaces()[0]?.id,i=r?this.sim?.groupWrite(r,e,t)??null:null;return i&&this.stepMode&&this.sim?.pause(),this.afterInput(),i}groupRead(e,t){let n=t??this.interfaces()[0]?.id,r=n?this.sim?.groupRead(n,e)??null:null;return r&&(this.usbPanel.read={id:r.id,ga:e}),r&&this.stepMode&&this.sim?.pause(),this.afterInput(),r}interfaces(){return(this.model?.devices??[]).filter(e=>e.behavior===`usbInterface/v1`)}getState(){return this.sim?.getState()??null}setSpeed(e){if(typeof e!=`number`||!Number.isFinite(e)||e<=0)throw RangeError(this.tr`setSpeed: finite positive number expected (got ${e})`);this.speed=e,this.requestUpdate()}get simulation(){return this.sim}on(e,t){let n=`bd-${e}`,r=e=>t(e.detail);return this.addEventListener(n,r),()=>this.removeEventListener(n,r)}attach(e){let t=e.onTelegram(e=>this.announce(e)),n=e.subscribe(t=>{t.kind===`diagnostic`&&e.fault&&this.requestUpdate()});this.unsubscribe=()=>{t(),n()}}teardown(){this.stopLoop(),this.unsubscribe?.(),this.unsubscribe=null,this.sim=null,this.model=null,this.hold=null}clearUi(){this.selId=null,this.info=null,this.seenTels=0,this.hold=null,this.acc=0,this.drafts.clear()}fail(e){this.teardown(),this.geo=null,this.topo=null;let t=e instanceof kr?e.details:[];this.error=e instanceof kr?this.tr`Invalid scenario:`+`
• `+e.problems.join(`
• `):String(e?.message??e);let n=this.error;this.dispatchEvent(new CustomEvent(`bd-error`,{detail:{message:n,details:t,toString:()=>n},bubbles:!0,composed:!0})),this.requestUpdate()}announce(e){this.dispatchEvent(new CustomEvent(`bd-telegram`,{detail:{id:e.id,timeMs:e.timeMs,source:e.sourceAddress,destination:e.ga,value:e.value,raw:e.raw,dpt:e.dpt,service:e.service,causeId:e.causeId,kind:e.kind},bubbles:!0,composed:!0}))}stopLoop(){this.raf&&cancelAnimationFrame(this.raf),this.raf=0}kick(){if(this.requestUpdate(),this.raf||!this.isConnected||typeof document<`u`&&document.hidden)return;this.last=performance.now();let e=t=>{this.raf=0;let n=this.sim;if(!n)return;let r=Math.min(go,Math.max(0,t-this.last));this.last=t;let i=this.hold;if(i&&i.hasLong&&!i.fired&&t-i.start>=this.longMs(i.dev)&&(i.fired=!0,i.longFired=!0,this.gesture(i.dev,i.button,`long`)),!n.paused){this.acc+=r*this.speed;let e=Math.floor(this.acc);this.acc-=e,e>0&&(this.stepMode?n.advanceUntilExplained(e)&&(n.pause(),this.acc=0):n.advance(e))}this.requestUpdate();let a=n.visibleTelegrams().length>0;(this.hold||!n.paused&&(n.busy()||a||n.clock()!==null))&&(this.raf=requestAnimationFrame(e))};this.raf=requestAnimationFrame(e)}gesture(e,t,n,r){let i=this.sim;if(!i)return;let a=i.input(e,t,n,r);this.stepMode&&a.length&&i.pause(),this.afterInput()}afterInput(){this.selId=null,this.kick()}onDown(e,t,n){if(e.preventDefault(),e.stopPropagation(),!this.sim||this.hold)return;let r=e.currentTarget;try{r.setPointerCapture(e.pointerId)}catch{}this.hold={dev:t.id,button:n.id,start:performance.now(),fired:!1,hasLong:!!n.long,pointerId:e.pointerId},n.press?(this.hold.fired=!0,this.gesture(t.id,n.id,`press`)):this.afterInput()}onUp(e){let t=this.hold;t&&this.sim&&(t.pointerId===null||e.pointerId===t.pointerId)&&(this.hold=null,t.fired?t.longFired&&this.hasRelease(t.dev,t.button)?this.gesture(t.dev,t.button,`release`):this.afterInput():this.gesture(t.dev,t.button,`short`))}onCancel(e){let t=this.hold;!t||t.pointerId!==null&&e.pointerId!==t.pointerId||(this.hold=null,t.longFired&&this.hasRelease(t.dev,t.button)?this.gesture(t.dev,t.button,`release`):this.requestUpdate())}hasRelease(e,t){return!!this.model?.devicesById.get(e)?.buttons.find(e=>e.id===t)?.release}onKeyUp(e,t,n){if(e.key!==`Enter`&&e.key!==` `)return;let r=this.keyLong;r&&r.dev===t.id&&r.button===n.id&&(this.keyLong=null,e.preventDefault(),e.stopPropagation(),this.gesture(t.id,n.id,`release`))}onKey(e,t,n){if(e.key!==`Enter`&&e.key!==` `||(e.preventDefault(),e.stopPropagation(),e.repeat||!this.sim))return;let r=n.press?`press`:e.shiftKey&&n.long?`long`:n.short?`short`:`long`;this.gesture(t.id,n.id,r),r===`long`&&n.release&&(this.keyLong={dev:t.id,button:n.id})}submitNumber(e,t,n){let r=Number(n.replace(`,`,`.`));if(!this.sim||n.trim()===``||!Number.isFinite(r))return;let i=Math.min(t.max,Math.max(t.min,r));this.drafts.set(`${e.id}/${t.id}`,String(i)),this.gesture(e.id,t.id,`value`,i)}updated(){let e=this.sim?.history.length?this.sim.history[this.sim.history.length-1].id:0;e!==this.seenTels&&(this.seenTels=e,this.renderRoot.querySelectorAll(`.mon`).forEach(e=>e.scrollTop=e.scrollHeight));let t=this.renderRoot.querySelector(`dialog.enlarged`);if(t&&!t.open){t.showModal();let e=t.querySelector(`.mon`);e&&(e.scrollTop=e.scrollHeight)}let n=this.renderRoot.querySelector(`.scroller`);n&&n!==this.observedWrap&&(this.stageRo?.disconnect(),this.observedWrap=n,this.stageRo=new ResizeObserver(e=>{let t=e[0]?.contentRect;t&&(Math.abs(t.width-this.stageBox.w)>1||Math.abs(t.height-this.stageBox.h)>1)&&(this.stageBox={w:t.width,h:t.height},(this.view.fit===`contain`||this.fullscreen)&&this.requestUpdate())}),this.stageRo.observe(n))}render(){if(this.error)return X`<div class="err">${this.error}</div>`;let e=this.model,t=this.geo,n=this.topo,r=this.sim;if(!e||!t||!r||!n)return X`<div class="empty">${this.tr`Loading KNX scenario…`}</div>`;let i=r.timeMs,a=this.view,o=(a.fit===`contain`||this.fullscreen)&&this.stageBox.w>0&&this.stageBox.h>0,s=this.fullscreen?Math.max(a.maxScale,2.5):a.maxScale,c=o?Math.min(s,this.stageBox.w/t.W,this.stageBox.h/t.H):Math.min(a.maxScale,Math.max(a.minScale,this.width/t.W)),l=r.visibleTelegrams(),u=l.map(r=>({tel:r,...this.animTel(r,e,t,n,i)})),d=e.devices.some(e=>e.buttons.some(e=>e.long)),f=e.lines.filter(e=>e.extension?.switchable),p=r.paused&&this.stepMode?r.lastStop:null,m=a.toolbar===`full`?this.renderToolbar(e,t,r,f):Q;return X`<div class="kv ${a.fit===`contain`?`contain`:``}">
      ${m}
      ${a.description&&e.description?X`<p class="desc">${e.description}</p>`:Q}
      ${this.renderConfigWarnings(r)}

      <div
        class="stage-wrap"
        @click=${()=>(this.info=null,this.requestUpdate())}
      >
        ${this.renderClock(r)}
        <div class="scroller">
          <div
            class="stage-size"
            style="width:${t.W*c}px;height:${t.H*c}px;background-size:${24*c}px ${24*c}px"
          >
            <div
              class="stage"
              style="width:${t.W}px;height:${t.H}px;transform:scale(${c})"
            >
              ${t.zones.map(e=>X`<div class="zone" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px"><span>${e.label}</span></div>`)}
              ${this.renderWires(e,t,r,u)} ${this.renderSegLabels(t)}
              ${e.devices.map(e=>this.renderDevice(e,t.devices.get(e.id),r))}
              ${t.couplers.map(e=>this.renderCoupler(e,r,l,i))}
              ${this.renderTags(t,l,i)}
              ${u.map(e=>e.pills.map(t=>this.renderPill(e.tel,t)))}
              ${this.renderHold(e,t)}
            </div>
          </div>
        </div>
        ${a.toolbar===`compact`?this.renderCompactControls(r):Q}
        ${typeof document<`u`&&document.fullscreenEnabled?X`<button
                class="fsbtn"
                title=${this.fullscreen?this.tr`Exit full screen`:this.tr`Full screen`}
                aria-label=${this.fullscreen?this.tr`Exit full screen`:this.tr`Full screen`}
                @click=${e=>{e.stopPropagation(),this.toggleFullscreen()}}
              >
                ${this.fullscreen?X`<svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4" />
                      </svg>`:X`<svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
                      </svg>`}
              </button>`:Q}
        ${r.fault?X`<div
                class="banner fault"
                @click=${e=>e.stopPropagation()}
              >
                <span
                  >${this.tr`Simulation stopped:`} ${r.fault.message}</span
                >
                <button class="btn" @click=${()=>this.reset()}>
                  ${this.tr`Reset`}
                </button>
              </div>`:p?X`<div
                  class="banner"
                  @click=${e=>e.stopPropagation()}
                >
                  <span>❚❚ ${this.stopText(p,e,r)}</span>
                  <button class="btn primary" @click=${()=>this.play()}>
                    ${this.tr`Next ▶`}
                  </button>
                </div>`:Q}
        ${this.renderInfo(e,t,r)}
      </div>
      ${a.hints&&d?X`<div class="hint">${this.tr`Click = short press · hold 0.5 s = long press (keyboard: Enter / Shift+Enter)`}</div>`:Q}
      ${a.monitor||this.interfaces().length||e.rooms.length?X`<div class="bottom">
              ${e.rooms.length?this.renderRooms(e,r):Q}
              ${this.interfaces().length?this.renderUsbPanel(e,r):Q}
              ${a.monitor?X`${this.renderMonitor(e,r)} ${this.renderDetail(e,t,r)}`:Q}
            </div>`:Q}
      ${a.monitor&&this.monitorExpanded?this.renderEnlargedMonitor(e,t,r):Q}
    </div>`}renderConfigWarnings(e){let t=e.diagnostics.filter(e=>e.code.startsWith(`config-`));return t.length?X`<div class="cfgwarn" role="note">
      <b>${this.tr`Configuration check`}</b>
      <ul>
        ${t.map(e=>X`<li>${e.message}</li>`)}
      </ul>
    </div>`:Q}renderCompactControls(e){return X`<div class="mini" @click=${e=>e.stopPropagation()}>
      <button
        title=${e.paused?this.tr`Resume`:this.tr`Pause`}
        aria-label=${e.paused?this.tr`Resume`:this.tr`Pause`}
        ?disabled=${!!e.fault}
        @click=${()=>e.paused?this.play():this.pause()}
      >
        ${e.paused?`▶`:`❚❚`}
      </button>
      <button
        class=${this.stepMode?`on`:``}
        title=${this.tr`Step by step`}
        aria-label=${this.tr`Step by step`}
        aria-pressed=${this.stepMode?`true`:`false`}
        @click=${()=>this.toggleStepMode(e)}
      >
        ⇥
      </button>
      <button
        title=${this.tr`Reset`}
        aria-label=${this.tr`Reset`}
        @click=${()=>this.reset()}
      >
        ↺
      </button>
    </div>`}toggleStepMode(e){this.stepMode=!this.stepMode,this.stepMode||e.play(),this.kick()}renderToolbar(e,t,n,r){return X`<div class="bar">
      <h2>${e.title}</h2>
      ${r.map(e=>X`<div class="grp">
            <span class="lbl">${this.tr`Extension`} ${e.address}</span>
            ${this.segCtl([[`repeater`,this.tr`Repeater`],[`segmentCoupler`,this.tr`Segment coupler`]],n.network.extMode(e.address),t=>{n.network.setExtMode(e.address,t),this.requestUpdate()})}
          </div>`)}
      <div class="grp">
        <span class="lbl">${this.tr`Speed`}</span>
        ${this.segCtl(yo(this.tr),String(this.speed),e=>this.setSpeed(Number(e)))}
      </div>
      ${t.couplers.length?X`<button
              class="btn ${this.showTables?`on`:``}"
              @click=${()=>(this.showTables=!this.showTables,this.requestUpdate())}
            >
              ${this.tr`Filter tables`}
            </button>`:Q}
      <button
        class="btn ${this.stepMode?`on`:``}"
        title=${this.tr`Stop at every transmission, coupler, reception, output change and timer`}
        @click=${()=>{this.stepMode=!this.stepMode,this.stepMode||n.play(),this.kick()}}
      >
        ${this.tr`Step by step`}
      </button>
      <button
        class="btn"
        ?disabled=${!!n.fault}
        @click=${()=>n.paused?this.play():this.pause()}
      >
        ${n.paused?`▶ ${this.tr`Resume`}`:`❚❚ ${this.tr`Pause`}`}
      </button>
      <button class="btn" @click=${()=>this.reset()}>
        ${this.tr`Reset`}
      </button>
    </div>`}segCtl(e,t,n){return X`<div class="seg">
      ${e.map(([e,r])=>X`<button class=${e===t?`sel`:``} @click=${()=>n(e)}>${r}</button>`)}
    </div>`}animTel(e,t,n,r,i){let a=t.devicesById.get(e.sourceDeviceId),o=n.devices.get(a.id),s=a.objects.findIndex(t=>t.id===e.objectId);return Za(e.plan,r,n,i,ja(o,a,s),e=>{let r=t.devicesById.get(e.deviceId),i=n.devices.get(e.deviceId),a=e.objectIds[0];return a?ja(i,r,r.objects.findIndex(e=>e.id===a)):null})}liveOutput(e){return!!e&&(e.type===`switch`?e.on:e.type===`dim`?e.level>0:e.direction!==`stop`)}renderWires(e,t,n,r){let i={backbone:8,main:6,line:5,ip:3},a=[];return t.segs.forEach(e=>{let t=e.kind===`ip`,n=e.pts.map(e=>e.join(`,`)).join(` `);a.push(Z`<polyline points=${n} fill="none" stroke=${t?$.ip:$.bus} stroke-width=${i[e.kind]} stroke-linecap="round" stroke-linejoin="round" stroke-dasharray=${t?`7 6`:`none`}></polyline>`),t||a.push(Z`<polyline points=${n} fill="none" stroke="#8fe0bd" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"></polyline>`)}),t.couplers.forEach(e=>{let t=e.kind===`router`;a.push(Z`<line x1=${e.A.p[0]} y1=${e.A.p[1]} x2=${e.c[0]} y2=${e.c[1]} stroke=${t?$.ip:$.bus} stroke-width=${t?3:5} stroke-dasharray=${t?`7 6`:`none`}></line>`),a.push(Z`<line x1=${e.c[0]} y1=${e.c[1]} x2=${e.B.p[0]} y2=${e.B.p[1]} stroke=${$.bus} stroke-width="5"></line>`)}),e.devices.forEach(e=>{let r=t.devices.get(e.id),i=e.medium===`IP`;a.push(Z`<line x1=${r.drop[0]} y1=${r.drop[1]} x2=${r.at[0]} y2=${r.at[1]} stroke=${i?$.ip:$.bus} stroke-width=${i?3:4} stroke-dasharray=${i?`7 6`:`none`}></line>`),a.push(Z`<circle cx=${r.at[0]} cy=${r.at[1]} r="5.5" fill="#fff" stroke=${i?$.ip:$.bus} stroke-width="3"></circle>`);let o=[...r.loads].sort((e,t)=>e.top-t.top),s=(o[0]?.x??0)-(r.x+224)-20,c=Math.min(10,s/Math.max(1,o.length-1));r.loads.forEach(t=>{let i=this.liveOutput(n.output(e.id,t.channel)),s=o.length>1?t.x-8-o.indexOf(t)*c:t.x-14;t.rows.forEach(e=>{let n=Aa(r,e),o=r.x+224,c=s;a.push(Z`<path d=${Math.abs(n-t.cy)<1?`M${o} ${n} H${t.x-2}`:`M${o} ${n} H${c} V${t.cy} H${t.x-2}`} stroke=${i?$.v230:`#e6c3b2`} stroke-width=${i?3:2} fill="none" stroke-linejoin="round" style="transition:stroke .3s"></path>`)}),e.channels.find(e=>e.id===t.channel)?.parameters.relayMode===`normallyClosed`&&a.push(Z`<g class="nc"><title>${this.tr`Normally closed relay: the load is powered while the channel is off.`}</title><circle cx=${t.x-5} cy=${t.cy} r="4" fill="#fff" stroke=${$.amber} stroke-width="2"></circle><text x=${t.x-12} y=${t.cy-7} text-anchor="end" font-size="10" font-weight="700" fill=${$.amber}>NC</text></g>`)}),r.plate?.keys.forEach(e=>e.rows.forEach(t=>{let n=Aa(r,t),i=r.x-12-7;a.push(Z`<path d=${`M${i} ${e.top+e.h/2} H${i+5} V${n} H${r.x}`} stroke="#cdc7b8" stroke-width="1.5" fill="none" stroke-linejoin="round"></path>`)}))}),r.forEach(e=>e.glows.forEach(t=>a.push(Z`<polyline points=${(t.pts??[t.a,t.b]).map(e=>e.join(`,`)).join(` `)} fill="none" stroke=${$.tg} stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=${t.o} stroke-dasharray=${e.tel.kind===`state`?`3 13`:`none`}></polyline>`))),X`<svg width=${t.W} height=${t.H}>${a}</svg>`}renderSegLabels(e){return[...e.segs.values()].map(e=>{let[t,n]=e.labelAt,r=e.kind===`ip`?`color:${$.ip};`:``;return e.labelDir===`v`?X`<div
          class="seglabel"
          style="left:${t}px;top:${n}px;${r}transform:rotate(-90deg);transform-origin:left top"
        >
          ${e.label}
        </div>`:X`<div
        class="seglabel"
        style="left:${t}px;top:${n}px;${r}${e.kind===`ip`?`transform:translateX(-100%)`:``}"
      >
        ${e.label}
      </div>`})}renderDevice(e,t,n){let r=n.timeMs,i=e.kind===`supervisor`,a=e.objects.map(t=>{let a=n.objectUpdatedAt(e.id,t.id),o=a!==null&&r-a<1300,s=n.objectValue(e.id,t.id),c=pe(t.dpt,s),l=c.length>=5||N(t.dpt)>=16&&c.length>=4,u=X`<span
        class="val ${e.receiver?`l`:`r`} ${o?`fresh`:``} ${s?`set`:``} ${l?`w`:``}"
        title="${this.tr`Internal object value:`} ${me(t.dpt,s,this.tr)}"
        >${c}</span
      >`,d=t.gas.slice(1),f=X`<div
        class="cell ga ${o?`hi`:``} ${l?e.receiver?`pl`:`pr`:``}"
        title=${t.gas.map(e=>`${e} ${ai(this.model,e)}`).join(`
`)}
      >
        <span>${t.gas[0]??`—`}</span
        >${d.length?X`<small>${d.join(` `)}</small>`:Q}${u}
      </div>`,p=X`<div class="cell ${o?`hi`:``}" title=${t.name}>
        <span style="min-width:0;max-width:100%"
          ><span
            class="txt ${t.name.length>22?`long`:``} ${i?`one`:``}"
            >${t.name}</span
          >${i?X`<span class="sub">${I(t.dpt,s,this.tr)}</span>`:Q}</span
        >
      </div>`;return e.receiver?[f,p]:[p,f]}),o=this.info===`dev:`+e.id;return X`
      ${t.plate?this.renderPlate(e,t,n):Q}
      <div
        class="card ${i?`sup`:``}"
        style="left:${t.x}px;top:${t.top}px;width:${t.w}px;grid-auto-rows:${37}px;${o?`box-shadow:0 0 0 4px ${po($.cpl,.35)}`:``}"
        title=${this.tr`Click to inspect objects and channels`}
        @click=${t=>{t.stopPropagation(),this.info=o?null:`dev:`+e.id,this.requestUpdate(),this.dispatchEvent(new CustomEvent(`bd-select`,{detail:{deviceId:e.id},bubbles:!0,composed:!0}))}}
      >
        <div class="cell ia">${e.address||`KNXnet/IP`}</div>
        <div class="cell name" title=${e.name}>${e.name}</div>
        ${a}
      </div>
      ${t.loads.map(t=>this.renderLoad(e,t,n))}
    `}renderPlate(e,t,n){let r=t.plate;return X`<div
      class="plate"
      style="left:${r.x}px;top:${r.top}px;width:${104}px;height:${r.h}px"
    >
      ${r.keys.map(t=>t.kind===`button`?this.renderKey(e,t,r.top,n):t.kind===`screen`?this.renderScreen(e,t,r.top,n):this.renderNumber(e,t,r.top,n))}
    </div>`}renderKey(e,t,n,r){let i=e.buttons.find(e=>e.id===t.id),a=this.hold?.dev===e.id&&this.hold.button===i.id,o=i.led?!!r.objectValue(e.id,i.led):null,s=(t,n)=>n?`${t} → ${e.objects.find(e=>e.id===n.object)?.gas[0]??`—`} = ${n.value===`toggle`?this.tr`toggle`:n.value}`:``,[c,l]=i.label.split(/\s+·\s+/,2),u=[i.label,s(this.tr`press`,i.press),s(this.tr`short press`,i.short),s(this.tr`long press`,i.long)].filter(Boolean).join(`
`);return X`<button
      class="key ${a?`down`:``}"
      style="top:${t.top-n}px;height:${t.h}px;${t.h>44?`flex-direction:column;gap:3px`:``}"
      title=${u}
      aria-label=${u.replace(/\n/g,` · `)}
      @pointerdown=${t=>this.onDown(t,e,i)}
      @pointerup=${e=>this.onUp(e)}
      @pointercancel=${e=>this.onCancel(e)}
      @lostpointercapture=${e=>this.onCancel(e)}
      @click=${e=>e.stopPropagation()}
      @keydown=${t=>this.onKey(t,e,i)}
      @keyup=${t=>this.onKeyUp(t,e,i)}
    >
      ${o===null?Q:X`<span class="led ${o?`on`:``}"></span>`}
      <span class="ico">${_o[i.icon]??i.icon}</span>
      ${l?X`<span class="kx"><span class="kl">${c}</span><span class="ks">${l}</span></span>`:X`<span class="kl">${i.label}</span>`}
    </button>`}renderScreen(e,t,n,r){let i=r.deviceState(e.id),a=(e,t=1)=>typeof e==`number`?new Intl.NumberFormat(this.tr.lang??`en`,{minimumFractionDigits:t,maximumFractionDigits:t}).format(e):`–`,o=typeof i.mode==`number`?i.mode:null,s=Number(i.valuePct??0),c=s>0||i.switchOn===!0;return X`<div
      class="screen"
      style="top:${t.top-n}px;height:${t.h}px"
      title="${e.name} · ${o===null?``:se(o,this.tr)} · ${this.tr`setpoint`} ${a(i.setpointC)} °C${c?` · ${i.heating===!1?this.tr`cooling`:this.tr`heating`} ${Math.round(s)} %`:``}"
    >
      <b>${a(i.measuredC)}<small>°C</small></b>
      <span
        >${o===null?``:pe(`20.102`,o)}
        ${a(i.setpointC)}${c?X`<i class=${i.heating===!1?`cool`:``}
                >${i.heating===!1?this.tr`cool`:this.tr`heat`}</i
              >`:Q}</span
      >
    </div>`}renderNumber(e,t,n,r){let i=e.inputs.find(e=>e.id===t.id),a=`${e.id}/${i.id}`,o=e.objects.find(e=>e.id===i.object),s=r.objectValue(e.id,i.object),c=Math.min(3,(String(i.step).split(`.`)[1]??``).length),l=this.drafts.get(a)??(s===null?``:String(Number(s.toFixed(c)))),u=t=>{t.stopPropagation();let n=t.currentTarget.closest(`.numin`).querySelector(`input`);this.submitNumber(e,i,n.value)};return X`<div
      class="numin"
      style="top:${t.top-n}px;height:${t.h}px"
      title="${i.label} → ${o?.gas[0]??`—`} (${i.min}…${i.max})"
      @click=${e=>e.stopPropagation()}
    >
      <label>${i.label}</label>
      <div>
        <input
          type="number"
          inputmode="decimal"
          min=${i.min}
          max=${i.max}
          step=${i.step}
          .value=${l}
          aria-label=${i.label}
          @input=${e=>this.drafts.set(a,e.target.value)}
          @keydown=${e=>{e.stopPropagation(),e.key===`Enter`&&!e.repeat&&u(e)}}
        /><button title=${this.tr`Send value`} @click=${u}>↵</button>
      </div>
    </div>`}renderLoad(e,t,n){let r=e.channels.find(e=>e.id===t.channel),i=to(t.view),a=n.equipmentState(e.id,r.id)??{},o=n.channelState(e.id,r.id),s=[o.forced?o.forced===`on`?this.tr`forced on`:this.tr`forced off`:``,typeof o.offAtMs==`number`?this.tr`off in ${Math.max(0,(o.offAtMs-n.timeMs)/1e3).toFixed(0)} s`:``,o.shed?this.tr`shed`:``,e.objects.some(e=>e.channel===r.id&&(e.port===`power`||e.port===`energy`))?`${Math.round(Number(o.powerW??0))} W`:``].filter(Boolean),c=s.length?s.join(` · `):void 0,l={x:t.x,y:t.top,width:t.w,height:t.h},u=i?this.safeRender(n,e,r.id,t.view,()=>i.render({state:a,label:r.label,box:l,note:c,t:this.tr,parameters:r.equipmentConfig?.parameters??{},act:(t,i)=>{n.equipmentAction(e.id,r.id,t,i??null)&&this.afterInput()}}),l):X`<div
          class="loadlbl"
          style="position:absolute;left:${t.x}px;top:${t.top}px"
        >
          ${r.label} · ${this.tr`view “${t.view}” missing`}
        </div>`,d=o.estimatedPositionPct,f=n.output(e.id,r.id);return X`${u}${typeof d==`number`?X`<div
            class="est"
            style="left:${t.x}px;top:${t.top+(t.view===`venetianBlind`?132:118)}px"
          >
            <span
              title="${this.tr`Position estimated by the actuator (${d.toFixed(1)} %)`}"
              >${this.tr`Estimated`} <b>${So(d)}</b></span
            >
            ${t.view===`venetianBlind`&&typeof o.estimatedSlatPct==`number`?X`<span
                    title="${this.tr`Slat angle estimated by the actuator (${o.estimatedSlatPct.toFixed(1)} %)`}"
                    >${this.tr`Slats est.`}
                    <b>${So(o.estimatedSlatPct)}</b></span
                  >`:Q}
            <span title=${this.tr`Motor command applied by the actuator`}
              >${this.tr`Motor`}
              <b
                class=${f?.type===`motor`&&f.direction!==`stop`?`mv`:``}
                >${f?.type===`motor`?f.direction===`down`?`▼`:f.direction===`up`?`▲`:`■`:`—`}</b
              ></span
            >
          </div>`:Q}`}safeRender(e,t,n,r,i,a){try{return i()}catch(i){let o=String(i?.message??i);return e.reportOnce(`view:${t.id}/${n}`,{code:`view-error`,message:this.tr`view “${r}” (${t.id}/${n}): ${o}`,deviceId:t.id,extension:r}),X`<div
        class="viewfault"
        style="left:${a.x}px;top:${a.y}px;width:${a.width}px;min-height:${Math.min(a.height,40)}px"
        title=${o}
      >
        ${this.tr`view “${r}” failed`}
      </div>`}}renderCoupler(e,t,n,r){let i=t.network.coupler(e.id),a=t.network.isRepeater(i),o=a?$.rep:$.cpl,s=a?$.repSoft:$.cplSoft,c=0;n.forEach(t=>t.plan.couplers.forEach(t=>t.couplerId===e.id&&r>=t.tInMs&&(c=Math.max(c,ho(r,t.tInMs,t.tDecisionMs,200,350)))));let l=t.network.filterTable(i),u=this.info===`cpl:`+e.id;return X`<div
        class="coupler"
        style="left:${e.c[0]-e.w/2}px;top:${e.c[1]-e.h/2}px;width:${e.w}px;height:${e.h}px;border-color:${o};background:${s};border-radius:${e.kind===`router`?28:9}px;transform:scale(${1+.06*c});box-shadow:0 0 0 ${9*c}px ${po(o,.18)}${u?`, 0 0 0 3px ${po($.cpl,.4)}`:``}"
        @click=${t=>{t.stopPropagation(),this.info=u?null:`cpl:`+e.id,this.requestUpdate()}}
      >
        <b style="color:${o}">${t.network.couplerName(i)}</b
        ><span>${e.address}</span>
      </div>
      ${this.showTables?X`<div
              class="chip"
              style="left:${e.c[0]}px;top:${e.c[1]+e.h/2+6}px;border:1px dashed ${o};color:${o}"
            >
              ${l?l.length?this.tr`table: ${l.join(` · `)}`:this.tr`table: empty`:this.tr`no filtering`}
            </div>`:Q}`}renderTags(e,t,n){let r=new Map;return t.forEach(e=>e.plan.couplers.forEach(t=>n>=t.tInMs&&(!r.has(t.couplerId)||t.tInMs>r.get(t.couplerId).e.tInMs)&&r.set(t.couplerId,{e:t,ga:e.ga}))),[...r.values()].map(({e:t,ga:r})=>{let i=ho(n,t.tInMs,t.tDecisionMs+1100);if(i<=0)return Q;let a=e.couplers.find(e=>e.id===t.couplerId),o=t.tag===`block`,s=o?$.red:t.tag===`rep`?$.rep:$.cpl,c=n>=t.tDecisionMs?o?`${r} · ✕ ${this.tr`filtered`}`:X`${r} ·
              ${t.tag===`rep`?this.tr`repeated`:this.tr`forwarded`} · RC
              ${t.rcBefore}→<b>${t.rcAfter}</b>`:`${r} · ${this.tr`checking…`}`;return X`<div
        class="tag"
        style="left:${Math.min(Math.max(a.c[0],114),e.W-114)}px;top:${a.c[1]-a.h/2-8}px;opacity:${i};border:1.5px solid ${s};color:${s}"
      >
        ${c}
      </div>`})}renderPill(e,t){let n=e.kind===`state`,r=$.tg,i=this.selId===e.id;return X`<div
      class="pill"
      style="left:${t.p[0]}px;top:${t.p[1]}px;transform:translate(-50%,-50%) scale(${t.small?.85:1});opacity:${Math.max(0,Math.min(1,t.o))};background:${n?`#fff`:r};border:2.5px solid ${r};color:${n?r:`#fff`};box-shadow:${i?`0 0 0 3px ${po($.amber,.8)}, `:``}0 0 14px 3px ${po($.tg,.3)}"
      @click=${t=>{t.stopPropagation(),this.selId=e.id,this.requestUpdate()}}
    >
      ${n?X`<i></i>`:Q}${e.ga}<em
        >${e.service===`GroupValueRead`?`?`:`= ${pe(e.dpt,e.value)}`}</em
      >
    </div>`}longMs(e){let t=this.model?.devicesById.get(e)?.parameters.longPressMs;return typeof t==`number`?t:500}renderHold(e,t){let n=this.hold;if(!n||!n.hasLong)return Q;let r=e.devicesById.get(n.dev),i=t.devices.get(n.dev).plate,a=Math.min(1,(performance.now()-n.start)/this.longMs(n.dev)),o=r.buttons.find(e=>e.id===n.button),s=r.objects.find(e=>e.id===o.long?.object)?.gas[0],c=i.x,l=i.top+i.h+8;return X`<div
        class="holdbar"
        style="left:${c}px;top:${l}px;width:${104}px"
      >
        <div
          style="width:${a*100}%;background:${a>=1?$.tg:$.amber}"
        ></div>
      </div>
      <div
        class="holdtxt"
        style="left:${c}px;top:${l+10}px;color:${n.fired?$.tg:`#9a6a00`}"
      >
        ${n.fired?this.tr`Long press → ${s}`:this.tr`Hold for a long press…`}
      </div>`}devLabel(e,t){let n=t?e.devicesById.get(t):void 0;return n?n.address||n.name:`?`}objName(e,t,n){return e.devicesById.get(t??``)?.objects.find(e=>e.id===n)?.name??n??``}explain(e,t,n){let r=this.devLabel(t,e.deviceId),i=e.telegramId===void 0?void 0:n.telegram(e.telegramId),a=i?pe(i.dpt,i.value):``,o=this.tr,s=this.objName(t,e.deviceId,e.objectId);switch(e.kind){case`telegram-emitted`:return i?.service===`GroupValueRead`?X`<b>${r}</b>
            ${o`requests the value of ${e.ga} (read).`}`:i?.service===`GroupValueResponse`?X`<b>${r}</b>
            ${o`responds ${e.ga} = ${a} (object “${s}”, R flag).`}`:s?X`<b>${r}</b>
          ${o`sends ${e.ga} = ${a} (object “${s}”).`}`:X`<b>${r}</b>
            ${o`sends ${e.ga} = ${a} (write from the USB interface).`}`;case`coupler-decision`:{let t=n.network.coupler(e.couplerId??``),r=e.data,i=r.tag===`block`?o`filtered, the telegram stops here`:r.tag===`rep`?o`repeated, RC ${r.rcBefore}→${r.rcAfter}`:o`forwarded, RC ${r.rcBefore}→${r.rcAfter}`;return X`<b>${t?n.network.couplerName(t):``} ${t?.address}</b>
          ${o`checks its table: ${e.ga} ${i}.`}`}case`object-write-accepted`:return X`<b>${r}</b> ${e.data?.internal?o`receives ${e.ga}: object “${s}” takes the value ${a} (internal link).`:o`receives ${e.ga}: object “${s}” takes the value ${a}.`}`;case`object-write-ignored`:return X`<b>${r}</b>
          ${o`receives ${e.ga} but object “${s}” ignores it: W flag disabled.`}`;case`output-changed`:return X`<b>${r}</b> ·
          ${t.devicesById.get(e.deviceId??``)?.channels.find(t=>t.id===e.channelId)?.label??e.channelId}
          : ${e.message}.`;case`timer-fired`:return X`<b>${r}</b> : ${o`${e.message} reached.`}`;default:return e.message??e.kind}}stopText(e,t,n){let r=[`output-changed`,`object-write-ignored`,`object-write-accepted`,`coupler-decision`,`telegram-emitted`,`timer-fired`],i=[...e.events].sort((e,t)=>r.indexOf(e.kind)-r.indexOf(t.kind))[0],a=e.events.length-1;return X`${this.explain(i,t,n)}${a>0?X` <small class="more">${a>1?this.tr`(+${a} details)`:this.tr`(+${a} detail)`}</small>`:Q}`}renderInfo(e,t,n){if(!this.info)return Q;let r=()=>(this.info=null,this.requestUpdate()),[i,a]=this.info.split(`:`);if(i===`cpl`){let e=t.couplers.find(e=>e.id===a),i=n.network.coupler(a);if(!e||!i)return Q;let o=e.kind===`extension`?n.network.isRepeater(i)?`repeater`:`segmentCoupler`:e.kind,s=n.network.filterTable(i);return X`<div class="info" @click=${e=>e.stopPropagation()}>
        <h3>
          ${n.network.couplerName(i)} ${e.address}<span @click=${r}
            >×</span
          >
        </h3>
        <div>${vo(o,this.tr)}</div>
        ${s?X`<div style="margin-top:6px;font-family:var(--mono);font-size:12.5px">${this.tr`Filter table:`} ${s.length?s.join(` · `):this.tr`empty`}</div>`:Q}
      </div>`}let o=e.devicesById.get(a);return o?X`<div class="info" @click=${e=>e.stopPropagation()}>
      <h3>${o.name} ${o.address}<span @click=${r}>×</span></h3>
      ${o.description?X`<div>${o.description}</div>`:Q}
      <div class="behavior">
        ${this.tr`Behavior`} <code>${o.behavior}</code>
      </div>
      <table>
        <tr>
          <th>${this.tr`Object`}</th>
          <th>GA</th>
          <th>DPT</th>
          <th title=${this.tr`W: accepts writes · T: may transmit`}>W T</th>
          <th>${this.tr`Value`}</th>
        </tr>
        ${o.objects.map(e=>X`<tr>
              <td>${e.name}</td>
              <td class="m">${e.gas.join(`, `)||`—`}</td>
              <td class="m" title=${M(e.dpt,this.tr)}>${e.dpt}</td>
              <td class="m flags">
                <span
                  class=${e.flags.W?`on`:``}
                  title=${e.flags.W?this.tr`W: accepts received writes`:this.tr`W: ignores received writes`}
                  >W</span
                ><span
                  class=${e.flags.T?`on`:``}
                  title=${e.flags.T?this.tr`T: may transmit`:this.tr`T: does not transmit`}
                  >T</span
                >
              </td>
              <td class="m">
                ${me(e.dpt,n.objectValue(o.id,e.id),this.tr)}
              </td>
            </tr>`)}
      </table>
      ${o.channels.length?X`<details open>
              <summary>${this.tr`Channels (${o.channels.length})`}</summary>
              ${this.renderChannels(o,n)}
            </details>`:Q}
    </div>`:Q}renderChannels(e,t){return X`<table class="chans">
      ${e.channels.map(n=>{let r=t.channelState(e.id,n.id),i=t.equipmentState(e.id,n.id),a=t.output(e.id,n.id),o=[];return typeof r.estimatedPositionPct==`number`?(o.push([this.tr`Estimated position`,me(`5.001`,r.estimatedPositionPct,this.tr)]),o.push([this.tr`Actual position`,i?me(`5.001`,Number(i.positionPct),this.tr):this.tr`no shutter connected`]),o.push([this.tr`Motor command`,a?Dr(a,this.tr):`—`]),o.push([this.tr`Phase`,String(r.phase)]),i?.limit&&o.push([this.tr`End stop`,i.limit===`top`?this.tr`top`:this.tr`bottom`]),o.push([this.tr`Configured travel time`,`${Number(n.parameters.estimatedTravelTimeMs)/1e3} s`]),n.equipmentConfig&&o.push([this.tr`Actual travel time`,`${Number(n.equipmentConfig.parameters.actualTravelTimeMs)/1e3} s`])):(o.push([this.tr`Output`,a?Dr(a,this.tr):`—`]),r.forced&&o.push([this.tr`Forcing`,`${r.forced===`on`?this.tr`forced on`:this.tr`forced off`} · ${this.tr`stored command:`} ${r.commanded?this.tr`on`:this.tr`off`}`]),typeof r.offAtMs==`number`&&o.push([this.tr`Timer`,this.tr`switching off in ${((r.offAtMs-t.timeMs)/1e3).toFixed(1)} s`]),i&&`on`in i&&o.push([this.tr`Equipment`,i.on?this.tr`on`:this.tr`off`])),X`<tr class="head">
            <td colspan="2">
              ${n.label}<small
                >${n.equipment?n.equipment:this.tr`unused`}</small
              >
            </td>
          </tr>
          ${o.map(([e,t])=>X`<tr>
                <td>${e}</td>
                <td class="m">${t}</td>
              </tr>`)}`})}
    </table>`}clock(e){let t=36e3+e/1e3,n=Math.floor(t/3600),r=Math.floor(t%3600/60),i=(t%60).toFixed(1).padStart(4,`0`);return`${n}:${String(r).padStart(2,`0`)}:${i}`}rawText(e){let t=N(e.dpt);return t===32||t===24?`0x${(e.raw>>>0).toString(16).toUpperCase().padStart(t/4,`0`)}`:t===16?`0x${si(e.raw>>8)}${si(e.raw&255)}`:t===8?`0x${si(e.raw)}`:String(e.raw)}setClock(e){let t=this.sim,n=Or(e);if(!t||n===null)return[];let r=t.setClock(n);return this.afterInput(),r}renderClock(e){let t=e.clock();if(!t)return Q;let n=new Date(t.nowMs),r=new Intl.DateTimeFormat(this.language,{weekday:`short`,day:`numeric`,month:`short`,year:`numeric`,timeZone:`UTC`}).format(n),i=new Intl.DateTimeFormat(this.language,{hour:`2-digit`,minute:`2-digit`,second:`2-digit`,hourCycle:`h23`,timeZone:`UTC`}).format(n),a=n.toISOString().slice(0,19);return X`<div class="clock" @click=${e=>e.stopPropagation()}>
      <span title=${this.tr`Simulated clock (×${t.speed})`}
        >${r} · <b>${i}</b></span
      >
      ${this.clockEdit?X`<input
                type="datetime-local"
                step="1"
                aria-label=${this.tr`Clock time`}
                .value=${a}
                @keydown=${e=>{e.stopPropagation(),e.key===`Enter`&&e.currentTarget.nextElementSibling?.dispatchEvent(new Event(`click`))}}
              /><button
                class="btn"
                @click=${e=>{let t=e.currentTarget.previousElementSibling;this.clockEdit=!1,this.setClock(t.value)}}
              >
                ${this.tr`Set`}
              </button>`:X`<button
              class="btn"
              title=${this.tr`Set the simulated clock`}
              @click=${()=>{this.clockEdit=!0,this.requestUpdate()}}
            >
              ${this.tr`Set time`}
            </button>`}
    </div>`}roomAction(e,t,n){let r=this.sim;if(!r)return[];let i=r.roomAction(e,t,n);return this.afterInput(),i}renderRooms(e,t){let n=e=>new Intl.NumberFormat(this.tr.lang??`en`,{minimumFractionDigits:1,maximumFractionDigits:1}).format(e);return X`<div
      class="panel rooms"
      @click=${e=>e.stopPropagation()}
    >
      <header>
        <span class="cap">${this.tr`Rooms`}</span>
        <span class="hint"
          >${this.tr`physical quantities; thermal time compressed`}</span
        >
      </header>
      <div class="room-list">
        ${e.rooms.map(r=>{let i=t.room(r.id),a=e.devices.filter(e=>e.room===r.id).map(e=>({d:e,ds:t.deviceState(e.id)})).filter(e=>typeof e.ds.setpointC==`number`),o=e.devices.flatMap(e=>e.channels.filter(e=>e.equipmentConfig?.room===r.id).map(n=>({d:e,c:n,open:Number(t.equipmentState(e.id,n.id)?.openPct??0)})));return X`<div class="room ${i.windowOpen?`open`:``}">
            <div class="room-head">
              <b title=${r.name}>${r.name}</b>
              <span class="room-t" data-room=${r.id}
                >${n(i.temperatureC)} °C</span
              >
            </div>
            ${a.map(({d:e,ds:t})=>X`<div class="room-line" title=${e.name}>
                  <span>${e.name}</span>
                  <b
                    >${se(Number(t.mode),this.tr)} ·
                    ${n(Number(t.setpointC))} °C</b
                  >
                </div>`)}
            ${o.map(e=>X`<div class="room-line">
                  <span>${e.c.label}</span>
                  <span class="room-bar"><i style="width:${e.open}%"></i></span
                  ><b>${Math.round(e.open)} %</b>
                </div>`)}
            <div class="room-ctl">
              <button
                class="btn ${i.windowOpen?`primary`:``}"
                aria-pressed=${i.windowOpen?`true`:`false`}
                @click=${()=>this.roomAction(r.id,`window`,+!i.windowOpen)}
              >
                ${i.windowOpen?this.tr`Close window`:this.tr`Open window`}
              </button>
              <span class="room-out"
                >${this.tr`Out.`}
                <button
                  class="btn"
                  aria-label=${this.tr`Lower outside temperature`}
                  @click=${()=>this.roomAction(r.id,`outside`,i.outsideTemperatureC-5)}
                >
                  −</button
                ><b>${n(i.outsideTemperatureC)} °C</b
                ><button
                  class="btn"
                  aria-label=${this.tr`Raise outside temperature`}
                  @click=${()=>this.roomAction(r.id,`outside`,i.outsideTemperatureC+5)}
                >
                  +
                </button></span
              >
            </div>
          </div>`})}
      </div>
    </div>`}renderUsbPanel(e,t){let n=this.interfaces(),r=n.find(e=>e.id===this.usbPanel.dev)??n[0],i=[...new Set([...e.groupAddresses.keys(),...e.devices.flatMap(e=>e.objects.flatMap(e=>e.gas))])].sort((e,t)=>e.localeCompare(t,`en`,{numeric:!0})),a=i.includes(this.usbPanel.ga)?this.usbPanel.ga:i[0]??``,o=a?t.gaDpt(a):`1.001`,s=N(o),c=s===1?[0,1]:s===2?[0,1,2,3]:o===`17.001`?Array.from({length:64},(e,t)=>t):o===`20.102`?[0,1,2,3,4]:null,l=Number(this.usbPanel.value.replace(`,`,`.`)),u=this.usbPanel.value.trim()===``?this.tr`finite number expected`:re(o,l,this.tr),d=u===null,f=this.usbPanel.read,p=f?t.history.filter(e=>e.id>f.id&&e.ga===f.ga&&e.service===`GroupValueResponse`):[],m=f?t.telegram(f.id):void 0,h=!!f&&!p.length&&(!m||t.timeMs<m.plan.endMs+1500);return X`<div
      class="panel usb"
      @click=${e=>e.stopPropagation()}
    >
      <header>
        <span class="cap">${this.tr`Tools`}</span>
        <span class="hint"
          >${this.tr`USB interface`}
          ${n.length>1?X`<select
                  @change=${e=>{this.usbPanel.dev=e.target.value,this.requestUpdate()}}
                >
                  ${n.map(e=>X`<option value=${e.id} ?selected=${e===r}>${e.address} · ${e.name}</option>`)}
                </select>`:X`<b>${r.address}</b> · ${r.name}`}</span
        >
      </header>
      <div class="usb-row">
        <label
          >${this.tr`Group address`}
          <select
            @change=${e=>{this.usbPanel.ga=e.target.value,this.requestUpdate()}}
          >
            ${i.map(t=>X`<option value=${t} ?selected=${t===a}>${t} ${ai(e,t)}</option>`)}
          </select></label
        >
        <label
          >${this.tr`Value`} <small>${M(o,this.tr)}</small> ${c?X`<select
                  @change=${e=>{this.usbPanel.value=e.target.value,this.requestUpdate()}}
                >
                  ${c.map(e=>X`<option value=${e} ?selected=${e===l}>${I(o,e,this.tr)}</option>`)}
                </select>`:X`<input
                  inputmode="decimal"
                  .value=${this.usbPanel.value}
                  @input=${e=>{this.usbPanel.value=e.target.value,this.requestUpdate()}}
                />`}</label
        >
        <button
          class="btn primary"
          ?disabled=${!a||!d}
          @click=${()=>this.groupWrite(a,l,r.id)}
        >
          ${this.tr`Write`}
        </button>
        <button
          class="btn"
          ?disabled=${!a}
          @click=${()=>this.groupRead(a,r.id)}
        >
          ${this.tr`Read`}
        </button>
      </div>
      <div class="usb-out">
        ${u&&a?X`<div class="usb-bad" role="alert">${u}</div>`:Q}
        ${f?p.length?p.map(t=>X`<div>
                      ${this.tr`Response from`} <b>${t.sourceAddress}</b>
                      (${e.devicesById.get(t.sourceDeviceId)?.name}) :
                      <b>${I(t.dpt,t.value,this.tr)}</b>
                    </div>`):h?this.tr`Reading ${f.ga}…`:this.tr`No response for ${f.ga}: no associated object has the R flag, or a coupler filtered the read or the response.`:this.tr`Write sends a GroupValueWrite; Read sends a GroupValueRead: each associated object with the R flag responds, on its own sending address.`}
      </div>
    </div>`}renderEnlargedMonitor(e,t,n){let r=()=>{this.monitorExpanded=!1,this.requestUpdate()};return X`<dialog
      class="enlarged"
      aria-label=${this.tr`Group monitor`}
      @close=${r}
      @click=${e=>{e.stopPropagation(),e.target===e.currentTarget&&r()}}
      @keydown=${e=>e.stopPropagation()}
    >
      ${this.renderMonitor(e,n,!0)} ${this.renderDetail(e,t,n)}
    </dialog>`}renderMonitor(e,t,n=!1){let r=this.selected(t),i=t.history;return X`<div class="panel">
      <header>
        <span class="cap">${this.tr`Group monitor`}</span>
        <span class="hint"
          >${i.length>1?this.tr`${i.length} telegrams`:this.tr`${i.length} telegram`}
          · t = ${(t.timeMs/1e3).toFixed(1)} s ·
          ${this.tr`click to inspect`}</span
        >
        ${n?X`<button
                class="btn close"
                title=${this.tr`Close`}
                aria-label=${this.tr`Close`}
                @click=${e=>{e.stopPropagation(),this.monitorExpanded=!1,this.requestUpdate()}}
              >
                ✕
              </button>`:X`<button
                class="btn enlarge"
                title=${this.tr`Enlarge the monitor`}
                aria-label=${this.tr`Enlarge the monitor`}
                @click=${e=>{e.stopPropagation(),this.monitorExpanded=!0,this.requestUpdate()}}
              >
                ${X`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>`}
              </button>`}
      </header>
      <div class="mon">
        ${i.length?X`<table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${this.tr`Time`}</th>
                    <th>${this.tr`Source`}</th>
                    <th>${this.tr`Destination`}</th>
                    <th class="opt">${this.tr`Type`}</th>
                    <th class="opt">DPT</th>
                    <th>${this.tr`Value`}</th>
                  </tr>
                </thead>
                <tbody>
                  ${i.map(t=>X`<tr
                        class="${t===r?`sel`:``} ${t.kind===`state`?`state`:``}"
                        @click=${()=>{this.selId=t.id,this.requestUpdate()}}
                      >
                        <td>${t.id}</td>
                        <td>${this.clock(t.timeMs)}</td>
                        <td>
                          ${t.sourceAddress||`IP`}<small
                            >${e.devicesById.get(t.sourceDeviceId)?.name}</small
                          >
                        </td>
                        <td>${t.ga}<small>${ai(e,t.ga)}</small></td>
                        <td class="opt">${t.service}</td>
                        <td class="opt">${t.dpt}</td>
                        <td>
                          ${t.service===`GroupValueRead`?X`<small>${this.tr`read`}</small>`:X`${this.rawText(t)}<small
                                    >${I(t.dpt,t.value,this.tr)}${t.service===`GroupValueResponse`?` · ${this.tr`response`}`:``}</small
                                  >`}
                        </td>
                      </tr>`)}
                </tbody>
              </table>`:X`<div class="empty">
                ${this.tr`No telegram yet. Press a push-button key.`}
              </div>`}
      </div>
    </div>`}selected(e){return(this.selId===null?void 0:e.telegram(this.selId))??e.history[e.history.length-1]}causeText(e,t,n){let r=n.journal.find(t=>t.id===e.causeId),i=this.tr;return r?r.kind===`input`?i`gesture ${String(r.data?.inputId??``)} · ${String(r.data?.gesture??``)}`:r.kind===`timer-fired`?i`timer ${String(r.data?.key??``)} of ${this.devLabel(t,r.deviceId)}`:r.kind===`object-write-accepted`?i`reception on “${this.objName(t,r.deviceId,r.objectId)}” (${r.ga})`:r.kind:e.kind===`state`?i`automatic transmission`:`—`}renderDetail(e,t,n){let r=this.selected(n);if(!r)return X`<div class="panel">
        <header><span class="cap">${this.tr`Telegram`}</span></header>
        <div class="empty">
          ${this.tr`Details of the last telegram (fields, bytes, couplers crossed, target objects) will appear here.`}
        </div>
      </div>`;let i=n.timeMs,a=oi(r.sourceAddress||`0.0.0`,r.ga,r.value,r.dpt,6,this.tr,r.service),o=r.service===`GroupValueRead`,s=[$.mute,$.bus,$.tg,$.cpl,$.amber,$.mute],c=r.plan.couplers.filter(e=>i>=e.tDecisionMs),l=r.receptions.filter(e=>e.objects.length),u=r.receptions.filter(e=>!e.objects.length&&!e.internal),d=i<r.plan.endMs;return X`<div class="panel">
      <header>
        <span class="cap">${this.tr`Telegram`} #${r.id}</span>
        <span
          class="badge"
          style="background:${r.kind===`cmd`?$.tg:`#fff`};color:${r.kind===`cmd`?`#fff`:$.tg}"
          >${r.kind===`state`?X`<i style="width:7px;height:7px;border-radius:4px;background:${$.amber};display:inline-block"></i>`:Q}${o?this.tr`Read`:r.service===`GroupValueResponse`?this.tr`Response`:r.kind===`cmd`?this.tr`Command`:this.tr`Status feedback`}</span
        >
      </header>
      <div class="kv-row">
        <span>${this.tr`Source`}</span
        ><b
          >${r.sourceAddress||`IP`}<small
            >${this.tr`individual addr.`} ·
            ${e.devicesById.get(r.sourceDeviceId)?.name}</small
          ></b
        >
      </div>
      <div class="kv-row">
        <span>${this.tr`Destination`}</span
        ><b
          >${r.ga}<small
            >${this.tr`group addr.`}${ai(e,r.ga)?` · `+ai(e,r.ga):``}</small
          ></b
        >
      </div>
      <div class="kv-row">
        <span>${this.tr`Service`}</span><b>${r.service}</b>
      </div>
      <div class="kv-row">
        <span>${this.tr`Value`}</span>${o?X`<b
                >—<small
                  >${this.tr`a read carries no value: each associated object with the R flag responds, on its own sending address`}</small
                ></b
              >`:X`<b
                >${this.rawText(r)}<small
                  >${me(r.dpt,r.value,this.tr)} ·
                  ${this.tr`${I(r.dpt,r.value,this.tr)} according to ${M(r.dpt,this.tr)}`}</small
                ></b
              >`}
      </div>
      <div class="kv-row">
        <span>${this.tr`Cause`}</span
        ><b class="cause">${this.causeText(r,e,n)}</b>
      </div>
      <div class="frame">
        ${a.map((e,t)=>X`<div
              style="border-color:${s[t]};color:${s[t]}"
              title="${e.label} : ${e.hint}"
            >
              ${e.bytes.map(si).join(` `)}
            </div>`)}
      </div>
      <div class="hint">
        ${this.tr`TP1 frame: control · source · destination · type/RC/length · APCI+data · checksum. The DPT is not transmitted: only the devices know it.`}
      </div>
      ${r.plan.couplers.length?X`<div class="sep">
              <b>${this.tr`Couplers`}</b
              >${d?X` <span style="color:${$.tg}">· ${this.tr`in progress`}</span>`:Q}
              ${c.map(e=>{let t=n.network.coupler(e.couplerId),r=e.tag===`block`?$.red:e.tag===`rep`?$.rep:$.cpl;return X`<div class="line">
                  <span>${n.network.couplerName(t)} ${t.address}</span>
                  <span
                    style="font-family:var(--mono);color:${r};font-weight:600"
                    >${e.tag===`block`?`✕ ${this.tr`filtered`}`:(e.tag===`rep`?this.tr`repeated`:this.tr`forwarded`)+` · RC ${e.rcBefore}→${e.rcAfter}`}</span
                  >
                </div>`})}
            </div>`:Q}
      <div class="sep">
        <b>${this.tr`Objects linked to ${r.ga}`}</b>
        ${l.length?l.map(t=>{let n=e.devicesById.get(t.deviceId);return t.objects.map(r=>{let i=r.result===`accepted`;return X`<div class="line">
                    <span
                      ><b style="font-family:var(--mono)"
                        >${n.address||n.name}</b
                      >
                      ·
                      ${this.objName(e,n.id,r.objectId)}${t.internal?X` <small>${this.tr`(internal link)`}</small>`:Q}</span
                    >
                    <span
                      style="color:${i?$.bus:$.red};font-weight:600"
                      title=${i?this.tr`write accepted`:this.tr`W flag disabled: value and behavior unchanged`}
                      >${i?this.tr`received`:this.tr`ignored (W)`}</span
                    >
                  </div>`})}):X`<div class="hint">
                ${d?this.tr`The telegram is travelling on the bus…`:this.tr`No other device listens to this address.`}
              </div>`}
        ${u.length?X`<div class="hint">
                ${this.tr`Reached without association:`}
                ${u.map(t=>this.devLabel(e,t.deviceId)).join(`, `)}
              </div>`:Q}
      </div>
    </div>`}};S(Co,`styles`,mo),S(Co,`properties`,{scenario:{type:String},src:{type:String},options:{attribute:!1},toolbar:{type:String},monitor:{type:String},description:{type:String},hints:{type:String},fit:{type:String},maxScaleAttr:{type:String,attribute:`max-scale`},minScaleAttr:{type:String,attribute:`min-scale`},speedAttr:{type:String,attribute:`speed`},stepModeAttr:{type:String,attribute:`step-mode`}});function wo(e,t,n){let r=typeof e==`string`?document.querySelector(e):e;if(!r)throw Error(s(document.documentElement.lang||`en`)`BusDiagram.create: element ${String(e)} not found`);let i;return r instanceof Co?i=r:(i=document.createElement(`bus-diagram`),r.appendChild(i)),n&&(i.options={...i.options??{},...n}),typeof t==`string`?t.startsWith(`#`)?i.scenario=t:i.src=t:t!==void 0&&i.load(t),i}if(customElements.get(`bus-diagram`)||customElements.define(`bus-diagram`,Co),typeof document<`u`&&!document.getElementById(`bus-diagram-style`)){let e=document.createElement(`style`);e.id=`bus-diagram-style`,e.textContent=`bus-diagram:not(:defined){display:none}bus-diagram{display:block}`,document.head.appendChild(e)}return e.BusDiagram=Co,e.DEFAULT_OPTIONS=oo,e.LONG_MS=xr,e.Network=be,e.OPTION_DOCS=so,e.RC0=ye,e.SUPPORTED_DPTS=j,e.ScenarioError=kr,e.Simulation=Er,e.TICK_MS=yr,e.TIMING=ve,e.availableLanguages=i,e.behaviorIds=_r,e.buildFrame=oi,e.buildScenario=ei,e.buildTopology=_e,e.canonical=ce,e.captureRegistry=gr,e.checkValue=re,e.configWarnings=v,e.create=wo,e.createSimulator=fi,e.decode=ie,e.describeCommand=Dr,e.dptInfo=ee,e.dptName=M,e.encode=F,e.equipmentIds=vr,e.equipmentView=to,e.formatValue=I,e.gaName=ai,e.hex=si,e.html=X,e.layout=Va,e.nothing=Q,e.registerBehavior=K,e.registerEquipment=hr,e.registerEquipmentView=eo,e.registerMessages=r,e.svg=Z,e.toV2=ui,e.translator=s,e.validateParams=at,e.version=di,e})({});