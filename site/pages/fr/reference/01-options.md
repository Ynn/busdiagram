---
title: Options d'affichage
translationOf: reference/01-options.md
sourceHash: "c1426ab32aff"
order: 1
---
# Options d'affichage

Une option se règle par un attribut HTML (`monitor="false"`) ou par une propriété JavaScript (`{ monitor: false }`). Les options JavaScript l'emportent. Les valeurs invalides sont ignorées. Les attributs booléens acceptent `true`, `false`, ou l'attribut seul pour vrai.

```html
<bus-diagram fit="contain" toolbar="compact" monitor="false" style="height:520px"></bus-diagram>
```

```js
const diagram = BusDiagram.create("#diagram", scenario, {
  fit: "contain",
  toolbar: "compact",
  monitor: false,
});
diagram.options = { monitor: true }; // Change an option later.
```

{{options}}
