---
title: Deux schémas indépendants
summary: "La même installation deux fois, chacune avec son horloge et son état."
covers: "Plusieurs instances"
translationOf: examples/13-two-instances.md
sourceHash: "850d8699b088"
order: 13
---
# Deux schémas indépendants

La même installation apparaît deux fois. Chaque schéma a son horloge, ses objets et son moniteur : vous pouvez comparer deux états ou deux réglages.

```html live
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
  <bus-diagram
    scenario="#two-instances"
    toolbar="compact"
    monitor="false"
    description="false"
  ></bus-diagram>
  <bus-diagram
    scenario="#two-instances"
    toolbar="compact"
    monitor="false"
    description="false"
  ></bus-diagram>
</div>
```

<script type="application/json" id="two-instances">
{"formatVersion":2,"title":"Interrupteur en bascule","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Interface de boutons-poussoirs","address":"1.1.1","kind":"buttonInterface","behavior":"buttonInterface/v1","objects":[{"id":"b1","name":"Touche 1","ga":"1/1/1","dpt":"1.001","port":"switch","flags":{"W":true,"T":true},"channel":"b1"}],"channels":[{"id":"b1","label":"Entrée 1","keyLabel":"Touche 1","parameters":{"function":"switch","ledShown":true}}]},{"id":"switchActuator","name":"Actionneur de commutation","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Canal 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>

Les deux éléments désignent le même bloc JSON par `scenario="#two-instances"`.
