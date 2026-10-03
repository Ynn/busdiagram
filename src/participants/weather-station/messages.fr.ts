// French texts of the weather station: parameters, pages, and log messages.
export const weatherStationFr: Record<string, string> = {
  "Sun protection": "Protection solaire",
  "{0} reaches the threshold {1}: output set":
    "{0} atteint le seuil {1} : sortie activée",
  "{0} is below {1} (threshold − hysteresis): output reset":
    "{0} est sous {1} (seuil − hystérésis) : sortie désactivée",
  "Outdoor temperature of the rooms set to {0} °C":
    "Température extérieure des pièces réglée à {0} °C",
  "Weather station: sends measured wind speed, brightness, and temperature; sets one-bit outputs when wind or brightness thresholds are reached.":
    "Station météo : émet la vitesse du vent, la luminosité et la température mesurées ; active des sorties 1 bit quand les seuils de vent ou de luminosité sont atteints.",
  "Outdoor temperature": "Température extérieure",
  "Wind alarm threshold": "Seuil d'alarme vent",
  "Wind alarm hysteresis": "Hystérésis de l'alarme vent",
  "Sun protection threshold": "Seuil de protection solaire",
  "Outdoor temperature applies to the rooms":
    "La température extérieure s'applique aux pièces",
  "Sun protection hysteresis": "Hystérésis de la protection solaire",
  "{0} °C at or below {1} °C: frost alarm set":
    "{0} °C inférieur ou égal à {1} °C : alarme gel activée",
  "{0} °C above {1} °C: frost alarm reset":
    "{0} °C au-dessus de {1} °C : alarme gel levée",
  "Rain alarm set": "Alarme pluie activée",
  "Rain alarm reset": "Alarme pluie levée",
  "Rain detected: alarm after the delay":
    "Pluie détectée : alarme après le délai",
  "Rain ended: alarm reset after the delay":
    "Fin de la pluie : alarme levée après le délai",
  "Frost alarm threshold": "Seuil d'alarme gel",
  "Frost alarm hysteresis": "Hystérésis de l'alarme gel",
  "Delay of the rain alarm": "Délai de l'alarme pluie",
  "Delay of the end of rain": "Délai de fin de pluie",
  "Cyclic sending of the alarms": "Envoi cyclique des alarmes",
};
