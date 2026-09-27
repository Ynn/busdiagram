---
title: Display options
order: 1
---

# Display options

An option can be set as an HTML attribute (`monitor="false"`) or as a JavaScript property (`{ monitor: false }`). JavaScript options take precedence. Invalid values are ignored. Boolean attributes accept `true`, `false`, or the attribute by itself for true.

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
