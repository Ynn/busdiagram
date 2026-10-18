---
title: Mise en service
translationOf: guide/07-commissioning.md
sourceHash: "6733a416de63"
order: 7.5
---

# Mise en service

Sur une maquette, les étudiants ne se contentent pas de concevoir un projet : ils programment l'adresse individuelle de chaque participant avec son bouton de programmation, téléchargent les applications et cherchent pourquoi un participant ne répond pas. Un scénario peut simuler cette partie du travail. Les participants contiennent alors, à côté du projet, ce qui y a été téléchargé, comme de vrais participants.

## L'activer

Dans le [designer](designer.html), panneau **Installation**, cochez **Simuler la mise en service**. En JSON, ajoutez une section `installation` à la racine du scénario :

```json
"installation": {}
```

Une section vide signifie que chaque participant et chaque coupleur est à l'état de livraison : adresse individuelle 15.15.255 (15.15.0 pour un coupleur), sans application. Un participant sans application ne fait rien : ses touches n'envoient aucun télégramme, ses sorties ne commutent pas, et sa carte dans le schéma indique **non chargé**. Un coupleur sans application ne transmet aucun télégramme de groupe.

Sans la section, rien ne change : le schéma exécute le projet comme si chaque participant était déjà mis en service.

## Dans le schéma

Avec la mise en service, chaque participant et chaque coupleur a un petit carré à côté de son adresse : son **bouton de programmation**. Un clic active le mode programmation (la LED rouge s'allume) ou le désactive. Quand l'adresse contenue dans un participant n'est pas celle du projet, la carte l'affiche après un signe **≠**, en rouge.

## Dans le designer

Le menu contextuel d'un participant (clic droit dans le panneau Topologie ou dans la liste des participants d'une ligne) propose les téléchargements d'ETS :

| Commande | Effet |
| --- | --- |
| Téléchargement complet | Programme l'adresse individuelle avec le bouton de programmation, puis télécharge l'application. Quand le participant répond déjà à son adresse, seulement l'application. |
| Télécharger : adresse individuelle | Attend un bouton de programmation, vérifie qu'un seul participant est en mode programmation et qu'aucun autre participant n'a l'adresse, l'écrit et met fin au mode programmation. |
| Télécharger : téléchargement partiel (application) | Télécharge l'application dans le participant qui répond à l'adresse du projet. |
| Décharger l'application | Retire l'application du participant à cette adresse. |

Le menu contextuel d'une ligne ajoute **Scanner la ligne**, qui liste les participants qui répondent aux adresses de la ligne, avec ce qu'ils contiennent ; un participant à l'état de livraison (15.15.255) n'y figure pas. Les coupleurs d'une ligne, et le coupleur de zone d'une zone, ont leurs propres commandes de téléchargement dans les mêmes menus.

La liste des participants d'une ligne montre l'état de téléchargement, comme la topologie d'ETS : **Adr** (adresse individuelle programmée), **Prg** (programme d'application chargé), **Par** (paramètres à jour), **Grp** (adresses de groupe à jour) et **Cfg** (indicateurs, DPT et priorités à jour). Une modification du projet, comme une nouvelle association, fait passer la colonne en rouge jusqu'au prochain téléchargement du participant : d'ici là, il garde ses anciens réglages.

La barre **Mise en service** au-dessus des panneaux garde l'historique des opérations. Quand une opération attend un bouton de programmation, la barre dit laquelle ; elle reprend dès que le bouton est actionné dans le schéma, et **Annuler** l'arrête. **Participants en mode programmation** liste les participants dont la LED est allumée. **État de livraison** remet tous les participants à l'état de livraison, et **Conforme au projet** charge chaque participant avec son adresse et son application, comme après un téléchargement complet.

L'état des participants est conservé dans le scénario : un bouton de programmation, une adresse écrite ou un téléchargement n'ajoutent pas d'étape à l'historique d'annulation du projet.

## Les erreurs possibles des étudiants

Les procédures agissent sur le participant qui répond, pas sur celui que l'étudiant visait. Elles refusent ce qu'ETS refuse :

- deux LED de programmation allumées en même temps ;
- une adresse individuelle déjà détenue par un autre participant du bus (scannez la ligne pour le trouver) ;
- un téléchargement vers une adresse où aucun participant ne répond ;
- un téléchargement vers un participant dont le programme d'application n'est pas celui du projet.

Les autres erreurs ont leurs conséquences : si le mauvais bouton de programmation a été actionné, le mauvais participant reçoit l'adresse, puis l'application d'un autre participant du même type, et c'est la mauvaise lampe qui s'allume. Une nouvelle adresse de groupe qui traverse un coupleur ne fonctionne qu'une fois le coupleur téléchargé à nouveau, avec sa nouvelle table de filtrage.

Pour préparer un exercice où une maquette a été laissée programmée par un autre groupe, donnez une autre adresse à certains participants dans la section `installation` :

```json
"installation": {
  "devices": [{ "device": "switchActuator", "address": "1.1.1" }]
}
```

## La section installation

| Champ | Contenu |
| --- | --- |
| `devices[].device` | ID du participant dans le projet. |
| `devices[].address` | Adresse individuelle contenue dans le participant (15.15.255 par défaut). |
| `devices[].programmingMode` | LED de programmation allumée. |
| `devices[].application` | Application téléchargée : comportement, paramètres, objets avec leurs associations, touches, et paramètres et scènes de chaque canal. Absente : pas d'application. |
| `devices[].memory` | Mémoire d'un participant d'un fabricant, telle qu'ETS l'a écrite (blocs d'octets en hexadécimal par adresse) ; le participant exécute l'application qui y est démarrée. |
| `couplers[].coupler` | Adresse du coupleur ou du répéteur dans le projet. |
| `couplers[].address` | Adresse individuelle qu'il contient (15.15.0 par défaut). |
| `couplers[].application` | Table de filtrage (`filterTable`) et routage des télégrammes de groupe (`down`, `up`). Absente : pas d'application. |

Les noms, adresses et pièces des participants, ainsi que les charges et boutons-poussoirs qui y sont câblés, restent dans le projet : ils ne sont pas téléchargés.

## Limites du modèle

- La gestion des participants atteint tout participant sous tension de bus, à travers les coupleurs, quoi qu'ils contiennent.
- Un téléchargement redémarre le participant qui l'a reçu, avec l'application qu'il contient désormais : ses échéances prennent fin et il démarre comme après un redémarrage ; ses charges gardent leur état, et les autres participants, le temps et les télégrammes en cours continuent.
- Le mode programmation prend fin quand la simulation est réinitialisée, comme au retour de la tension de bus ; les adresses contenues restent.
- Un programme d'application est identifié par le comportement du participant : deux participants du même type acceptent l'application l'un de l'autre.
