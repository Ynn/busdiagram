---
title: Two independent diagrams
group: Integration
summary: "The same installation twice, each with its own clock and state."
covers: "Several instances"
order: 13
---

# Two independent diagrams

The same installation appears twice. Each diagram has its own clock, objects, and monitor, so you can compare two states or settings.

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
{"formatVersion":2,"title":"Toggle switch","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Push-button interface","address":"1.1.1","kind":"buttonInterface","behavior":"buttonInterface/v1","objects":[{"id":"b1","name":"Key 1","ga":"1/1/1","dpt":"1.001","port":"switch","flags":{"W":true,"T":true},"channel":"b1"}],"channels":[{"id":"b1","label":"Input 1","keyLabel":"Key 1","parameters":{"function":"switch","ledShown":true}}]},{"id":"switchActuator","name":"Switching actuator","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Channel 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>

Both elements reference the same JSON block through `scenario="#two-instances"`.
