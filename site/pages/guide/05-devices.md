---
title: Push buttons and actuators
group: Write a scenario
order: 5
---

# Push-buttons and actuators

The built-in behaviors cover the examples in this site. See the [behavior reference](../reference/behaviors.html) for their parameters. The modeled settings follow common KNX product manuals from ABB, Hager, Schneider Electric, and Theben.

## Push-button: `pushButton/v1`

Each key can define actions for these gestures:

| Action | When | Typical use |
| --- | --- | --- |
| `press` | On activation. | Switch, toggle, or recall a scene. |
| `short` | Released before the long-press threshold. | Stop or step a shutter. |
| `long` | Held past the threshold. | Raise/lower a shutter or start dimming. |
| `release` | Released after a long press. | Stop dimming. |

The default long-press threshold is 0.5 s; set `"parameters": { "longPressMs": 800 }` on a device to change it. `press` cannot be combined with `short` or `long`. A button value can be a number or `"toggle"`: for one-bit objects, toggle inverts the **local object value**, which may differ from the lamp's actual state. The [status feedback example](../examples/status-feedback.html) shows why that matters.

```knx
scenario: status-feedback
```

`led` links a button indicator to an object value: the indicator is lit while that value is not zero. Product manuals describe two ways of making the indicator show the actual state of the load, and both can be modeled:

- **One object that also listens to the status.** The key's switching object sends on the command address and has the actuator's status address as an additional, receive-only address, with its W flag set. The indicator and the toggle then follow the load. In JSON: `"ga": ["1/1/1", "1/4/1"]` and `"led"` pointing to that object, as Key 3 of the [status feedback example](../examples/status-feedback.html).
- **A separate status object.** The key sends on an object without the W flag, and a second object (for example a `display` port with W and U) receives the status; `"led"` points to that second object.

A `"toggle"` value inverts the object that sends. With a separate status object, the model toggles from the last value sent, not from the status received; use the first form when the toggle must follow the load.

A numeric input can send a setpoint:

```json
"inputs": [{ "id": "position", "type": "number", "label": "Setpoint (%)", "object": "target", "min": 0, "max": 100, "step": 1 }]
```

Keyboard controls: Tab focuses a key; Enter or Space activates a short press, and Shift+Enter activates a long press.

## Switching actuator: `switchActuator/v1`

An actuator has one channel per output. Its object ports include `switch` (command), `status` (feedback), `scene`, and `forced`.

- **Status feedback:** when the switching state changes, the `status` object takes its value and transmits it after `statusDelayMs` (300 ms by default).
- **Metering and load shedding:** `power` (DPT 14.056, W) and `energy` (DPT 13.010, Wh) objects on a channel report the power drawn by its load and the energy counted; `totalPower` and `powerLimit` objects without a channel report the total and a power limit alarm (`powerLimitW`). Loads declare their rated power with `powerW` (lamps, dimmable lamps, fans, and `appliance` loads). A channel with `"loadShedding": true` is switched off while the limit is exceeded and switched on again after `sheddingTimeMs` if its command still requests it. Energy is counted `energyTimeScale` times faster than real time (60 by default). See the [energy metering example](../examples/energy-metering.html).
- **Relay operating mode:** `"parameters": { "relayMode": "normallyClosed" }` on a channel inverts the contact: the load is powered while the switching state is 0, for example for a light that must stay on unless a command switches it off. The switching state, status feedback, timer, scenes, and priority override keep their usual meaning; only the contact is inverted. The diagram marks such an output with an inversion circle and the label **NC** on the load wire.
- **Staircase timer:** `"parameters": { "timerMs": 10000 }` on a channel. A write of 1 closes the relay and starts a delay. `timerRetrigger` selects `"restart"` (default), `"none"`, or `"add"` (each new 1 adds a period, up to five). With `timerOffAllowed: false`, a write of 0 cannot cancel the timer. `timerWarningMs` briefly opens the output before expiry as a warning.
- **Scenes:** `"scenes": { "1": 1, "2": 0 }` on a channel defines its states. A `scene` object without a channel applies to all channels.
- **Priority override:** DPT 2.001 values 2 and 3 force off and on; 0 or 1 ends the override. Normal commands are stored during the override. `afterForcing` controls what happens afterward: `"lastCommand"` (default), `"on"`, `"off"`, `"unchanged"`, `"previous"`, or `"toggle"`.

```knx
scenario: timers
attrs: monitor="false"
```

A six-output actuator remains one KNX device. Declare six channels, using `"equipment": null` for unused outputs.

## Presence detector: `presenceDetector/v1`

A detection sends 1 through the `input` object. Each new detection restarts the hold timer (`"parameters": { "holdMs": 10000 }`); when it expires, the object sends 0. Set `retrigger: false` to avoid restarting or `sendOnEnd: false` to suppress the final 0. To model a detector that only sends 1 and relies on the actuator's timer, use `pushButton/v1` as in the [timer example](../examples/timers.html). Ambient light level is not modeled.

## Weather station: `weatherStation/v1`

A weather station sends outdoor measurements entered in its numeric `inputs`: wind speed on a `wind` object (DPT 9.005, m/s), brightness on `brightness` (DPT 9.004, lux), and temperature on `outdoorTemp` (DPT 9.001). Two one-bit outputs follow thresholds with hysteresis:

| Output port | Set when | Reset when | Parameters |
| --- | --- | --- | --- |
| `windAlarm` | wind ≥ `windThreshold` (10 m/s) | wind ≤ threshold − `windHysteresis` (2 m/s) | `windThreshold`, `windHysteresis` |
| `sunProtection` | brightness ≥ `brightnessThreshold` (40,000 lx) | brightness ≤ threshold − `brightnessHysteresis` (5,000 lx) | `brightnessThreshold`, `brightnessHysteresis` |

An output is transmitted only when its state changes. Link `windAlarm` to the `windAlarm` port of a [shutter actuator](shutters.html).

## Air quality sensor: `airQualitySensor/v1`

An air quality sensor sends temperature (`temperature`, DPT 9.001), relative humidity (`humidity`, DPT 9.007), and CO₂ concentration (`co2`, DPT 9.008) entered in its numeric `inputs`. It sets `co2Alarm` and `humidityAlarm` at their thresholds, with hysteresis, and its step controller sends a `ventilation` control value (DPT 5.001):

| Parameter | Default | Meaning |
| --- | --- | --- |
| `step1Ppm`, `step2Ppm`, `step3Ppm` | 800, 1000, 1200 | Thresholds between steps 0–1, 1–2, and 2–3. |
| `stepHysteresisPpm` | 50 | A step changes above threshold + hysteresis or below threshold − hysteresis. |
| `step0Pct` … `step3Pct` | 0, 33, 66, 100 | Control value sent in each step. |
| `minStepTimeMs` | 0 | Minimum time before the next step change. |
| `co2AlarmPpm`, `humidityAlarmPct` | 1500, 70 | Alarm thresholds. |

Connect the ventilation value to a dimming actuator channel driving a `fan` load. See the [air quality example](../examples/air-quality.html).

## Logic module: `logicGate/v1`

A logic module combines the one-bit objects on its `logicIn` port and sends the result on its `logicOut` object. The `operation` parameter selects `and`, `or`, `xor`, or `not` (which uses the first input). An input that has not received a value counts as 0. By default, the result is sent only when it changes (`sendOnChangeOnly`).

A daily time window restricts the output: with `activeFrom` and `activeTo` (HH:MM, the window may cross midnight) and a `time` object (DPT 10.001) that receives the time from a clock master, the output is 1 only inside the window. The logic module depends on the time received on the bus: without a clock master, the window stays closed. A logic module without inputs simply follows the window.

An optional `enable` object (DPT 1.003) blocks the output while it is 0; setting it back to 1 sends the current result. The [weather protection example](../examples/weather-protection.html) uses AND to apply sun protection only in automatic mode.

## Clock master: `clockMaster/v1`

A clock master sends the time of day on a `time` object (DPT 10.001: day of week and time) and the date on a `date` object (DPT 11.001), from the scenario's [simulated clock](time.html#simulated-clock). It sends shortly after start (`sendOnStart`, `startDelayMs`), every `sendPeriodMin` clock minutes aligned on the clock (1 by default; 0 disables periodic sending), and after the clock is set. Give its objects the R flag so that other devices can read the current time.

## Weekly time switch: `timeSwitch/v1`

A time switch sends programmed values on its `output` objects (DPT 1.001, 1.002, 1.003, 1.008, 5.001, 5.010, 17.001, or 20.102) at the programmed times of the simulated clock. The `program` parameter lists switching points separated by semicolons:

```json
"parameters": { "program": "Mon-Fri 07:00 = 1; Mon-Fri 22:00 = 0; Sat,Sun 08:30 = 1; Sat,Sun 23:00 = 0" }
```

Days are `Mon` … `Sun`, ranges such as `Mon-Fri`, lists such as `Sat,Sun`, or `Daily`. Unreadable entries are ignored and listed in the event log. At start and after the clock is set, the time switch sends the value of the most recent switching point (`sendOnStart`). It uses the simulated clock directly; it does not synchronize from a clock master.

## Display and supervisor: `display/v1`

A display receives and shows values through its `display` port without issuing control commands. With `"kind": "supervisor"`, it connects to the IP network by default. Its access and filtering are explained in the [topology guide](topology.html).

## USB interface: `usbInterface/v1`

This virtual device connects the [USB interface panel](usb-interface.html) to a line for group-address reads and writes.

## Passive device: `passive/v1`

A passive device stores communication-object values without additional behavior. Use it to represent a KNX device whose internal logic is outside the simulation.
