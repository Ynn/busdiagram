---
title: Telegram events
group: Integration
summary: "Build an event log next to the diagram."
covers: "on(\"telegram\") · bd-telegram"
order: 15
---

# Telegram events

`on("telegram", …)` receives every telegram, including commands and automatic status feedback. This page builds a simple event log beside the diagram.

```html live
<bus-diagram
  id="telegram-sim"
  scenario="#telegram-json"
  monitor="false"
  toolbar="compact"
  description="false"
></bus-diagram>
<ol
  id="telegram-log"
  style="font-family:monospace;font-size:13px;max-height:180px;overflow:auto"
></ol>
<script>
  document.getElementById("telegram-sim").on("telegram", (t) => {
    const li = document.createElement("li");
    li.textContent = `${(t.timeMs / 1000).toFixed(1)} s  ${t.source} → ${t.destination} = ${t.value}  (${t.kind === "state" ? "status feedback" : "command"})`;
    document.getElementById("telegram-log").append(li);
  });
</script>
```

<script type="application/json" id="telegram-json">
{"formatVersion":2,"title":"Status feedback","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Push-button interface","address":"1.1.1","kind":"buttonInterface","behavior":"buttonInterface/v1","objects":[{"id":"b1","name":"Key 1","ga":["1/1/1","1/4/1"],"dpt":"1.001","port":"switch","flags":{"W":true,"T":true},"channel":"b1"}],"channels":[{"id":"b1","label":"Input 1","keyLabel":"Key 1","parameters":{"function":"switch","ledShown":true}}]},{"id":"switchActuator","name":"Switching actuator","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Channel 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}},{"id":"e1","name":"Status 1","ga":"1/4/1","dpt":"1.001","port":"status","channel":"s1","flags":{"W":false,"T":true}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>
