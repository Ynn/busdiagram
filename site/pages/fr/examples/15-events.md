---
title: Événements des télégrammes
summary: "Construire un journal des événements à côté du schéma."
covers: "on(\"telegram\") · bd-telegram"
translationOf: examples/15-events.md
sourceHash: "77f165e3f219"
order: 15
---
# Événements des télégrammes

`on("telegram", …)` reçoit chaque télégramme, commandes et retours d'état automatiques compris. Cette page construit un journal simple à côté du schéma.

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
    li.textContent = `${(t.timeMs / 1000).toFixed(1)} s  ${t.source} → ${t.destination} = ${t.value}  (${t.kind === "state" ? "retour d'état" : "commande"})`;
    document.getElementById("telegram-log").append(li);
  });
</script>
```

<script type="application/json" id="telegram-json">
{"formatVersion":2,"title":"Retour d'état","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Interface de boutons-poussoirs","address":"1.1.1","kind":"buttonInterface","behavior":"buttonInterface/v1","objects":[{"id":"b1","name":"Touche 1","ga":["1/1/1","1/4/1"],"dpt":"1.001","port":"switch","flags":{"W":true,"T":true},"channel":"b1"}],"channels":[{"id":"b1","label":"Entrée 1","keyLabel":"Touche 1","parameters":{"function":"switch","ledShown":true}}]},{"id":"switchActuator","name":"Actionneur de commutation","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Canal 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}},{"id":"e1","name":"État 1","ga":"1/4/1","dpt":"1.001","port":"status","channel":"s1","flags":{"W":false,"T":true}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>
