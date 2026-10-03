// French texts of the push-button interface: parameters, pages, and log messages.
export const buttonInterfaceFr: Record<string, string> = {
  "{0}, {1}: {2}": "{0}, {1} : {2}",
  "{0}: group object “{1}” not enabled, nothing sent":
    "{0} : objet de groupe « {1} » non activé, rien n'est envoyé",
  "{0}: storing a scene needs a scene control object (DPT 18.001), nothing sent":
    "{0} : mémoriser une scène demande un objet de commande de scène (DPT 18.001), rien n'est envoyé",
  "{0}: input locked": "{0} : entrée verrouillée",
  "{0}: input unlocked": "{0} : entrée déverrouillée",
  "{0}: input locked, press ignored": "{0} : entrée verrouillée, appui ignoré",
  "Push-button interface: each channel is a contact input with a function (switching, dimming, blind, value, scene), with short and long presses; lock, bus voltage recovery and cyclic sending.":
    "Interface de boutons-poussoirs : chaque canal est une entrée de contact avec une fonction (commutation, variation, store, valeur, scène), avec appuis courts et longs ; verrouillage, retour de la tension du bus et émission cyclique.",
  Switching: "Commutation",
  "Value or scene": "Valeur ou scène",
  LED: "LED",
  Blind: "Store",
  "Long press from": "Appui long à partir de",
  "Short and long presses": "Appuis courts et longs",
  "On press": "À l'appui",
  "No action": "Aucune action",
  "On release": "Au relâchement",
  "Short press": "Appui court",
  "Operation (dimming)": "Fonctionnement (variation)",
  "One key: on/off, brighter and darker in turn":
    "Une touche : marche/arrêt, plus clair et plus sombre en alternance",
  "Two keys: this key switches on and brightens":
    "Deux touches : cette touche allume et éclaircit",
  "Two keys: this key switches off and darkens":
    "Deux touches : cette touche éteint et assombrit",
  "Dimming step": "Pas de variation",
  "100 %": "100 %",
  "50 %": "50 %",
  "25 %": "25 %",
  "12.5 %": "12,5 %",
  "6 %": "6 %",
  "3 %": "3 %",
  "1.5 %": "1,5 %",
  "Operation (blind)": "Fonctionnement (store)",
  "One key: up and down in turn":
    "Une touche : montée et descente en alternance",
  "Two keys: this key raises": "Deux touches : cette touche fait monter",
  "Two keys: this key lowers": "Deux touches : cette touche fait descendre",
  "Stop on release": "Arrêt au relâchement",
  "Value on short press": "Valeur à l'appui court",
  "Value on long press": "Valeur à l'appui long",
  "no long press": "pas d'appui long",
  "Store by long press": "Mémoriser par appui long",
  "Send the current value": "Envoyer la valeur actuelle",
  "When locked (blind)": "Au verrouillage (store)",
  "When unlocked (blind)": "Au déverrouillage (store)",
  "On bus voltage recovery (blind)": "Au retour de la tension du bus (store)",
  "Recovery delay": "Délai au retour",
  "no cyclic sending": "pas d'émission cyclique",
  "Cyclic sending of": "Émission cyclique de",
  "Both values": "Les deux valeurs",
  "Only 1 (on)": "Seulement 1 (marche)",
  "Only 0 (off)": "Seulement 0 (arrêt)",
  "LED on the key": "LED sur la touche",
  "LED lit for 0": "LED allumée pour 0",
  "The group objects of the function are created with it; link them in the Group objects tab.":
    "Les objets de groupe de la fonction sont créés avec elle ; les lier dans l'onglet Objets de groupe.",
  "Storing needs a scene control object (DPT 18.001); a scene number object (17.001) only recalls.":
    "La mémorisation demande un objet de commande de scène (DPT 18.001) ; un objet de numéro de scène (17.001) ne fait que rappeler.",
  "While the input is locked, its presses are ignored.":
    "Tant que l'entrée est verrouillée, ses appuis sont ignorés.",
  "Without an LED object, the LED of a switching or dimming input shows its switching object.":
    "Sans objet LED, la LED d'une entrée de commutation ou de variation montre son objet de commutation.",
  "Bus voltage and cyclic sending": "Tension du bus et émission cyclique",
  "Bus voltage recovery": "Retour de la tension du bus",
  "No reaction for this function.": "Aucune réaction pour cette fonction.",
  "Cyclic sending applies to the switching function.":
    "L'émission cyclique concerne la fonction de commutation.",
  "{0}, {1}: the push-button is normally closed, but the input expects a closed contact when actuated; presses and releases are seen the wrong way round.":
    "{0}, {1} : le bouton-poussoir est normalement fermé, mais l'entrée attend un contact fermé à l'actionnement ; appuis et relâchements sont vus à l'envers.",
  "{0}, {1}: the input expects an open contact when actuated, but the push-button is normally open; presses and releases are seen the wrong way round.":
    "{0}, {1} : l'entrée attend un contact ouvert à l'actionnement, mais le bouton-poussoir est normalement ouvert ; appuis et relâchements sont vus à l'envers.",
  "Input when actuated": "Entrée lors de l'actionnement",
  "Contact closed": "Contact fermé",
  "Contact open": "Contact ouvert",
};
