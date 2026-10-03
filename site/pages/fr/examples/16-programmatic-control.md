---
title: Pilotage par programme
summary: "Mettre en pause, avancer, réinitialiser et lire l'état depuis des boutons de la page."
covers: "pause · advance · getState"
translationOf: examples/16-programmatic-control.md
sourceHash: ad5b1494d680
order: 16
---
# Pilotage par programme

Des boutons de la page peuvent mettre la simulation en pause, avancer son horloge, la réinitialiser et lire son état. Avancez par pas de 250 ms pour voir comment un télégramme se déplace après un appui sur la touche 1.

```html live
<p>
  <button id="c-pause">Pause</button>
  <button id="c-play">Lecture</button>
  <button id="c-adv">+ 250 ms</button>
  <button id="c-reset">Réinitialiser</button>
  <button id="c-state">Lire l'état</button>
</p>
<bus-diagram
  id="ctrl"
  scenario="#ctrl-json"
  toolbar="none"
  monitor="false"
  description="false"
></bus-diagram>
<pre
  id="ctrl-out"
  style="font-size:12px;background:#fff;padding:8px;border:1px solid #dedbd2;border-radius:8px"
></pre>
<script>
  const sim = document.getElementById("ctrl");
  const $ = (id) => document.getElementById(id);
  $("c-pause").onclick = () => sim.pause();
  $("c-play").onclick = () => sim.play();
  $("c-adv").onclick = () => sim.advance(250);
  $("c-reset").onclick = () => sim.reset();
  $("c-state").onclick = () => {
    const s = sim.getState();
    $("ctrl-out").textContent =
      `t = ${s.timeMs} ms, en pause : ${s.paused}\nL1 : ${s.equipment["switchActuator/s1"].state.on ? "allumée" : "éteinte"}\nObjet de la touche 1 = ${s.objects["pushButton/b1"].value}`;
  };
</script>
```

<script type="application/json" id="ctrl-json">
{"formatVersion":2,"title":"Pilotage","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Interface de boutons-poussoirs","address":"1.1.1","kind":"buttonInterface","behavior":"buttonInterface/v1","objects":[{"id":"b1","name":"Touche 1","ga":"1/1/1","dpt":"1.001","port":"switch","flags":{"W":true,"T":true},"channel":"b1"}],"channels":[{"id":"b1","label":"Entrée 1","keyLabel":"Touche 1","parameters":{"function":"switch","ledShown":true}}]},{"id":"switchActuator","name":"Actionneur de commutation","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Canal 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>

Mettez en pause, appuyez sur la touche 1 et avancez par pas de 250 ms pour suivre le télégramme à travers l'installation.
