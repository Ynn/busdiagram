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
{"formatVersion":2,"title":"Toggle switch","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Push-button","address":"1.1.1","kind":"pushButton","behavior":"pushButton/v1","objects":[{"id":"b1","name":"Key 1","ga":"1/1/1","dpt":"1.001","port":"input","flags":{"W":true,"T":true}}],"buttons":[{"id":"b1","label":"Key 1","press":{"object":"b1","value":"toggle"},"led":"b1"}]},{"id":"switchActuator","name":"Switching actuator","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Channel 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>

Both elements reference the same JSON block through `scenario="#two-instances"`.
