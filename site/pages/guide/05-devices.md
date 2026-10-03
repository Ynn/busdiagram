---
title: Push buttons and actuators
group: Write a scenario
order: 5
---

# Push-buttons and actuators

The built-in behaviors cover the examples in this site. See the [behavior reference](../reference/behaviors.html) for their parameters. The modeled settings follow common KNX product manuals from ABB, Hager, Schneider Electric, and Theben.

## Push-button interface: `buttonInterface/v1`

Push-buttons are modeled as a push-button interface (binary input), placed behind conventional push-buttons as the interfaces used in training kits. Each **channel is a contact input**, drawn as a key on the diagram; the key shows `keyLabel`, the text written on the push-button, or else the label of the input. The key reports when it is pressed and released, as a contact; when it is held past the long-press time of its input (`longPressMs`, 0.5 s by default), a bar under the keys fills up and the input receives the long press. Click for a short press, hold for a long press; with the keyboard, Tab focuses a key, which stays pressed while Enter or Space is held.

The `function` parameter of each input decides its behavior and its group objects; in the designer, choosing a function creates its objects:

| Function | Behavior | Ports |
| --- | --- | --- |
| `switch` | One action when the contact closes (`onPress`) and one when it opens (`onRelease`): `on`, `off`, `toggle`, or `none`. With `switchLongPress`, one action for a short press (`onShort`) and one for a long press (`onLong`). | `switch` (1.001) |
| `dim` | `dimMode: "single"`: a short press toggles, a long press dims brighter when the light is off and otherwise the other way than last time, release stops. `"brighter"` and `"darker"` share the work between two keys. `dimStep` sets the step code (100 % dims until release). | `switch` (1.001), `dim` (3.007) |
| `blind` | A long press moves, a short press stops or steps. `blindMode: "single"` alternates the direction at each movement; `"up"` and `"down"` are the keys of a pair. With `stopOnRelease`, releasing the key stops the blind (hold to move). | `move` (1.008), `stopStep` (1.007) |
| `value` | Sends `shortValue`, or `longValue` after a long press; without `longValue`, the value is sent at once. | `value` (5.001, 5.004, 5.010, 7.600, 9.001, 20.102) |
| `scene` | A short press recalls `sceneNumber`; with `sceneStore`, a long press stores it (DPT 18.001 with the learn bit). | `value` (17.001 or 18.001) |

The push-button wired to an input is normally open (it closes when pressed); a normally closed one is declared on the channel with `"keyContact": "normallyClosed"`, as part of the installation. The input expects a closed contact when actuated (`actuatedContact: "closed"`), or an open one (`"open"`) for a normally closed push-button. When the two disagree, presses and releases are seen the wrong way round (at rest, the input sees the key held, and a long press after its threshold), and a configuration warning is shown.

`toggle` inverts the **value of the switching object**, which may differ from the lamp's actual state. The `switch` and `move` objects have the W flag by default: when they also listen to the status of the load, as an additional receive-only address (`"ga": ["1/1/1", "1/4/1"]`), toggling and one-key dimming or blind start from the real state, and the LED of the key shows it. The [status feedback example](../examples/status-feedback.html) shows why that matters.

```knx
scenario: status-feedback
```

Each input also has:

- **Lock:** a `lock` object (1 = locked). While locked, presses are ignored; `lockStart` and `lockEnd` (or `blindLockStart` and `blindLockEnd`) send a reaction when the lock starts and ends, `lockEnd: "update"` sends the current value again.
- **Bus voltage recovery:** `busRecovery` (or `blindBusRecovery`) sends a reaction when the bus voltage returns, after `busRecoveryDelayMs`. See [bus voltage](#bus-voltage-failure-and-recovery).
- **Cyclic sending:** `cyclicMs` sends the switching object again at an interval; `cyclicWhen` limits it to 1 or 0.
- **LED:** a key has an LED only with `ledShown: true`. The LED shows the `led` object when it is enabled, otherwise the switching object of a switching or dimming input; `ledInverted` lights it for 0.

The objects of each input form a fixed block of seven numbers (switching, dimming, up/down, stop/step, value, lock, LED), whatever its function, as in the product dialogs. The input count is set on the Configuration page of the designer.

```knx
scenario: push-button-interface
```

## Switching actuator: `switchActuator/v1`

An actuator has one channel per output. Its object ports include `switch` (command), `status` (feedback), `scene`, and `forced`.

- **Alarms:** an `intrusionAlarm` object makes the output blink (`blinkMs`, 1 s by default), a `fireAlarm` object forces it on and steady; fire has priority over intrusion, and both over forcing and the lock. Commands received meanwhile are stored without effect; when the last alarm ends, `afterAlarm` sets the state (the last command by default). Link these objects to the stored alarms of an [alarm module](#alarm-module-alarmmodule-v1).

- **Status feedback:** when the switching state changes, the `status` object takes its value and transmits it after `statusDelayMs` (300 ms by default).
- **Metering and load shedding:** `power` (DPT 14.056 in W, or 9.024 in kW) and `energy` (DPT 13.010 in Wh, or 13.013 in kWh) objects on a channel report the power drawn by its load and the energy counted; `totalPower` and `powerLimit` objects without a channel report the total and a power limit alarm (`powerLimitW`). Loads declare their rated power with `powerW` (lamps, dimmable lamps, fans, `appliance` and `siren` loads, the element of a `waterHeater`, which draws it only while its own thermostat heats, and `electricPowerW` for a `heatPump` while its compressor runs). A channel with `"loadShedding": true` is switched off while the limit is exceeded and switched on again after `sheddingTimeMs` if its command still requests it. Energy is counted `energyTimeScale` times faster than real time (60 by default). See the [energy metering example](../examples/energy-metering.html).
- **Relay operating mode:** `"parameters": { "relayMode": "normallyClosed" }` on a channel inverts the contact: the load is powered while the switching state is 0, for example for a light that must stay on unless a command switches it off. The switching state, status feedback, timer, scenes, and priority override keep their usual meaning; only the contact is inverted. The diagram marks such an output with an inversion circle and the label **NC** on the load wire.
- **Staircase timer:** `"parameters": { "timerMs": 10000 }` on a channel. A write of 1 closes the relay and starts a delay. `timerRetrigger` selects `"restart"` (default), `"none"`, or `"add"` (each new 1 adds a period, up to five). With `timerOffAllowed: false`, a write of 0 cannot cancel the timer. `timerWarningMs` briefly opens the output before expiry as a warning.
- **Scenes:** `"scenes": { "1": 1, "2": 0 }` on a channel defines its states. A `scene` object without a channel applies to all channels. A scene control object (DPT 18.001) also accepts storing: a telegram with the learn bit (value + 128) stores the current state of each channel as the scene, until the simulation restarts; `sceneLearning: false` refuses it.
- **Priority override:** DPT 2.001 values 2 and 3 force off and on; 0 or 1 ends the override. Normal commands are stored during the override. `afterForcing` controls what happens afterward: `"lastCommand"` (default), `"on"`, `"off"`, `"unchanged"`, `"previous"`, or `"toggle"`.
- **Lock:** a `lock` object (1 = locked) holds the output in the state set by `lockStart` (`"unchanged"`, `"on"`, or `"off"`); commands are stored meanwhile, and `afterLock` takes the same values as `afterForcing`. Forcing has priority over the lock.
- **Switching delays:** `onDelayMs` and `offDelayMs` delay the commands of the `switch` object; the opposite command received during a delay cancels it. Scenes, forcing, and the lock act at once.
- **Logic link:** a `logic` object is combined with the switching command by `logicOperation`: `"and"` switches on only while it is 1 (an enable), `"or"` switches on while either is 1. Until it receives a value, the command acts alone.
- **Bus voltage:** `busFailure` sets the output when the bus voltage fails (`"unchanged"`, `"off"`, `"on"`); `busRecovery` sets it when the voltage returns (`"previous"`: the state before the failure, `"off"`, `"on"`), then the status is sent.

```knx
scenario: timers
attrs: monitor="false"
```

## Bus voltage failure and recovery

Click the **PSU** label of a line or segment on the diagram to cut its bus voltage, and again to restore it; programmatically, `sim.setBusVoltage("L1.2", false)` (`L1.2b` for the segment behind an extension). The line is drawn grey and dashed, and its devices are greyed:

- each device first runs its bus failure behavior (`busFailure` of a switch actuator, a dimmer or DALI channel, or a shutter actuator, which stops its motors by default), then stops: its timers are cancelled, it neither receives nor sends, and its keys do nothing;
- couplers do not forward telegrams to the segment; the journal notes why;
- couplers check the voltage when a telegram reaches them: a telegram already on its way does not cross a segment cut before it gets there, and does not reach what lies behind it;
- when the voltage returns, each device runs its recovery behavior (`busRecovery` of a switch actuator, a dimmer or DALI channel, a shutter actuator, or a push-button interface) and restarts; actuators send their status again. A device keeps what it stores (stored alarms, commands received, meter index, learned scenes): its periodic tasks start again (cyclic sending, clock broadcast, PWM, metering), a pending deadline runs a whole period again (presence hold time, comfort extension, rain delay), a time switch applies a switching point passed during the failure, and a forcing, a lock, or an alarm still active acts on its output again. These reactions are choices of the model: the KNX application description of shutter actuators, for example, leaves the behavior at bus voltage failure and recovery to the manufacturer.

The simulation starts with the installation already in operation: recovery reactions run only after a failure cut in the diagram, not at start. See the [bus voltage example](../examples/bus-voltage.html).

```knx
scenario: bus-voltage
```

A six-output actuator remains one KNX device. Declare six channels, using `"equipment": null` for unused outputs. An output that supplies several loads lists them: `"equipment": [{ "type": "lamp" }, { "type": "lamp" }]`; see [concepts](concepts.html#channel-and-connected-equipment).

## Energy meter: `energyMeter/v1`

An independent energy meter measures circuits that it does not switch: the supply of a heat pump or a water heater, a group of sockets, or a circuit switched by another actuator. Each channel is a measured circuit, with a `power` object (DPT 14.056 in W, or 9.024 in kW) and an `energy` object (DPT 13.010 in Wh, or 13.013 in kWh); a `totalPower` object without a channel sends the sum.

The measured power of a circuit is given at start by `initialState.powerW` and changed by a numeric input on its `power` object, entered in the unit of that object. `initialState.energyWh` sets the meter index. Energy is integrated with the same time scale as actuator metering (`energyTimeScale`, 60 by default); power is sent when it changes by `powerSendDeltaW`, and energy every `meterIntervalMs`. The meter does not add the power of the circuits it measures to that of actuators: a sub-meter and the actuator that switches the same load report the same power. See the [heat pump example](../examples/boiler-room.html).

## Presence detector: `presenceDetector/v1`

A detection sends 1 through the `input` object. Each new detection restarts the hold timer (`"parameters": { "holdMs": 10000 }`); when it expires, the object sends 0. Set `retrigger: false` to avoid restarting or `sendOnEnd: false` to suppress the final 0. To model a detector that only sends 1 and relies on the actuator's timer, set `sendOnEnd: false` with a short hold time, as in the [timer example](../examples/timers.html). The presence object may use DPT 1.001 or 1.018 (occupancy).

A `lock` object at 1 makes the detector ignore its detections. `lockStart` and `lockEnd` set the telegram sent when the lock starts and ends: none (default), 0, or 1 (kept while locked; at the end, followed by the hold time).

Several detectors can watch one room as master and slaves. A slave (`"slave": true`) sends 1 on each of its detections; linked to the `slaveTrigger` object of the master, it counts as a detection of the master (switch-on, or a restart of the hold time), whose brightness threshold and final 0 apply.

A `brightness` object (DPT 9.004) sends the brightness measured by the detector, entered by the reader on a numeric input. With `brightnessThresholdLux`, a detection switches on only while that brightness is below the threshold; a presence already active is still extended. There is no light model: the brightness does not depend on the lamps or on daylight, and constant light regulation is not modeled.

## Weather station: `weatherStation/v1`

A weather station sends outdoor measurements entered in its numeric `inputs`: wind speed on a `wind` object (DPT 9.005 in m/s, or 9.028 in km/h; thresholds stay in m/s; the KNX description of weather data encodes wind speed in 9.005 and allows 9.028 only as an extra datapoint next to it), brightness on `brightness` (DPT 9.004, lux), and temperature on `outdoorTemp` (DPT 9.001). Two one-bit outputs follow thresholds with hysteresis; an output is reset only strictly beyond threshold and hysteresis, so that a value at the threshold keeps it set even with no hysteresis:

| Output port | Set when | Reset when | Parameters |
| --- | --- | --- | --- |
| `windAlarm` | wind ≥ `windThreshold` (10 m/s) | wind < threshold − `windHysteresis` (2 m/s) | `windThreshold`, `windHysteresis` |
| `sunProtection` | brightness ≥ `brightnessThreshold` (40,000 lx) | brightness < threshold − `brightnessHysteresis` (5,000 lx) | `brightnessThreshold`, `brightnessHysteresis` |
| `frostAlarm` | outdoor temperature ≤ `frostThresholdC` (3 °C) | temperature > threshold + `frostHysteresisK` (2 K) | `frostThresholdC`, `frostHysteresisK` |
| `rainAlarm` | rain entered for `rainOnDelayMs` (20 s) | `rainOffDelayMs` (5 min) after the rain stops | `rainOnDelayMs`, `rainOffDelayMs` |

Rain is entered on the numeric input of the `rainAlarm` object (0 or 1): the delays avoid reporting a short shower or a short break, as on common rain sensors. An output is transmitted when its state changes; with `alarmCyclicMs`, the wind, rain, and frost alarms are also sent again at that period, for actuators that monitor them (`alarmMonitoringMs` of a shutter actuator). Link the alarms to the `windAlarm`, `rainAlarm`, and `frostAlarm` ports of a [shutter actuator](shutters.html).

## Air quality sensor: `airQualitySensor/v1`

An air quality sensor sends temperature (`temperature`, DPT 9.001), relative humidity (`humidity`, DPT 9.007, or 5.001 in one byte as many sensors do), and CO₂ concentration (`co2`, DPT 9.008) entered in its numeric `inputs`. It sets `co2Alarm` and `humidityAlarm` at their thresholds, with hysteresis, and its step controller sends a `ventilation` control value (DPT 5.001):

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

`invertInput1` … `invertInput8` invert the logic inputs, in the order of their objects, and `invertOutput` inverts the result (NAND, NOR, XNOR).

An optional `enable` object (DPT 1.003) blocks the output while it is 0 (`enablePolarity: "inverted"`: while it is 1); enabling it again sends the current result. Before its first telegram, the output is enabled (`enableAtStart`). The [weather protection example](../examples/weather-protection.html) uses AND to apply sun protection only in automatic mode.

## Clock master: `clockMaster/v1`

A clock master sends the time of day on a `time` object (DPT 10.001: day of week and time) and the date on a `date` object (DPT 11.001), from the scenario's [simulated clock](time.html#simulated-clock). It sends shortly after start (`sendOnStart`, `startDelayMs`), every `sendPeriodMin` clock minutes (10 by default, the standard heartbeat of a KNX system clock; 0 disables periodic sending), at second 30 of the minute, as the KNX system clock requires so that the time received does not jump at a minute boundary, and after the clock is set. Its objects have the R flag by default, so that other devices can read the current time, as on the clocks of training kits.

## Alarm module: `alarmModule/v1`

An alarm module has one channel per zone. For intrusion and for fire, a trigger object (`intrusionTrigger`, `fireTrigger`) sets a stored alarm (`intrusionState`, `fireState`), sent on each change. The alarm stays stored when the trigger returns to 0, until a reset (`intrusionReset`, `fireReset`, DPT 1.015) receives 1; the reset is refused, and the journal says why, while the trigger is still 1. The alarms are kept through a bus voltage failure and sent again when the voltage returns. See the [alarms example](../examples/alarms.html).

## Weekly time switch: `timeSwitch/v1`

A time switch sends programmed values on its `output` objects (DPT 1.001, 1.002, 1.003, 1.008, 5.001, 5.010, 17.001, or 20.102) at the programmed times of the simulated clock. The `program` parameter lists switching points separated by semicolons:

```json
"parameters": { "program": "Mon-Fri 07:00 = 1; Mon-Fri 22:00 = 0; Sat,Sun 08:30 = 1; Sat,Sun 23:00 = 0" }
```

Days are `Mon` … `Sun`, ranges such as `Mon-Fri`, lists such as `Sat,Sun`, or `Daily`. Unreadable entries are ignored and listed in the event log.

Three overrides, as on common time switches: an `override` object sends a value at once and holds it until the next switching point; an `overrideTimed` object holds it for `overrideDurationMin` clock minutes (60 by default), the switching points meanwhile being held; an `overridePermanent` object at 1 suspends the program, and at 0 resumes it with its current value. At start and after the clock is set, the time switch sends the value of the most recent switching point (`sendOnStart`). It uses the simulated clock directly; it does not synchronize from a clock master.

## Display and supervisor: `display/v1`

A display receives and shows values through its `display` port without issuing control commands. With `"kind": "supervisor"`, it is drawn as a supervision software, its values written under the object names; on the IP network it declares `"medium": "IP"`. Its access and filtering are explained in the [topology guide](topology.html).

## USB interface: `usbInterface/v1`

This virtual device connects the [USB interface panel](usb-interface.html) to a line for group-address reads and writes.

## Passive device and visualization panel: `passive/v1`

A passive device stores communication-object values without additional behavior. Use it to represent a KNX device whose internal logic is outside the simulation.

Values typed in the diagram make it a visualization panel: each numeric input writes its `input` object and sends it, for example a dimming level or a shutter position, and `display` objects show the values received.

```json
"inputs": [{ "id": "position", "type": "number", "label": "Setpoint (%)", "object": "target", "min": 0, "max": 100, "step": 1 }]
```

A passive or display device may also use a standard DPT that BusDiagram does not simulate, such as 12.001 (counter), 229.001 (metering value), or 235.001 (tariff), to draw a real installation faithfully. Its size comes from the KNX format of the main number, so group address consistency is still checked. Its value stays unknown until a telegram is received and is then shown as raw bytes. Such objects cannot be written from the USB interface panel.

## Gateway to another system: `systemGateway/v1`

Heat pumps, hot-water tanks, boilers, and floor heating are often controlled by their own system (Modbus, BACnet, M-Bus) and linked to KNX by a gateway. A `systemGateway/v1` device represents that boundary; only its KNX side is modeled.

- `value` objects carry values read in the other system, such as a tank temperature. Enter them with numeric `inputs`, as on a visualization panel; they are sent on KNX.
- `command` objects receive KNX commands for the other system, such as an operating mode or a hot-water boost. The event log shows that they are forwarded; the other system's reaction is not simulated.
- The `system` parameter names the other system (`"Modbus"` by default); the device card shows it next to the address.

See the [boiler room example](../examples/boiler-room.html).
