---
title: Modèle et limites
translationOf: guide/15-limits.md
sourceHash: "8e364e8ffa82"
order: 15
---
# Modèle et limites

BusDiagram est un outil de conception de schémas ; sa couche de simulation sert à illustrer les schémas et fait les choix suivants. Ils décrivent le modèle logiciel et ne doivent pas être pris pour une description complète d'une installation KNX physique.

- **Cadence :** la propagation est ralentie pour l'observation ; elle ne reproduit pas la cadence réelle d'un bus à paire torsadée.
- **Services de groupe :** `GroupValueWrite`, `GroupValueRead` et `GroupValueResponse` sont modélisés. Les télégrammes de programmation à adresse individuelle sont hors du modèle.
- **Échange TP :** la vue des trames montre une trame de données de groupe, avec la priorité de l'objet émetteur (low par défaut ; la couche liaison de données KNX donne normal par défaut pour les trames courtes, et la priorité est un réglage de chaque objet). L'arbitrage du bus, l'ordonnancement par priorité, les acquittements TP (`ACK`, `NACK`, `BUSY`) et les répétitions automatiques sont hors du modèle ; les détails des télégrammes dessinent l'acquittement à titre d'illustration, et leur signal TP1 est schématique, pas une simulation électrique.
- **Indicateurs des objets :** C, R, W, T, U et I sont modélisés. La lecture à l'initialisation (I) s'exécute quand un appareil redémarre après une coupure de la tension bus, pas au démarrage de la simulation. Comme dans la couche application KNX, un seul objet par appareil répond à une lecture : le premier, dans l'ordre de ses objets, qui a l'indicateur R et une valeur connue ; la réponse est envoyée sur son adresse d'émission.
- **Associations internes :** quand un appareil émet, ses autres objets sur la même adresse de groupe prennent la valeur, comme le prévoit la couche application KNX ; leur indicateur W (U pour une réponse) décide seulement si l'appareil réagit.
- **Alimentations :** dessinées sur les lignes et segments qui en déclarent une ; un segment TP qui n'en a pas reçoit l'avertissement `config-no-power-supply`. Les lignes principales et la ligne de zone n'en reçoivent pas, et la charge du bus (consommation comparée au courant nominal) et la chute de tension ne sont pas calculées.
- **Topologie :** les lignes 0.1 à 0.15, reliées directement à la ligne de zone, sont permises en KNX mais non prises en charge ; les lignes appartiennent aux zones 1 à 15.
- **Coupleurs :** les tables de filtrage découlent des associations déclarées. Le compteur de routage part de 6 et diminue à chaque coupleur modélisé. Un répéteur ne filtre pas. Chaque ligne a au plus une extension (répéteur ou coupleur de segment), reliée à son segment principal ; voir [coupleurs et répéteurs](couplers.html).
- **KNXnet/IP :** le modèle route entre routeurs IP avec des tables de filtrage ; il ne modélise pas le tunneling qui contourne ces tables.
- **Superviseurs :** un superviseur ne lit pas automatiquement les états au démarrage. Il affiche des valeurs après avoir reçu des télégrammes ou des lectures de l'interface USB.
- **Volets :** l'actionneur estime la course sans capteur de position ; le volet raccordé se déplace à sa propre vitesse. Voir [volets](shutters.html).
- **Horloge :** l'horloge simulée n'a ni fuseau horaire ni changement d'heure ; le DPT 19.001 (date et heure avec indicateurs de qualité) n'est pas pris en charge. Voir l'[exemple de programme horaire](../examples/time-schedule.html) pour une horloge maître et un programmateur.
- **Retour d'état des relais :** il renvoie l'état commandé du relais, pas une tension secteur mesurée.
- **Scènes :** le rappel (DPT 17.001 et 18.001) et la mémorisation par le bit d'apprentissage (DPT 18.001) sont modélisés ; une scène mémorisée dure jusqu'au redémarrage de la simulation.
- **Tension bus :** une ligne ou un segment peut perdre sa tension bus depuis son alimentation sur le schéma ; les appareils s'arrêtent alors et appliquent leurs comportements à la coupure et au retour. Le comportement après un téléchargement de la configuration est hors du modèle, et la simulation démarre avec l'installation déjà en service, sans réaction au retour.
- **Interface de boutons-poussoirs :** les entrées de contact mesurent les appuis en temps simulé ; pendant la pause de la simulation, un appui ne peut pas devenir long. L'anti-rebond et la limitation du nombre de télégrammes ne sont pas modélisés ; le type de contact du bouton-poussoir (normalement ouvert ou fermé) et le contact attendu par l'entrée le sont.
- **DPT :** seuls les [types de données listés](../reference/dpt.html) sont simulés ; les appareils passifs et les afficheurs peuvent montrer d'autres DPT standard en octets bruts.
- **Autres systèmes :** une passerelle ne modélise que son côté KNX ; Modbus, BACnet et M-Bus ne sont pas simulés.
- **Panneau de l'interface USB :** les lectures et écritures de groupe sont modélisées, sans programmation ni téléchargement.
- **DALI :** la commande de groupe et la diffusion générale sont modélisées, sans mise en service DALI, commande de couleur ni éclairage de sécurité. Voir [DALI](dali.html#model-limits).
- **Avertissements de configuration :** les paramètres qui compensent une propriété de la charge (type de vanne, câblage du moteur, type de contact) sont comparés à cette propriété ; une discordance est simulée et affichée comme avertissement. Voir les [codes d'avertissement](../reference/errors.html#configuration-warnings).
- **Chauffage :** chaque pièce utilise une constante de temps thermique simplifiée, et la puissance de chauffage ou de refroidissement est supposée disponible. Les modes de fonctionnement utilisent un objet DPT 20.102 ; les objets de mode forcé et les objets de mode sur un bit ne sont pas modélisés. Le thermostat n'a pas de programme intégré ; un programmateur peut envoyer des télégrammes de mode. Un ventilo-convecteur a une batterie chaude, froide ou à changement de mode et un ventilateur à une seule vitesse : la commande de vitesse du ventilateur, les températures d'eau, le point de rosée et les passerelles de climatisation ne sont pas modélisés. Voir [CVC](hvac.html#model-limits).
- **Mesure :** la puissance vient de la puissance nominale de chaque charge, sans tolérance de mesure ni facteur de puissance ; l'énergie est comptée avec une échelle de temps (`energyTimeScale`).
- **Qualité de l'air :** les mesures sont saisies par le lecteur ; il n'y a pas de modèle de l'air ni de la ventilation.
- **Stores à lamelles :** les lamelles s'orientent avant chaque mouvement ; le rétablissement de l'angle des lamelles après un mouvement et les positions limites des lamelles ne sont pas modélisés.
- **Détecteur de présence :** la luminosité est saisie par le lecteur ; il n'y a ni modèle d'éclairement ni régulation à luminosité constante.
- **Station météo :** les mesures sont saisies par le lecteur ; il n'y a pas de modèle météorologique. Des seuils de vent, de luminosité et de gel et une alarme pluie avec délais sont fournis ; il n'y a pas de comparateurs génériques sur chaque mesure, pas de durées minimales de dépassement, ni de verrouillage par seuil.
- **Module logique :** ET, OU, OU exclusif et NON sur un bit, avec inversion de chaque entrée et du résultat, un objet de validation et une plage horaire quotidienne facultative ; pas de blocs de temporisation ni de comparaisons numériques.
- **Hors du périmètre :** BACnet, KNX Secure et le raccordement à un vrai bus.
