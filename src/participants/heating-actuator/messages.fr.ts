// French texts of the heating actuator: parameters, pages, and log messages.
export const heatingActuatorFr: Record<string, string> = {
  "control value received: emergency mode ended":
    "commande reçue : fin du programme de secours",
  "no control value received: emergency mode at {0} %":
    "aucune grandeur de commande reçue : programme de secours à {0} %",
  "{0} · {1}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.":
    "{0} · {1} : l'actionneur attend une vanne normalement ouverte, mais la vanne est normalement fermée ; elle s'ouvre quand aucune chaleur n'est demandée.",
  "{0} · {1}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.":
    "{0} · {1} : l'actionneur attend une vanne normalement fermée, mais la vanne est normalement ouverte ; elle s'ouvre quand aucune chaleur n'est demandée.",
  "Heating actuator: each output drives an electrothermal valve; continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.":
    "Actionneur de chauffage : chaque sortie alimente une vanne thermoélectrique ; grandeur continue (5.001) modulée en PWM ou commande 1 bit directe, surveillance et secours.",
  "Control value": "Grandeur de commande",
  "1-bit command": "Commande 1 bit",
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
