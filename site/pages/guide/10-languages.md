---
title: Languages
group: Integrate
order: 10.5
---

# Languages

The component and designer are delivered in English and French, and accept other languages through locale catalogs. English is the source language; the other languages are supplied by catalogs. Scenario titles, device names, and other values in scenario JSON are author-controlled content and are not translated automatically.

## Select a language

The component uses the nearest `lang` attribute on itself or an ancestor:

```html
<html lang="en">
  <bus-diagram src="scenarios/lighting-control.json"></bus-diagram>
</html>
```

Set `lang="fr"` on one component to show that instance in French. Without an explicit language, the component can use the browser locale; English is the fallback for unsupported languages. The designer has its own language selector and remembers the chosen language.

| Context | Language setting |
| --- | --- |
| HTML page or browser-based slide | `lang` on the page, container, or component. |
| Standalone export | Language selected in the designer. |
| Player | Language in its link or `player.html?lang=fr#d=…`. |
| DOM-free engine | `createSimulator(json, { lang: "fr" })`. |
| Validation | `buildScenario(json, undefined, BusDiagram.translator("fr"))`. |

## Add a locale

A catalog maps English messages to translated text. Numbered slots such as `{0}` and `{1}` preserve interpolated values:

```js
BusDiagram.registerMessages("de", {
  "Group monitor": "Gruppenmonitor",
  "unknown channel “{0}” in {1}": "unbekannter Kanal „{0}“ in {1}",
});
```

Load the catalog after the library and select `<html lang="de">`. A regional code such as `de-AT` uses `de-AT`, then `de`, then English: missing messages fall back to English. `BusDiagram.availableLanguages()` lists registered language codes; the designer offers each of them in its language selector, under its own name ("Deutsch").

The French wording is split by origin: `src/i18n/fr.ts` for the diagram and the engine, `site/designer/fr.ts` for the designer, and, for each participant or equipment, its own catalogs (`src/participants/<name>/messages.fr.ts` for the library, `designer.fr.ts` for the designer; `src/equipment/<name>/messages.fr.ts`). A complete locale gives the same files in its language.

## Messages in an extension

An extension can localize its own status messages through `ctx.t`:

```js
ctx.note(ctx.t`${label}: scheduled to switch on in ${delay} s`);
BusDiagram.registerMessages("fr", {
  "{0}: scheduled to switch on in {1} s": "{0} : allumage prévu dans {1} s",
});
```

Titles declared in behavior and equipment definitions are translated by the same catalog when it contains them. A delivered participant declares its catalogs in its entries, by language (`messages: { fr: …, de: … }`), and may bring a language that the rest of the library lacks: its texts are translated, the others fall back to English.
