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
  "{0}: wind alarm, shutter raised and locked":
    "{0} : alarme vent, volet remonté et verrouillé",
  "{0}: wind alarm ended, shutter released in place":
    "{0} : fin de l'alarme vent, volet libéré sur place",
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
  "The wind alarm raises the shutter and blocks it until the alarm ends.":
    "L'alarme vent remonte le store et le bloque jusqu'à la fin de l'alarme.",
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
  "The wind alarm has priority over the lock.":
    "L'alarme vent est prioritaire sur le verrouillage.",
};
