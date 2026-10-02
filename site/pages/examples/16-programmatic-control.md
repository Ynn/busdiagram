---
title: Programmatic control
group: Integration
summary: "Pause, advance, reset, and read the state from page buttons."
covers: "pause · advance · getState"
order: 16
---

# Programmatic control

Page buttons can pause the simulation, advance its clock, reset it, and read its state. Step forward by 250 ms to see how a telegram moves after pressing Key 1.

```html live
<p>
  <button id="c-pause">Pause</button>
  <button id="c-play">Play</button>
  <button id="c-adv">+ 250 ms</button>
  <button id="c-reset">Reset</button>
  <button id="c-state">Read state</button>
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
      `t = ${s.timeMs} ms, paused: ${s.paused}\nL1: ${s.equipment["switchActuator/s1"].state.on ? "on" : "off"}\nKey 1 object = ${s.objects["pushButton/b1"].value}`;
  };
</script>
```

<script type="application/json" id="ctrl-json">
{"formatVersion":2,"title":"Control","lines":[{"address":"1.1"}],"devices":[{"id":"pushButton","name":"Push-button interface","address":"1.1.1","kind":"buttonInterface","behavior":"buttonInterface/v1","objects":[{"id":"b1","name":"Key 1","ga":"1/1/1","dpt":"1.001","port":"switch","flags":{"W":true,"T":true},"channel":"b1"}],"channels":[{"id":"b1","label":"Input 1","keyLabel":"Key 1","parameters":{"function":"switch","ledShown":true}}]},{"id":"switchActuator","name":"Switching actuator","address":"1.1.2","kind":"switchActuator","behavior":"switchActuator/v1","objects":[{"id":"c1","name":"Channel 1","ga":"1/1/1","dpt":"1.001","port":"switch","channel":"s1","flags":{"W":true,"T":false}}],"channels":[{"id":"s1","label":"L1","equipment":{"type":"lamp"}}]}]}
</script>

Pause, press Key 1, and advance in 250 ms steps to follow the telegram through the installation.
