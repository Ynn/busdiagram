// French texts of the alarm module: parameters, pages, and log messages.
export const alarmModuleFr: Record<string, string> = {
  "{0}: fire alarm triggered and stored":
    "{0} : alarme incendie déclenchée et mémorisée",
  "{0}: intrusion alarm triggered and stored":
    "{0} : alarme intrusion déclenchée et mémorisée",
  "{0}: reset refused, the fire trigger is still active":
    "{0} : acquittement refusé, le déclencheur incendie est encore actif",
  "{0}: reset refused, the intrusion trigger is still active":
    "{0} : acquittement refusé, le déclencheur intrusion est encore actif",
  "{0}: fire alarm reset": "{0} : alarme incendie acquittée",
  "{0}: intrusion alarm reset": "{0} : alarme intrusion acquittée",
  "Alarm module: for each zone, an intrusion and a fire alarm set by a trigger, stored until a reset accepted once the trigger has returned to 0.":
    "Module d'alarmes : pour chaque zone, une alarme intrusion et une alarme incendie déclenchées par un objet, mémorisées jusqu'à un acquittement accepté une fois le déclencheur revenu à 0.",
  "Intrusion trigger": "Déclencheur intrusion",
  "Fire trigger": "Déclencheur incendie",
  "Intrusion reset": "Acquittement intrusion",
  "Fire reset": "Acquittement incendie",
  Intrusion: "Intrusion",
  Fire: "Incendie",
  "An alarm stays stored when its trigger returns to 0; a reset is accepted only once the trigger is 0.":
    "Une alarme reste mémorisée quand son déclencheur revient à 0 ; un acquittement n'est accepté qu'une fois le déclencheur à 0.",
};
