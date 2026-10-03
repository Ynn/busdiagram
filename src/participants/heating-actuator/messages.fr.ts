// French texts of the heating actuator: parameters, pages, and log messages.
export const heatingActuatorFr: Record<string, string> = {
  "control value received: emergency mode ended":
    "commande reçue : fin du programme de secours",
  "no control value received: emergency mode at {0} %":
    "aucune grandeur de commande reçue : programme de secours à {0} %",
  "{0}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.":
    "{0} : l'actionneur attend une vanne normalement ouverte, mais la vanne est normalement fermée ; elle s'ouvre quand aucune chaleur n'est demandée.",
  "{0}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.":
    "{0} : l'actionneur attend une vanne normalement fermée, mais la vanne est normalement ouverte ; elle s'ouvre quand aucune chaleur n'est demandée.",
  "{0}: a cooling control value is linked, but the output is a heating valve and ignores it; set its function to cooling or change-over.":
    "{0} : une grandeur de refroidissement est liée, mais la sortie est une vanne de chauffage et l'ignore ; réglez sa fonction sur refroidissement ou changement de mode.",
  "{0}: a heating control value is linked, but the output is a cooling valve and ignores it; set its function to heating or change-over.":
    "{0} : une grandeur de chauffage est liée, mais la sortie est une vanne de refroidissement et l'ignore ; réglez sa fonction sur chauffage ou changement de mode.",
  "{0}: the output is a cooling valve, but its emitter only heats; use a fan coil with a cooling or change-over coil.":
    "{0} : la sortie est une vanne de refroidissement, mais son émetteur ne fait que chauffer ; utilisez un ventilo-convecteur avec une batterie froide ou à changement de mode.",
  "{0}: the output is a heating valve, but its emitter only cools.":
    "{0} : la sortie est une vanne de chauffage, mais son émetteur ne fait que refroidir.",
  "{0}: the output is a change-over valve, but its emitter only heats: cold water does not cool the room through it.":
    "{0} : la sortie est une vanne à changement de mode, mais son émetteur ne fait que chauffer : l'eau froide n'y refroidit pas la pièce.",
  "{0}: the output is a change-over valve, but its emitter only cools: hot water does not heat the room through it.":
    "{0} : la sortie est une vanne à changement de mode, mais son émetteur ne fait que refroidir : l'eau chaude n'y chauffe pas la pièce.",
  "Heating actuator: each output drives an electrothermal valve for heating, for cooling, or for both (change-over); continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.":
    "Actionneur de chauffage : chaque sortie alimente une vanne thermoélectrique de chauffage, de refroidissement ou des deux (changement de mode) ; grandeur continue (5.001) modulée en PWM ou commande 1 bit directe, surveillance et secours.",
  "Heating 1-bit command": "Commande 1 bit de chauffage",
  "Cooling 1-bit command": "Commande 1 bit de refroidissement",
  "Valve function": "Fonction de la vanne",
  "Heating and cooling (change-over)":
    "Chauffage et refroidissement (changement de mode)",
  "Link the heating and the cooling control values of the room controller: the valve follows the one that is not zero, and the water it lets through is hot or cold accordingly.":
    "Liez les grandeurs de chauffage et de refroidissement du régulateur : la vanne suit celle qui n'est pas nulle, et l'eau qu'elle laisse passer est chaude ou froide en conséquence.",
  "Control value status": "État de la commande",
  "Control value failure": "Défaut de commande",
  "Valve direction of action": "Sens d'action de la vanne",
  "Closed when de-energised": "Fermée hors tension",
  "Open when de-energised": "Ouverte hors tension",
  "Control value monitoring": "Surveillance de la commande",
  "Emergency control value": "Commande de secours",
  Valve: "Vanne",
  Safety: "Sécurité",
};
