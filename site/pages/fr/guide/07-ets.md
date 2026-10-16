---
title: Liaison à ETS
translationOf: guide/07-ets.md
sourceHash: "ded6845fca1f"
order: 7.6
---

# Relier un schéma à ETS

N'importe quel schéma peut être relié à ETS sur le même ordinateur : le concepteur, le lecteur, une page de cours, un fichier ouvert depuis le disque. ETS voit alors l'installation simulée comme une installation KNX atteinte par une interface : son moniteur de groupe affiche les télégrammes du schéma, et une écriture ou une lecture depuis ETS agit sur les participants simulés.

La liaison passe par un petit programme Windows, **BusDiagram-ETS**, auquel ETS se connecte comme à une interface de tunnel KNXnet/IP. La barre d'outils du schéma s'y relie quand le lecteur clique sur **Relier à ETS**.

```
ETS ──Tunneling IP 127.0.0.1:3672── BusDiagram-ETS ──ws://127.0.0.1:3761── schéma
```

## Obtenir le programme

Télécharger `BusDiagram-ETS.exe` depuis les [versions publiées de BusDiagram](https://github.com/Ynn/busdiagram/releases/latest) et le lancer : une fenêtre s'ouvre, à garder ouverte pendant la séance. Elle indique si ETS et un schéma sont connectés, ce qu'il faut saisir dans ETS (avec un bouton qui copie l'adresse), et un journal. Le programme ne demande pas d'installation ; par défaut, il n'est joignable que depuis cet ordinateur.

Le port 3672 est choisi pour ne pas gêner KNX Virtual, qui utilise 3671 : les deux peuvent tourner en même temps.

## Relier le schéma

1. Lancer BusDiagram-ETS.
2. Dans la barre d'outils du schéma, cliquer sur **Relier à ETS**. Le contrôle affiche *ETS : en attente d'ETS*, puis *ETS relié* une fois ETS connecté.
3. Dans le projet ETS, ajouter une fois la connexion (ETS 6.4 : bouton des connexions à droite de la barre d'outils → *Gérer les connexions configurées* → *Ajouter*) : type *Tunneling IP*, adresse `127.0.0.1`, port `3672`, sans NAT.
4. Cliquer sur **Adresses pour ETS** dans la barre d'outils et importer le fichier dans le projet ETS (clic droit sur *Adresses de Groupe* → *Importer Adresses de Groupe*) : le moniteur de groupe décode alors les valeurs avec les noms et les DPT du schéma.
5. Dans ETS, ouvrir *Panneaux* → *Moniteurs* → *Moniteur de Groupe*, cliquer sur *Démarrer* et choisir la connexion *Tunneling IP (127.0.0.1:3672)*.

Un seul schéma est relié à la fois : en relier un autre déconnecte le premier, qui l'indique. **Déconnecter** met fin à la liaison ; fermer le programme aussi.

## Où ETS accède au bus

| Le schéma a | ETS accède au bus | Effet |
| --- | --- | --- |
| une interface USB ou IP (`usbInterface/v1`) | par cette interface, sur sa ligne | Exact : les coupleurs filtrent comme sur une installation réelle ; le paramètre `groupAddresses` de l'interface décide de ce qui les traverse. Avec plusieurs interfaces, la barre d'outils laisse choisir. |
| aucune interface | sur la ligne principale : le réseau IP, sinon la ligne de zone, sinon la première ligne principale, sinon la ligne | Plus simple : toutes les adresses de groupe du schéma sont attribuées à ETS, et les coupleurs les transmettent vers lui et depuis lui pendant la liaison ; les tables de filtrage les montrent. |

Les télégrammes d'ETS entrent sur le bus à cet endroit avec leur propre source (l'adresse du tunnel, `15.15.251`), leur priorité, leur compteur de routage et leurs octets. Aucun DPT ne voyage dans un télégramme : chaque objet récepteur décode les octets avec son propre DPT, et ignore des données d'une autre taille, ce que le journal explique. Les télégrammes qui atteignent le point d'accès par la topologie sont envoyés à ETS, avec le compteur de routage qu'ils y ont.

## Programmer les adresses individuelles depuis ETS

Dans un schéma qui simule la [mise en service](commissioning.html), les participants démarrent en 15.15.255, comme à la livraison. Dans ETS, clic droit sur un participant du projet → *Télécharger* → *Adresse individuelle*, puis cliquez sur le bouton de programmation du participant dans le schéma (le petit carré à côté de son adresse) : sa LED s'allume, ETS écrit l'adresse, redémarre le participant, et la LED s'éteint. Le designer, quand il affiche le schéma, enregistre la nouvelle adresse (colonne **Adr**). Les erreurs habituelles ont leur effet : deux LED allumées, et les deux participants répondent ; une adresse déjà utilisée sur le bus, et ETS la trouve.

Les participants de BusDiagram répondent avec le descripteur 07B0 (TP1, System B) et le code fabricant de la KNX Association, comme ceux de KNX Virtual ; leurs applications se téléchargent depuis le designer.

## Télécharger une application depuis ETS

Les participants des fabricants, que BusDiagram ne livre pas, s'importent depuis un paquet de participants (`.bdpkg`, bouton **Importer des participants…** du panneau Catalogue ; voir les [extensions](extensions.html#livrer-des-participants-de-fabricants-dans-un-paquet)), et se programment depuis ETS comme les vrais. Activez **Simuler la mise en service** (panneau Installation) : sans elle, les participants n'ont pas de mémoire, et la barre d'outils le signale quand ETS essaie d'en télécharger un. Insérez le participant depuis la catégorie **Programmés par ETS** du catalogue du designer, et créez le même participant dans le projet ETS, depuis le catalogue du fabricant. Le participant répond à ETS avec le masque de son programme d'application (0011 ou 0012 pour un BCU1, 0701 pour un System 7) et possède une mémoire : ETS y écrit les paramètres, la table des adresses de groupe, les associations et les objets de groupe (pour un System 7, par ses machines d'états de chargement), vérifie chaque écriture par une lecture, démarre l'application et redémarre le participant. Comme un participant livré, il contient le code de son fabricant et l'identifiant de son application, qu'ETS vérifie d'abord. Le code applicatif d'un participant System 7 est écrit lui aussi, ce qui prend quelques minutes, comme sur un vrai bus. Le schéma exécute alors ce que contient la mémoire, comme le participant, quand c'est l'un des programmes du produit (un autre programme, ou un programme téléchargé en partie, n'exécute rien) : modifiez un paramètre dans ETS, téléchargez, et le participant se comporte en conséquence ; téléchargez sans les adresses de groupe, et il n'envoie rien. Le designer reporte dans le projet ce que le téléchargement a laissé dans le participant (ses paramètres, ses objets de groupe et leurs adresses de groupe), pour que le scénario dise comment le participant est réellement configuré ; **Annuler** rétablit le projet précédent. Sur le schéma, un participant de fabricant ne montre que les objets de groupe liés à une adresse de groupe ou qui commandent une charge ; sa fiche les liste tous. Le fichier JSON garde toute la mémoire que le téléchargement a écrite ; la page autonome, le code à coller et le lien du lecteur laissent de côté le code d'application qu'ETS a écrit depuis le catalogue du fabricant, et gardent ce dont le participant a besoin pour fonctionner (partie système, tables, paramètres).

Les pages de paramètres du participant dans le designer sont celles d'ETS : mêmes pages, mêmes paramètres et choix, dans le même ordre, avec les noms et fonctions de ses objets de groupe. Le designer peut aussi le télécharger (menu contextuel → *Télécharger*), comme ETS le ferait.

## Pendant la liaison

- La simulation tourne en temps réel, même quand son onglet est en arrière-plan, puisqu'ETS continue d'envoyer et attend des réponses.
- Un télégramme de groupe d'ETS est refusé tant que la simulation est en pause ; il n'est pas rejoué plus tard avec d'autres. La gestion des participants par ETS (adresses individuelles, téléchargements) continue : une pause arrête les applications, pas le bus. L'une et l'autre sont refusées quand la simulation est arrêtée par une faute.
- La vitesse est **Instantané** à l'ouverture de la liaison : les télégrammes prennent le temps d'un vrai bus (environ 20 ms chacun, et autant pour chaque coupleur traversé), et les câbles qu'ils atteignent s'allument sans que rien ne se déplace. **Animé** les montre au contraire voyager au rythme du schéma : un télégramme qui traverse des coupleurs met alors quelques secondes à arriver, ce qu'ETS accepte.
- Le pas à pas n'est pas disponible.

## Limites

| Fonction | Dans BusDiagram-ETS |
| --- | --- |
| Communication de groupe (écriture, lecture, réponse) | Oui |
| Adresse individuelle en mode programmation (lecture, écriture), connexion à un participant, descripteur, fabricant et numéro de série, redémarrage | Oui : les participants du schéma répondent comme des participants à l'état de livraison ; avec la [mise en service](commissioning.html), ETS programme leur adresse individuelle avec le bouton de programmation du schéma |
| Téléchargement d'une application (mémoire, propriétés) | Oui pour les participants des fabricants importés d'un paquet (masques BCU1 et System 7) ; non pour les participants de BusDiagram, dont les paramètres et associations se règlent dans le schéma : ETS reçoit un refus |
| Moniteur de bus, KNX Secure | Non |
| Plusieurs schémas à la fois | Non, un seul à la fois |
| Pages autorisées à se relier | Fichiers du disque, pages servies sur cet ordinateur, `https://ynn.github.io` ; les autres dans les réglages |

## Réglages du programme

La partie **Réglages** de la fenêtre modifie, et conserve pour les séances suivantes :

| Réglage | Par défaut | Usage |
| --- | --- | --- |
| Port pour ETS (UDP) | 3672 | Un autre port si 3672 est pris ; saisir le même dans la connexion ETS. |
| Port pour les schémas | 3761 | Un autre port si 3761 est pris ; le schéma le demande quand il ne peut pas se relier. |
| Accepter ETS depuis un autre ordinateur du réseau | non | ETS sur un autre ordinateur se connecte à l'adresse de cet ordinateur, que la fenêtre affiche. Tout ordinateur du réseau peut alors envoyer des télégrammes au schéma ; aucune installation réelle n'est concernée. Le pare-feu doit laisser passer le port UDP. |
| Sites autorisés | aucun | Sites, en plus des fichiers, des pages locales et du site publié, dont les schémas peuvent se relier. |
| Journal détaillé | non | Chaque télégramme dans le journal. |

Quand le schéma ne joint pas le programme, sa barre d'outils propose de le télécharger, et un champ **Port** pour indiquer le port du programme s'il a été changé ; le navigateur le retient.

Les mêmes réglages existent en ligne de commande, sans être enregistrés, et `--no-gui` lance le programme dans un terminal :

```
BusDiagram-ETS.exe [--no-gui] [--ws-port 3761] [--tunnel-port 3672] [--remote-ets] [--allow-origin https://site] [--verbose]
```

Une page peut aussi fixer l'adresse du programme avec l'option `bridge`, et `bridge="none"` masque le contrôle :

```html
<bus-diagram bridge="ws://127.0.0.1:3761/ws">
```

## Pour les développeurs

Le programme est dans `ets-bridge/` (Rust) : un serveur de tunnel limité à ce qu'ETS utilise, et un WebSocket où chaque message binaire est une trame cEMI. Côté simulation, `Simulation.ingest(access, telegram)` met un télégramme externe sur le bus, et `Simulation.tap(access, fn)` donne les télégrammes à un point d'accès, `{ device: "usbInterface" }` ou `{ segment: "L1.1" }`.
