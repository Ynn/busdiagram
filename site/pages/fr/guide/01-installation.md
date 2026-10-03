---
title: Installation
translationOf: guide/01-installation.md
sourceHash: 05c839992fb5
order: 1
---

# Installation

La bibliothèque est livrée en un seul fichier, `bus-diagram.js`. Elle ne charge aucune ressource externe et ne contacte aucun serveur. Hébergée à côté de vos pages, elle fonctionne hors ligne, y compris quand une page est ouverte directement depuis le disque avec `file://`. Cette documentation décrit la version {{version}}.

## Obtenir le fichier

- **Téléchargement :** utilisez le bouton Télécharger en haut de cette page ou **Exporter → Bibliothèque bus-diagram.js** dans le [designer](../designer/index.html).
- **npm :** `npm install bus-diagram` installe le script classique (`dist/bus-diagram.js`), le module ES (`dist/bus-diagram.esm.js`) et les déclarations TypeScript.
- **CDN :** chargez une version exacte depuis jsDelivr (voir plus bas). La page a alors besoin d'une connexion réseau.
- **Compilation depuis les sources :** lancez `npm install` puis `npm run build`. Le fichier est écrit dans `dist/bus-diagram.js` et copié dans `demo/` et `docs/assets/`.

## L'ajouter à une page

Chargez le script une fois, de préférence dans `<head>` :

```html
<script src="bus-diagram.js"></script>
```

Le chemin est relatif à votre fichier HTML. Pour une page dans `example/` et le fichier dans `example/assets/`, utilisez `src="assets/bus-diagram.js"`.

Pour le charger plutôt depuis le CDN, utilisez cette balise, qui fige la version {{version}} :

```html
{{cdn-tag}}
```

L'URL contient le numéro de version complet : la page garde la bibliothèque pour laquelle elle a été écrite quand de nouvelles versions sont publiées. L'attribut `integrity` fait refuser au navigateur un fichier qui diffère de celui publié. L'export **Exporter → Code à coller dans une page** du designer produit la même balise. Voir [versions et publications](versions.html) avant de changer de version.

L'attribut `defer` est pris en charge. Chargez les [scripts d'extension](extensions.html) après la bibliothèque.

## Vérifier le résultat

Copiez un exemple de la [galerie](../examples/index.html) depuis son onglet HTML, puis ouvrez la page. Si le schéma n'apparaît pas :

| Symptôme | Que vérifier |
| --- | --- |
| Rien n'apparaît | Vérifiez le chemin vers `bus-diagram.js` dans la console du navigateur (F12). |
| Un panneau rouge « Scénario invalide » apparaît | Le JSON a été lu mais n'a pas passé la validation. Chaque erreur indique le chemin de son champ ; voir [Erreurs](errors.html). |
| « JSON invalide … ligne N » apparaît | Cherchez une virgule ou un guillemet manquant. Le [designer](designer.html) met l'endroit en évidence. |

## Navigateurs

Utilisez une version à jour de Chrome, Edge, Firefox ou Safari. La bibliothèque utilise les Web Components et du JavaScript moderne. Internet Explorer et les diapositives PowerPoint ne sont pas pris en charge ; voir [Diapositives](slides.html) pour des présentations web.
