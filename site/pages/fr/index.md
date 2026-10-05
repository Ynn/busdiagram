---
title: Accueil
translationOf: index.md
sourceHash: "496d805ac0fd"
---

<div class="hero">
<div>

# BusDiagram

<p class="lead">Un outil pour concevoir des schémas pédagogiques d'installations KNX TP et KNXnet/IP : topologie, appareils, objets de communication, adresses de groupe et charges raccordées.</p>

Décrivez une installation en JSON ; le schéma est disposé d'après ses adresses et peut être intégré dans une page web ou une présentation. On peut manipuler les schémas pour suivre les télégrammes à travers la topologie. La bibliothèque tient en un seul fichier JavaScript et fonctionne hors ligne, sans serveur.

<p class="status-note"><b>Alpha.</b> BusDiagram est expérimental et encore en phase alpha de développement : il peut faire des erreurs. Vérifiez ce qu'il montre avec la documentation KNX et du matériel réel avant de vous y fier.</p>

</div>
<div>

```knx
scenario: lighting-control
attrs: fit="contain" toolbar="compact" monitor="false" description="false"
style: height:330px
tabs: none
```

</div>
</div>

## Pour commencer

1. Chargez la bibliothèque une fois, de préférence dans `<head>`. Au choix :
   - depuis le CDN jsDelivr, sans rien télécharger : utilisez la balise de l'exemple ci-dessous, qui fige la version {{version}} (voir [versions](guide/versions.html)). La page a alors besoin d'une connexion réseau ;
   - ou depuis une copie placée à côté de votre page, qui fonctionne aussi hors ligne et depuis le disque : téléchargez [bus-diagram.js](assets/bus-diagram.js?v={{version}}) et utilisez `<script src="bus-diagram.js"></script>`.
2. Placez le JSON de l'installation dans un élément `<bus-diagram>`. Le [designer](designer/index.html) peut générer ce JSON pour vous.

```html
{{cdn-tag}}

<bus-diagram>
  <script type="application/json">
    {
      "formatVersion": 2,
      "title": "My first installation",
      "lines": [{ "address": "1.1" }],
      "devices": [
        {
          "id": "pushButton",
          "name": "Push-button interface",
          "address": "1.1.1",
          "kind": "buttonInterface",
          "behavior": "buttonInterface/v1",
          "objects": [
            {
              "id": "b1",
              "name": "Key 1",
              "ga": "1/1/1",
              "dpt": "1.001",
              "port": "switch",
              "channel": "key1",
              "flags": { "W": true, "T": true }
            }
          ],
          "channels": [
            { "id": "key1", "label": "Input 1", "keyLabel": "Key 1", "parameters": { "function": "switch", "ledShown": true } }
          ]
        },
        {
          "id": "switchActuator",
          "name": "Switch actuator",
          "address": "1.1.2",
          "kind": "switchActuator",
          "behavior": "switchActuator/v1",
          "objects": [
            {
              "id": "c1",
              "name": "Channel 1",
              "ga": "1/1/1",
              "dpt": "1.001",
              "port": "switch",
              "channel": "s1",
              "flags": { "W": true, "T": false }
            }
          ],
          "channels": [
            { "id": "s1", "label": "L1", "equipment": { "type": "lamp" } }
          ]
        }
      ]
    }
  </script>
</bus-diagram>
```

Cet exemple relie une interface de boutons-poussoirs (une touche qui inverse l'état), un actionneur de commutation et une lampe sur la ligne 1.1. Le guide [premier schéma](guide/first-diagram.html) explique chaque champ.

<div class="cards">
<a href="guide/installation.html"><b>Guide</b><span>Installer la bibliothèque, décrire une installation et intégrer le schéma dans une page ou une diapositive.</span></a>
<a href="examples/index.html"><b>Exemples</b><span>Schémas d'installations types et exemples d'intégration avec du code à copier.</span></a>
<a href="reference/index.html"><b>Référence</b><span>Options, champs JSON, ports, DPT, méthodes, événements et codes d'erreur.</span></a>
<a href="designer/index.html"><b>Designer</b><span>Formulaires guidés, éditeur JSON, validation, aperçu et export.</span></a>
</div>

## Ce que montre un schéma

- **Topologie :** lignes, lignes principales, ligne de zone (backbone), répéteurs, coupleurs de segment et routeurs KNXnet/IP, disposés d'après les adresses individuelles.
- **Appareils :** boutons-poussoirs, actionneurs, passerelles, thermostats, stations météo, modules logiques et superviseurs, avec leurs objets de communication, adresses de groupe et indicateurs.
- **Charges raccordées :** lampes, éclairages à blanc variable, volets roulants et stores à lamelles, ventilateurs, appareils électriques, ballons d'eau chaude, pompes à chaleur, sirènes, groupes DALI et radiateurs reliés aux canaux des actionneurs.

## Ce que l'on peut simuler

La simulation se limite à ce qu'il faut pour expliquer le schéma. Voir [modèle et limites](guide/limits.html).

- **Commandes locales :** appuis sur les touches, appuis courts et longs, saisie de consignes.
- **Objets de communication :** changements de valeur et effet des indicateurs C, R, W, T et U.
- **Télégrammes :** écritures, lectures et réponses ; propagation sur le bus, filtrage et routage par les coupleurs, réception par les objets associés.
- **Actionneurs et charges :** sorties de commutation, lampes, volets et retours d'état.
- **Outils de mise en service :** moniteur de groupe, détails des télégrammes (champs, bits, signal TP1 et calcul de l'octet de contrôle) et un [outil d'interface USB](guide/usb-interface.html) pour les lectures et écritures de groupe.

Le **mode pas à pas** s'arrête à chaque événement et explique ce qui s'est passé.
