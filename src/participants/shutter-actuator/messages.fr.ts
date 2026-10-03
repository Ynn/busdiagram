// French texts of the shutter actuator: parameters, pages, and log messages.
export const shutterActuatorFr: Record<string, string> = {
  "{0} · {1}: the motor is wired in reverse and the actuator does not compensate it; the shutter moves opposite to the commands.":
    "{0} · {1} : le moteur est câblé à l'envers et l'actionneur ne le compense pas ; le volet se déplace à l'inverse des commandes.",
  "{0} · {1}: the actuator inverts its output, but the motor is wired normally; the shutter moves opposite to the commands.":
    "{0} · {1} : l'actionneur inverse sa sortie, mais le moteur est câblé normalement ; le volet se déplace à l'inverse des commandes.",
  "{0}: already moving to {1} %, command has no effect":
    "{0} : déjà en mouvement vers {1} %, commande sans effet",
  "{0}: shutter stopped, stop/step has no effect (no slats)":
    "{0} : volet à l'arrêt, arrêt/pas sans effet (pas de lamelles)",
  "{0}: no slats configured, slat command ignored":
    "{0} : aucune lamelle configurée, commande de lamelles ignorée",
  "{0}: wind alarm active, command ignored":
    "{0} : alarme vent active, commande ignorée",
  "{0}: stopped, bus voltage failure":
    "{0} : arrêt, coupure de la tension du bus",
  "Shutter actuator without sensor: position estimated from the configured travel time.":
    "Actionneur de volet sans capteur : estimation de position par le temps de course paramétré.",
  "Position setpoint": "Consigne de position",
  "Position feedback": "Retour de position",
  "Slat angle setpoint": "Consigne d'angle des lamelles",
  "Slat angle feedback": "Retour d'angle des lamelles",
  "Configured travel time up": "Durée de montée configurée",
  "Start delay": "Délai de départ",
  "Position feedback delay": "Délai du retour de position",
  "Configured slat rotation time": "Durée de rotation des lamelles paramétrée",
  "Slat step": "Pas de lamelle",
  "Stop/step increment": "Pas d'un arrêt/pas",
  "End-of-travel supplement": "Supplément en fin de course",
  "Inverted wiring": "Câblage inversé",
  "Estimated position at start": "Position estimée au départ",
  "Estimated slat angle at start": "Angle des lamelles estimé au départ",
  Drive: "Entraînement",
  Slats: "Lamelles",
  Position: "Position",
  "{0}: locked, commands ignored": "{0} : verrouillée, commandes ignorées",
  "{0}: lock ended": "{0} : fin du verrouillage",
  "{0}: locked, command ignored": "{0} : verrouillée, commande ignorée",
  "{0}: bus voltage failure, shutter raised":
    "{0} : coupure de la tension du bus, volet monté",
  "{0}: bus voltage failure, shutter lowered":
    "{0} : coupure de la tension du bus, volet descendu",
  "Position when locked": "Position au verrouillage",
  "Position before the lock": "Position avant le verrouillage",
  "No movement": "Aucun mouvement",
  "Position on bus recovery": "Position au retour de la tension du bus",
  "{0}: released, commands accepted again":
    "{0} : libérée, commandes de nouveau acceptées",
  "{0}: forced up, commands ignored":
    "{0} : forçage en montée, commandes ignorées",
  "{0}: forced down, commands ignored":
    "{0} : forçage en descente, commandes ignorées",
  "{0}: wind alarm, commands ignored": "{0} : alarme vent, commandes ignorées",
  "{0}: rain alarm, commands ignored": "{0} : alarme pluie, commandes ignorées",
  "{0}: frost alarm, commands ignored": "{0} : alarme gel, commandes ignorées",
  "{0}: rain alarm active, command ignored":
    "{0} : alarme pluie active, commande ignorée",
  "{0}: frost alarm active, command ignored":
    "{0} : alarme gel active, commande ignorée",
  "{0}: forced, command ignored": "{0} : forcée, commande ignorée",
  "{0}: wind alarm ended": "{0} : fin de l'alarme vent",
  "{0}: rain alarm ended": "{0} : fin de l'alarme pluie",
  "{0}: frost alarm ended": "{0} : fin de l'alarme gel",
  "{0}: storing positions disabled, position {1} unchanged":
    "{0} : mémorisation des positions désactivée, position {1} inchangée",
  "{0}: position {1} stored ({2} %)": "{0} : position {1} mémorisée ({2} %)",
  "{0}: to stored position {1}": "{0} : vers la position mémorisée {1}",
  "{0}: no telegram on the wind alarm in time, alarm assumed":
    "{0} : pas de télégramme d'alarme vent dans le délai, alarme supposée",
  "{0}: no telegram on the rain alarm in time, alarm assumed":
    "{0} : pas de télégramme d'alarme pluie dans le délai, alarme supposée",
  "{0}: no telegram on the frost alarm in time, alarm assumed":
    "{0} : pas de télégramme d'alarme gel dans le délai, alarme supposée",
  "Positions 1/2": "Positions 1/2",
  "Positions 3/4": "Positions 3/4",
  "Store positions 1/2": "Mémoriser positions 1/2",
  "Store positions 3/4": "Mémoriser positions 3/4",
  "Upper end position": "Fin de course haute",
  "Lower end position": "Fin de course basse",
  "On wind alarm": "Sur alarme vent",
  "On rain alarm": "Sur alarme pluie",
  "On frost alarm": "Sur alarme gel",
  "Priority of the weather alarms": "Priorité des alarmes météo",
  "Frost > Wind > Rain": "Gel > Vent > Pluie",
  "Frost > Rain > Wind": "Gel > Pluie > Vent",
  "Wind > Frost > Rain": "Vent > Gel > Pluie",
  "Wind > Rain > Frost": "Vent > Pluie > Gel",
  "Rain > Frost > Wind": "Pluie > Gel > Vent",
  "Rain > Wind > Frost": "Pluie > Vent > Gel",
  "Monitoring of the alarm objects": "Surveillance des objets d'alarme",
  "After the weather alarms": "Après les alarmes météo",
  "Position before the alarm": "Position avant l'alarme",
  "Position before the forcing": "Position avant le forçage",
  "Stored position 1": "Position mémorisée 1",
  "Stored position 2": "Position mémorisée 2",
  "Stored position 3": "Position mémorisée 3",
  "Stored position 4": "Position mémorisée 4",
  "Storing of the positions": "Mémorisation des positions",
  "Stored positions": "Positions mémorisées",
  "Weather alarms": "Alarmes météo",
  "Priority of the safety functions": "Priorité des fonctions de sécurité",
  "Weather alarms > Lock > Forcing": "Alarmes météo > Verrouillage > Forçage",
  "Weather alarms > Forcing > Lock": "Alarmes météo > Forçage > Verrouillage",
  "Lock > Weather alarms > Forcing": "Verrouillage > Alarmes météo > Forçage",
  "Lock > Forcing > Weather alarms": "Verrouillage > Forçage > Alarmes météo",
  "Forcing > Lock > Weather alarms": "Forçage > Verrouillage > Alarmes météo",
  "Forcing > Weather alarms > Lock": "Forçage > Alarmes météo > Verrouillage",
  "While a weather alarm, the lock, or forcing holds the output, commands are ignored; their order is set by the priority of the safety functions.":
    "Tant qu'une alarme météo, le verrouillage ou le forçage tient la sortie, les commandes sont ignorées ; leur ordre est fixé par la priorité des fonctions de sécurité.",
};
