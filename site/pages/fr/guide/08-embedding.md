---
title: Intégrer dans une page
translationOf: guide/08-embedding.md
sourceHash: "815ca69e9dc4"
order: 8
---
# Intégrer dans une page

Chargez la bibliothèque une fois, depuis une copie placée à côté de votre page ou depuis le CDN (voir [installation](installation.html)), puis fournissez un scénario de l'une des trois façons suivantes.

## JSON en ligne

```html
<bus-diagram>
  <script type="application/json">
    { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

Le JSON en ligne garde le scénario avec le composant et fonctionne hors ligne. Le navigateur traite le script comme des données et non comme du JavaScript exécutable.

## Un autre bloc JSON ou un fichier

```html
<bus-diagram scenario="#example-scenario"></bus-diagram>
<script type="application/json" id="example-scenario">
  { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
</script>

<bus-diagram src="scenarios/status-feedback.json"></bus-diagram>
```

Un fichier `src` demande un serveur HTTP dans les navigateurs qui restreignent la lecture des fichiers locaux `file://`. Si `src` change plusieurs fois, seule la dernière requête est appliquée.

## JavaScript

```js
const diagram = BusDiagram.create("#example", scenario, {
  monitor: false,
  toolbar: "compact",
});
diagram.on("telegram", (telegram) => console.log(telegram.destination));
```

L'argument `scenario` peut être un objet, l'URL d'un JSON ou un sélecteur `#id` d'un bloc JSON. Voir l'[API JavaScript](api.html).

## Options d'affichage

Les options se règlent par des attributs HTML ou des propriétés JavaScript. Voir la [référence des options](../reference/options.html).

```html
<bus-diagram toolbar="compact" monitor="false" description="false" speed="0.35"></bus-diagram>
```

```knx
scenario: shutter-control
attrs: toolbar="compact" monitor="false" description="false"
tabs: html
```

## Ouvrir dans le designer

La barre d'outils d'un schéma se termine par une icône qui ouvre le schéma dans le [designer](designer.html), dans un nouvel onglet, pour l'examiner ou le modifier. Le scénario voyage compressé dans le lien, après `#` : il n'est envoyé à aucun serveur. Par défaut, l'icône ouvre le designer publié ; l'attribut `designer` donne une autre adresse, comme une copie du designer à côté de vos pages pour travailler hors ligne, et `designer="none"` masque l'icône :

```html
<bus-diagram designer="designer/index.html"></bus-diagram>
```

## Plusieurs schémas

Une page peut afficher plusieurs instances, même avec le même scénario. Chacune a son horloge et son état indépendants. Voir l'[exemple à deux instances](../examples/two-instances.html).

## Markdown d'un site statique

La plupart des générateurs de sites statiques acceptent des éléments HTML dans le Markdown, certains demandant un réglage explicite. Gardez le `<bus-diagram>` et son `<script>` JSON imbriqué dans le même bloc HTML. Chargez le fichier une fois depuis la mise en page du site :

```html
<script defer src="assets/bus-diagram.js"></script>
```

Si une plateforme de contenu supprime les scripts, publiez une [page autonome](viewer.html) et faites un lien vers elle ou intégrez-la dans une iframe.
