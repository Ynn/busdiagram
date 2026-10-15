---
title: Liaison à ETS
translationOf: guide/07-ets.md
sourceHash: "1ec8a420f48c"
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

## Pendant la liaison

- La simulation tourne en temps réel, même quand son onglet est en arrière-plan, puisqu'ETS continue d'envoyer et attend des réponses.
- Un télégramme d'ETS est refusé tant que la simulation est en pause ; il n'est pas rejoué plus tard avec d'autres.
- La vitesse est **Instantané** à l'ouverture de la liaison : les télégrammes prennent le temps d'un vrai bus (environ 20 ms chacun, et autant pour chaque coupleur traversé), et les câbles qu'ils atteignent s'allument sans que rien ne se déplace. **Animé** les montre au contraire voyager au rythme du schéma : un télégramme qui traverse des coupleurs met alors quelques secondes à arriver, ce qu'ETS accepte.
- Le pas à pas n'est pas disponible.

## Limites

| Fonction | Dans BusDiagram-ETS |
| --- | --- |
| Communication de groupe (écriture, lecture, réponse) | Oui |
| Gestion des participants (adresse individuelle, téléchargement d'une application) | Non : les participants du schéma se règlent dans le schéma, pas depuis ETS |
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
