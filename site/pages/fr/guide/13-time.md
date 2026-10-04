---
title: Temps et mode pas à pas
translationOf: guide/13-time.md
sourceHash: "5a52f455d9bd"
order: 13
---
# Temps et mode pas à pas

## Une cadence observable

La simulation ralentit la propagation des télégrammes pour qu'on puisse examiner chaque événement. Ces valeurs sont des réglages du modèle, pas des durées physiques du bus KNX. Pour comparaison, sur une ligne à paire torsadée à 9600 bit/s, un télégramme de commutation et son acquittement occupent le bus environ 20 ms.

| Événement | Délai simulé |
| --- | --- |
| Émission d'un objet sur le bus | 550 ms |
| Entre deux appareils voisins sur une ligne | 250 ms |
| Entrée, décision et sortie d'un coupleur | 150 + 900 + 150 ms |
| Arrivée du bus à un objet récepteur | 500 ms |
| Retour d'état ou démarrage moteur par défaut | 300 ms |

Une lampe ou un moteur ne change qu'après le traitement du télégramme par l'objet récepteur.

## Vitesse et pause

Les commandes de vitesse multiplient le temps simulé : plus lent, normal, plus rapide et ×5. Le seuil d'appui long des touches (`longPressMs`, 0,5 s par défaut) utilise le temps réel. Pendant la pause, un appui sur une touche est enregistré mais son télégramme attend la reprise du temps simulé. Un onglet ou une diapositive masqués se mettent en pause sans rattraper le retard ensuite.

## Horloge simulée

Un scénario peut déclarer une horloge murale simulée. Les horloges maîtres, les programmateurs et les plages horaires l'utilisent :

```json
"clock": { "start": "2026-09-28T21:57:00", "speed": 60 }
```

- `start` est la date et l'heure locales au démarrage de la simulation, sans fuseau horaire.
- `speed` est le nombre de secondes d'horloge par seconde simulée (1 par défaut, 3600 au plus). Avec 60, une minute d'horloge passe à chaque seconde simulée.

L'horloge suit le temps simulé : elle s'arrête pendant la pause de la simulation, et les commandes de vitesse s'y appliquent comme à tout le reste. Avec une horloge, le temps simulé continue de s'écouler même quand le bus est inactif.

Le schéma affiche la date et l'heure dans une barre en haut à gauche de la zone du schéma, au-dessus du dessin. **Régler l'heure** ouvre un champ pour régler l'horloge sur une autre date et heure, par exemple juste avant un point de commutation programmé ; les appareils renvoient alors l'heure et reprogramment leurs programmes. Depuis JavaScript, `diagram.setClock("2026-10-01T06:59:30")` fait de même.

## Mode pas à pas

Le mode pas à pas s'arrête aux événements explicatifs, dont l'émission d'un télégramme, la décision de routage ou de filtrage d'un coupleur, l'acceptation ou le refus d'un objet selon W, les changements de sortie et l'expiration des temporisations. Appuyez sur **Suivant** pour passer à l'événement suivant.

## Chronogramme

L'option `timeline` affiche, sous le schéma, jusqu'à quatre traces sur l'axe du temps simulé : les valeurs d'objets et les états marche/arrêt en escalier, les températures des pièces, les ouvertures et les niveaux en courbes, et les télégrammes d'un objet tracé en marques. Chaque événement est enregistré à son propre instant, quelle que soit la vitesse, y compris en mode pas à pas. Elle aide à lire ce qui dépend du temps : une minuterie d'escalier, la MLI, une boucle de régulation, une priorité. Nommez les premières traces dans l'option, puis ajoutez-en ou retirez-en depuis son menu :

```html
<bus-diagram src="room-heating.json"
  timeline="livingThermostat/temp livingThermostat/val heatingActuator:h1 @livingRoom"></bus-diagram>
```

`device/object` trace un objet, `device:channel` l'équipement d'une sortie, et `@room` la température d'une pièce. Voir l'[exemple de chauffage](../examples/hvac.html).

## Déterminisme

Le temps avance par millisecondes entières à travers une file d'événements. Avancer de 20 secondes en un seul appel ou par petits pas donne le même état final pour les mêmes entrées.
