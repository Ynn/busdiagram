---
title: Langues
translationOf: guide/10-languages.md
sourceHash: 4a44f2ded770
order: 10.5
---
# Langues

Le composant et le designer sont livrés en anglais et en français, et acceptent d'autres langues par des catalogues de traductions. L'anglais est la langue source ; les autres langues sont fournies par des catalogues. Les titres des scénarios, les noms des appareils et les autres valeurs du JSON des scénarios sont des contenus de l'auteur et ne sont pas traduits automatiquement.

## Choisir une langue

Le composant utilise l'attribut `lang` le plus proche, sur lui-même ou sur un ancêtre :

```html
<html lang="en">
  <bus-diagram src="scenarios/lighting-control.json"></bus-diagram>
</html>
```

Mettez `lang="fr"` sur un composant pour afficher cette instance en français. Sans langue explicite, le composant peut utiliser la langue du navigateur ; l'anglais sert de repli pour les langues non prises en charge. Le designer a son propre sélecteur de langue et mémorise la langue choisie.

| Contexte | Réglage de la langue |
| --- | --- |
| Page HTML ou diapositive dans le navigateur | `lang` sur la page, le conteneur ou le composant. |
| Export autonome | Langue choisie dans le designer. |
| Lecteur | Langue dans son lien ou `player.html?lang=fr#d=…`. |
| Moteur sans DOM | `createSimulator(json, { lang: "fr" })`. |
| Validation | `buildScenario(json, undefined, BusDiagram.translator("fr"))`. |

## Ajouter une langue

Un catalogue associe des messages anglais à leur traduction. Les emplacements numérotés comme `{0}` et `{1}` conservent les valeurs interpolées :

```js
BusDiagram.registerMessages("de", {
  "Group monitor": "Gruppenmonitor",
  "unknown channel “{0}” in {1}": "unbekannter Kanal „{0}“ in {1}",
});
```

Chargez le catalogue après la bibliothèque et choisissez `<html lang="de">`. Un code régional comme `de-AT` utilise `de-AT`, puis `de`, puis l'anglais : les messages manquants se replient sur l'anglais. `BusDiagram.availableLanguages()` liste les codes de langue enregistrés ; le designer propose chacun d'eux dans son sélecteur de langue, sous son propre nom (« Deutsch »).

Les textes français sont répartis selon leur origine : `src/i18n/fr.ts` pour le schéma et le moteur, `site/designer/fr.ts` pour le designer, et, pour chaque participant ou équipement, ses propres catalogues (`src/participants/<nom>/messages.fr.ts` pour la bibliothèque, `designer.fr.ts` pour le designer ; `src/equipment/<nom>/messages.fr.ts`). Une langue complète fournit les mêmes fichiers dans sa langue.

## Messages d'une extension

Une extension peut traduire ses propres messages d'état par `ctx.t` :

```js
ctx.note(ctx.t`${label}: scheduled to switch on in ${delay} s`);
BusDiagram.registerMessages("fr", {
  "{0}: scheduled to switch on in {1} s": "{0} : allumage prévu dans {1} s",
});
```

Les titres déclarés dans les définitions de comportements et d'équipements sont traduits par le même catalogue lorsqu'il les contient. Un participant livré déclare ses catalogues dans ses entrées, par langue (`messages: { fr: …, de: … }`), et peut apporter une langue absente du reste de la bibliothèque : ses textes sont traduits, les autres se replient sur l'anglais.
