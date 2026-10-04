---
title: Time and step mode
group: Simulation model
order: 13
---

# Time and step mode

## Observable timing

The simulation slows telegram propagation so each event can be inspected. These values are model settings, not physical KNX bus timings. For comparison, on a twisted-pair line at 9600 bit/s, a switching telegram and its acknowledgement occupy the bus for about 20 ms.

| Event | Simulated delay |
| --- | --- |
| Object transmission onto the bus | 550 ms |
| Between adjacent devices on a line | 250 ms |
| Coupler input, decision, and output | 150 + 900 + 150 ms |
| Bus arrival at a receiving object | 500 ms |
| Default status feedback or motor start | 300 ms |

A lamp or motor changes only after the receiving object processes the telegram.

## Speed and pause

Speed controls multiply simulated time: slower, normal, faster, and ×5. The button long-press threshold (`longPressMs`, 0.5 s by default) uses real time. While paused, a button press is registered but its telegram waits for simulation time to resume. A hidden tab or slide pauses without later catching up.

## Simulated clock

A scenario can declare a simulated wall clock. Clock masters, time switches, and time windows use it:

```json
"clock": { "start": "2026-09-28T21:57:00", "speed": 60 }
```

- `start` is the local date and time at the start of the simulation, without a time zone.
- `speed` is the number of clock seconds per simulated second (1 by default, at most 3600). With 60, one clock minute passes every simulated second.

The clock follows simulated time: it stops while the simulation is paused, and the speed controls apply to it as to everything else. With a clock, simulated time keeps running even when the bus is idle.

The diagram shows the date and time in a bar at the top left of the diagram area, above the drawing. **Set time** opens a field to move the clock to another date and time, for example just before a programmed switching point; devices then send the time again and reschedule their programs. From JavaScript, `diagram.setClock("2026-10-01T06:59:30")` does the same. A clock master answers a read (R flag) with the time and date of that moment, not those of its last broadcast.

## Step mode

Step mode stops at explanatory events, including telegram transmission, a coupler's route/filter decision, an object's acceptance or rejection due to W, output changes, and timer expiry. Press **Next** to continue to the following event.

## Timeline

The `timeline` option shows, below the diagram, up to four traces on the axis of simulated time: object values and on/off states as steps, room temperatures, openings, and levels as curves, and the telegrams of a traced object as marks. Every event is recorded at its own time, whatever the speed, also in step mode. It helps to read what depends on time: a staircase timer, PWM, a control loop, a priority. Name the first traces in the option, then add or remove them from its menu:

```html
<bus-diagram src="room-heating.json"
  timeline="livingThermostat/temp livingThermostat/val heatingActuator:h1 @livingRoom"></bus-diagram>
```

`device/object` traces an object, `device:channel` the equipment of an output, and `@room` the temperature of a room. See the [heating example](../examples/hvac.html).

## Determinism

Time advances in whole milliseconds through an event queue. Advancing by 20 seconds in one call or in smaller steps gives the same final state for the same inputs.
