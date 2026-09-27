---
title: JavaScript API
group: For developers
order: 11
---

# JavaScript API

The bundle exposes `window.BusDiagram`. The [API reference](../reference/api.html) lists all methods; this chapter shows common tasks.

## Create a diagram

```js
const diagram = BusDiagram.create("#diagram", scenario, { toolbar: "compact" });
```

The target may be a selector or an element. A `<bus-diagram>` target is reused; for another element, the method adds a component inside it. The scenario may be a JSON object, a JSON URL, or a `#id` reference to a JSON block. The returned value is the component itself. See the [options reference](../reference/options.html).

## Control simulated time

```js
diagram.pause();
diagram.advance(1300); // Advance 1.3 simulated seconds, even while paused.
diagram.play();
diagram.reset();
diagram.setSpeed(0.35);
diagram.stepToNextEvent();
```

See the [programmatic control example](../examples/programmatic-control.html).

## Read state

```js
const state = diagram.getState();
state.timeMs;
state.objects["pushButton/key1"].value;
state.channels["shutter/s1"].state.estimatedPositionPct;
state.equipment["shutter/s1"].state.positionPct;
```

`getState()` returns a serializable copy. Editing it does not change the simulation.

## Subscribe to events

```js
diagram.on("telegram", (telegram) => {
  console.log(telegram.source, telegram.destination, telegram.value);
});
diagram.on("error", (error) => console.warn(error.message, error.details));
```

Each telegram produces one event, including automatic status feedback. The component also emits DOM events such as `bd-telegram`, `bd-ready`, and `bd-error`. See the [event example](../examples/events.html).

## Use the USB interface

If the scenario contains a USB interface, these methods send group telegrams from it:

```js
diagram.groupWrite("1/1/1", 1);
diagram.groupRead("1/4/1");
```

See the [USB interface guide](usb-interface.html).

## Act on a room

In a [heating scenario](hvac.html), `roomAction` can open a window or change outside temperature:

```js
diagram.roomAction("living", "window", 1);
diagram.getState().rooms.living.temperatureC;
```

## Set the simulated clock

In a scenario with a [simulated clock](time.html#simulated-clock), `setClock` moves it to another local date and time; `getState().clock` returns the current clock time and speed:

```js
diagram.setClock("2026-10-01T06:59:30");
new Date(diagram.getState().clock.nowMs).toISOString(); // clock time, read as UTC fields
```

## Use the engine without a page

`createSimulator(json)` from `src/core.ts` creates a DOM-free simulation for tests or tools. It exposes `input()`, `groupWrite()`, `groupRead()`, `advance()`, `getState()`, and `subscribe()`.
