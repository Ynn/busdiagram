---
title: Notions
translationOf: guide/03-concepts.md
sourceHash: "09e214ccb0aa"
order: 3
---

# Notions

Un schéma distingue les actions de l'utilisateur, la communication KNX, les sorties des actionneurs et les équipements raccordés.

```text
appui sur une touche → comportement de l'appareil → objet de communication → télégramme sur le bus
                                                                      ↓
                                                 objet récepteur (indicateur W)
                                                                      ↓
                                      comportement → sortie → lampe ou volet
```

## Appareil

Un appareil KNX a une adresse individuelle comme `1.1.10`. Il contient des objets de communication et peut aussi avoir des touches, des entrées et des canaux. Son `behavior` définit sa logique et la façon de le dessiner, par exemple `buttonInterface/v1`, `switchActuator/v1`, `shutterActuator/v1`, `daliGateway/v1`, `roomThermostat/v1`, ou une [extension](extensions.html) enregistrée. Le champ `kind` est une description libre de l'appareil ; seul un comportement qui documente une valeur lui donne un effet, comme `"supervisor"` pour un afficheur.

## Objet de communication

Chaque objet a une valeur, un DPT qui détermine comment l'interpréter, une ou plusieurs adresses de groupe, et des indicateurs :

| Indicateur | Activé | Désactivé |
| --- | --- | --- |
| `C` communication | L'objet communique, selon ses autres indicateurs (activé par défaut). | L'objet n'envoie ni ne traite aucun message. |
| `W` écriture | Une écriture reçue met à jour la valeur et appelle le comportement. | Le télégramme reste visible, mais la valeur et le comportement ne changent pas. |
| `T` transmission | L'objet peut envoyer sa valeur. | La valeur peut changer localement, mais aucun télégramme n'est envoyé. |
| `R` lecture | L'objet répond à une lecture sur n'importe laquelle de ses adresses, sur son adresse d'émission. | Aucune réponse n'est envoyée. |
| `U` mise à jour | Une réponse reçue met à jour l'objet. | Les réponses sont ignorées. |
| `I` lecture à l'initialisation | Quand l'appareil démarre (au démarrage de la simulation, et de nouveau après une coupure de la tension bus), l'objet lit sa valeur sur son adresse d'émission. Comme toute demande d'émission, cette lecture demande C et T. | Pas de lecture au démarrage. |

Quand un appareil émet, ses autres objets sur la même adresse prennent aussitôt la valeur, comme le prévoit la couche application KNX ; leur indicateur `W` décide seulement si l'appareil réagit, pour qu'un objet d'état n'agisse pas comme une commande.

`R`, `U`, `C` et `I` sont facultatifs en JSON ; voir les valeurs par défaut de `R` et `U` dans le [guide de l'interface USB](usb-interface.html#r-and-u-flags). Chaque objet a aussi une priorité de transmission, `"priority": "low"` (par défaut), `"normal"` ou `"urgent"`, écrite dans le champ de contrôle de ses trames. Le **port** de l'objet (`switch`, `status`, `move`, etc.) lui donne un rôle dans son comportement ; voir la [référence des ports](../reference/ports.html).

## Adresse de groupe et télégramme

Un télégramme de groupe a une adresse individuelle source, une adresse de groupe destinataire, un service et, pour une écriture ou une réponse, des données utiles. Le DPT n'est pas transmis : chaque appareil interprète les données selon le DPT de son propre objet. Tous les appareils de la ligne peuvent recevoir le télégramme, mais seuls les objets associés à son adresse destinataire le traitent.

| Service | Envoyé par | Traité par |
| --- | --- | --- |
| `GroupValueWrite` | Un comportement avec l'indicateur T, ou le panneau de l'interface USB. | Les objets associés avec l'indicateur W. |
| `GroupValueRead` | Le panneau de l'interface USB. | Chaque appareil répond une seule fois : son premier objet associé ayant l'indicateur R et une valeur connue répond, sur sa propre adresse d'émission. |
| `GroupValueResponse` | Un objet qui répond à une lecture. | Les objets associés avec l'indicateur U. |

## Canal et équipement raccordé

Un canal est une sortie d'actionneur, comme un relais ou une commande de moteur. Son comportement envoie des commandes comme `on/off` ou `up/down/stop`. L'équipement raccordé, comme une lampe ou un volet, répond à ces commandes et a son propre état physique. Il ne connaît ni les adresses de groupe ni les DPT.

Une sortie peut alimenter plusieurs charges câblées en parallèle, comme un circuit d'éclairage alimente plusieurs luminaires : `equipment` est alors une liste, et chaque charge reçoit les commandes de la sortie. Un actionneur avec mesure mesure la somme de leurs puissances. Une sortie de volet commande un seul moteur.

```json
"channels": [{
  "id": "s1",
  "label": "L1",
  "equipment": [
    { "type": "lamp", "name": "Ceiling", "parameters": { "powerW": 75 } },
    { "type": "lamp", "name": "Wall" },
    { "type": "appliance", "name": "Socket", "parameters": { "powerW": 1000 } }
  ]
}]
```

Cette séparation permet de montrer un [volet mal calibré](shutters.html) : l'actionneur estime la position d'après la durée de course configurée, alors que le volet raccordé se déplace à sa vitesse réelle.

## Association interne

Quand un objet émet, les autres objets du **même appareil** associés à cette adresse en sont informés aussi, exactement comme pour un télégramme reçu du bus : un objet ne prend la valeur qu'avec son indicateur W (U pour une réponse). Un objet d'état relié à l'adresse de commande d'une autre sortie du même actionneur commute donc cette sortie quand W est activé sur l'objet de commande, et ne change rien sinon. De même, deux entrées en télérupteur d'une interface de boutons-poussoirs sur la même adresse ne restent synchronisées qu'avec W : sans lui, chaque entrée garde sa propre valeur, et après un appui sur l'une, le premier appui sur l'autre renvoie la même valeur.

## À l'intérieur d'un télégramme

Sélectionnez un télégramme dans le moniteur de groupe : sa carte donne la source, la destination, le service, la valeur, la cause et les octets de sa trame TP1, colorés par champ. Cliquez sur un octet, ou sur **Détails**, pour ouvrir la trame dans quatre vues qui restent synchronisées : sélectionner un octet dans l'une le sélectionne dans les autres.

- **Trame :** les champs (contrôle, source, destination, octet de routage, TPCI/APCI, données, octet de contrôle) et, pour l'octet sélectionné, ce que signifie chacun de ses bits. Une valeur sur un bit comme le DPT 1.001 voyage dans l'octet APCI lui-même.
- **Bits :** chaque octet bit par bit, ses sous-champs soulignés.
- **Signal TP1 :** chaque octet sous la forme du caractère série envoyé sur le bus (bit de start, huit bits de données poids faible en premier, parité paire, bit de stop, puis 2 temps de bit au repos avant le caractère suivant), ses bits logiques et une tension du bus schématique : un 0 logique est une courte chute de tension, un 1 logique laisse le bus au repos. En dessous, l'octet sélectionné apparaît deux fois : tel qu'il s'écrit, bit de poids fort en premier (b7 … b0), et tel qu'il est envoyé, b0 d'abord ; pointez un bit pour le retrouver dans les deux. Une règle donne la durée ; l'acquittement qui suit est dessiné à titre d'illustration seulement.
- **Contrôle de trame :** deux contrôles se croisent. Le bit de parité P, envoyé après les huit bits de données de chaque caractère, rend pair le nombre de 1 de sa ligne ; l'octet de contrôle, dernier caractère, rend impair le nombre de 1 dans chaque colonne de données, bits 7 à 0 (pas dans la colonne des bits de parité). Cliquez sur une colonne pour suivre son calcul, à côté du calcul équivalent : OU exclusif des octets suivi d'une inversion.

Quand le télégramme traverse des coupleurs, choisissez le segment : chaque coupleur abaisse le compteur de routage, si bien que l'octet de routage et l'octet de contrôle changent d'une ligne à l'autre.

Pour voir qui est lié à une adresse de groupe, cliquez dessus dans un appareil, ou cliquez sur la destination dans la carte du télégramme : chaque objet lié est entouré. Son badge indique T quand l'objet émet sur cette adresse (C et T cochés, et c'est son adresse d'émission), W quand une écriture sur elle met l'objet à jour (C et W cochés), et un tiret sinon. Chaque adresse d'une cellule peut être choisie, à la souris ou au clavier ; Échap efface la sélection.
