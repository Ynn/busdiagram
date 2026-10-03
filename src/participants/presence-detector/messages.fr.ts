// French texts of the presence detector: parameters, pages, and log messages.
export const presenceDetectorFr: Record<string, string> = {
  "Detection: hold time not restarted": "Passage : temporisation non relancée",
  "Detection: hold time restarted, no new telegram":
    "Passage : temporisation relancée, pas de nouveau télégramme",
  "Detection: {0} lx is not below the threshold of {1} lx, no switch-on":
    "Détection : {0} lx n'est pas sous le seuil de {1} lx, pas d'enclenchement",
  "Presence detector: sends 1 on first detection, 0 when its hold time ends (restarted by each detection).":
    "Détecteur de présence : émet 1 au premier passage, 0 à la fin de sa temporisation (relancée à chaque passage).",
  "Hold time": "Temporisation",
  "Hold time restarted by a detection": "Temporisation relancée par un passage",
  "Send 0 at the end": "Émettre 0 à la fin",
  "Switch-on brightness threshold": "Seuil de luminosité d'enclenchement",
  "Detection reported by a slave detector":
    "Détection signalée par un détecteur esclave",
  "Slave detection": "Détection esclave",
  "Detection sent to the master detector":
    "Détection envoyée au détecteur maître",
  "Slave detector": "Détecteur esclave",
  "Detection ignored: detector locked":
    "Détection ignorée : détecteur verrouillé",
  "Detector locked": "Détecteur verrouillé",
  "Detector unlocked": "Détecteur déverrouillé",
  "No telegram": "Pas de télégramme",
};
