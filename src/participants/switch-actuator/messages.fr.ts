// French texts of the switch actuator: parameters, pages, and log messages.
export const switchActuatorFr: Record<string, string> = {
  "{0}: output forced (on), command stored without effect":
    "{0} : sortie forcée (marche), commande mémorisée sans effet",
  "{0}: output forced (off), command stored without effect":
    "{0} : sortie forcée (arrêt), commande mémorisée sans effet",
  "{0}: output locked, command stored without effect":
    "{0} : sortie verrouillée, commande mémorisée sans effet",
  "{0}: output shed, command stored without effect":
    "{0} : sortie délestée, commande mémorisée sans effet",
  "{0}: output locked": "{0} : sortie verrouillée",
  "{0}: output unlocked": "{0} : sortie déverrouillée",
  "{0}: switch-on delay of {1} s": "{0} : retard à l'enclenchement de {1} s",
  "{0}: switch-off delay of {1} s": "{0} : retard au déclenchement de {1} s",
  "{0}: timer cannot be retriggered, telegram has no effect":
    "{0} : minuterie non redéclenchable, télégramme sans effet",
  "{0}: early switch-off of the timer not allowed, telegram 0 has no effect":
    "{0} : arrêt anticipé de la minuterie non autorisé, télégramme 0 sans effet",
  "{0}: scene {1} stored (on)": "{0} : scène {1} mémorisée (marche)",
  "{0}: scene {1} stored (off)": "{0} : scène {1} mémorisée (arrêt)",
  "Total power {0} W reaches the limit {1} W":
    "La puissance totale {0} W atteint la limite {1} W",
  "Total power {0} W is back below {1} W":
    "La puissance totale {0} W repasse sous {1} W",
  "{0}: switched off by load shedding": "{0} : coupée par délestage",
  "{0}: load shedding ended, stored command applied":
    "{0} : fin du délestage, commande mémorisée appliquée",
  "{0}: switch-off warning": "{0} : préavis d'extinction",
  "Switch actuator: each channel drives a relay; optional timer, status feedback, and power and energy metering.":
    "Actionneur de commutation : chaque voie commande un relais ; minuterie, retour d'état et mesure de puissance et d'énergie en option.",
  "Logic link": "Liaison logique",
  "Power limit": "Limite de puissance",
  "Total power limit": "Limite de puissance totale",
  "Minimum shedding time": "Durée minimale de délestage",
  "Power limit hysteresis": "Hystérésis de la limite de puissance",
  "no timer": "pas de minuterie",
  "Timer retriggering": "Redéclenchement de la minuterie",
  Restarts: "Redémarre",
  "No effect": "Sans effet",
  Extends: "Prolonge",
  "Switch-off warning": "Préavis d'extinction",
  "Early switch-off by 0": "Arrêt anticipé par 0",
  "Shed on power limit": "Délester sur limite de puissance",
  "Relay operating mode": "Mode de fonctionnement du relais",
  "Switch-on delay": "Retard d'allumage",
  "Switch-off delay": "Retard d'extinction",
  "End of lock": "Fin du verrouillage",
  "Last command": "Dernière commande",
  "Previous state": "État d'avant",
  "Logic operation": "Opération logique",
  "AND: on when the command and the logic object are 1":
    "ET : marche quand la commande et l'objet logique valent 1",
  "OR: on when the command or the logic object is 1":
    "OU : marche quand la commande ou l'objet logique vaut 1",
  "State before the failure": "État avant la coupure",
  "Metering and load shedding": "Comptage et délestage",
  "Load shedding": "Délestage",
  Delays: "Temporisations",
  "Delays apply to the switching object; scenes, forcing, and the lock act at once.":
    "Les temporisations s'appliquent à l'objet de commutation ; les scènes, le forçage et le verrouillage agissent immédiatement.",
  "Forcing has priority over the lock; while either is active, commands are stored.":
    "Le forçage est prioritaire sur le verrouillage ; tant que l'un des deux est actif, les commandes sont mémorisées.",
  Metering: "Comptage",
  "Shedding applies when the device has a total power limit (page Metering and load shedding).":
    "Le délestage s'applique quand l'appareil a une limite de puissance totale (page Comptage et délestage).",
  "{0}: fire alarm, command stored without effect":
    "{0} : alarme incendie, commande mémorisée sans effet",
  "{0}: intrusion alarm, command stored without effect":
    "{0} : alarme intrusion, commande mémorisée sans effet",
  "{0}: fire alarm, output on": "{0} : alarme incendie, sortie allumée",
  "{0}: intrusion alarm, output blinking":
    "{0} : alarme intrusion, sortie clignotante",
  "{0}: alarm ended": "{0} : fin de l'alarme",
  "Blinking period on intrusion": "Période de clignotement sur intrusion",
  "End of the alarms": "Fin des alarmes",
  Alarms: "Alarmes",
  "Fire forces the output on, intrusion makes it blink; fire has priority over intrusion, and both over forcing and the lock.":
    "L'incendie force la sortie à l'état allumé, l'intrusion la fait clignoter ; l'incendie est prioritaire sur l'intrusion, et les deux sur le forçage et le verrouillage.",
};
