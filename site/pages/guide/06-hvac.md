---
title: Heating
group: Write a scenario
order: 6.3
---

# Heating and air conditioning (HVAC)

This chapter models room temperature control with a thermostat, heating actuator, thermoelectric valve, and window contact. The heating or cooling power is assumed to be available: there is no boiler or water circuit; a heat pump is a load that heats or cools its room (see [model limits](#model-limits)). Simulation time is compressed so a change that would take hours in a building becomes visible in minutes.

## Rooms and thermal model

Each entry in `rooms` stores a room's temperature, outside temperature, and thermal time constant. Temperature moves toward the outside temperature while heating or cooling equipment adds or removes heat. A radiator's `powerK` is not a power in watts: it is the temperature difference, in K, that the radiator alone could maintain above the outside temperature with its valve fully open. An open window multiplies the heat loss by eight. The default `timeConstantMs` is 300 seconds in the accelerated model.

```json
"rooms": [
  { "id": "living", "name": "Living room", "temperatureC": 18, "outsideTemperatureC": 5 }
]
```

Assign a thermostat, window contact, or temperature sensor to a room with `"room": "living"`. A radiator channel uses `"equipment": { "type": "radiator", "room": "living" }`. The **Rooms** panel shows temperature, setpoints, valve positions, and window state. `roomAction(roomId, "window" | "outside", value)` offers the same controls from JavaScript. An outdoor temperature entered on a [weather station](devices.html#weather-station-weatherstation-v1) also becomes the outside temperature of every room, unless its `setsRoomOutdoorTemperature` parameter is `false`.

The physical window and the bus are distinct. Opening the window in the **Rooms** panel changes the heat loss and makes the window contact send a telegram. A telegram written directly to a thermostat window object, for example from the USB interface panel, changes the thermostat mode but does not open the physical window; this can represent a contact fault.

## Relevant DPTs

| DPT | Size | Meaning |
| --- | --- | --- |
| 9.001 | 2 bytes | Temperature in °C, encoded as a KNX two-byte float. |
| 9.002 | 2 bytes | Temperature difference in K. |
| 20.102 | 1 byte | HVAC mode: 0 auto, 1 comfort, 2 standby, 3 economy, 4 building protection. |
| 1.019 | 1 bit | Window state; 1 means open. |
| 1.009 | 1 bit | Open/closed; 1 means closed. |
| 1.100 | 1 bit | 1 means heating, 0 means cooling. |
| 5.001 | 1 byte | Continuous control value from 0 to 100%. |

A DPT 9.001 value uses two payload bytes after the APCI. Until an object receives or measures a value, a 9.xxx object can remain unknown.

## Room thermostat

`roomThermostat/v1` measures a room and controls heating or cooling. Its display shows measured temperature, mode, setpoint, and demand. Optional buttons and digital inputs affect presence and setpoint objects.

The thermostat includes a setpoint manager with a fixed policy. This policy is a choice of the model, not a rule of DPT 20.102. The mode is selected by priority: an open window requests building protection; a building protection preselected by `hvacMode` (absence, holidays) stays in force; otherwise presence requests comfort; otherwise the `hvacMode` preselection applies. Auto mode uses comfort in this model. A heating comfort setpoint defaults to `comfortC: 21`. Standby and economy lower it through `standbyShiftK` and `economyShiftK`; frost protection defaults to `frostProtectionC: 7`. Cooling uses `deadZoneK` between heating and cooling setpoints and a high-temperature protection setpoint.

For **PI control**, `controlType: "pi"` uses `proportionalBandK` and `integralTimeMs`. It sends a DPT 5.001 value on `heatingValue` or `coolingValue` when the change reaches `valueSendDeltaPct`; a one-bit `heatingSwitch` or `coolingSwitch` output uses PWM over `pwmCycleMs`. For **two-point control**, `controlType: "twoPoint"` switches a one-bit output at the setpoint and restarts below the `hysteresisK` threshold.

| Port | DPT | Direction | Purpose |
| --- | --- | --- | --- |
| `actualTemp` | 9.001 | Send | Measured temperature. |
| `externalTemp` | 9.001 | Receive | Replaces the internal sensor. With `externalTempTimeoutMs`, the internal sensor is used again when no value arrives within that time. |
| `baseSetpoint` | 9.001 | Receive | Base comfort setpoint. |
| `setpointShift` | 9.002 | Receive | Setpoint offset. |
| `setpointStatus` | 9.001 | Send | Current setpoint. |
| `hvacMode` / `hvacModeStatus` | 20.102 | Receive / send | Requested and current mode. |
| `presence` | 1.018 or 1.001 | Receive | Presence requests comfort, except during building protection. With `presenceType: "button"`, each 1 extends the comfort mode for `comfortExtensionMs` (2 h by default), as a presence button. |
| `window` | 1.019, 1.001, or 1.009 | Receive | Open window requests protection; with 1.009, 0 means open. |
| `heatCool` / `heatCoolStatus` | 1.100 | Receive / send | Heating or cooling selection. |
| `heatingValue` / `coolingValue` | 5.001 | Send | Continuous control value. |
| `heatingSwitch` / `coolingSwitch` | 1.001 | Send | One-bit control or PWM. |
| `sensorFault` | 1.005 or 1.001 | Send | 1 when no temperature is usable (external temperature too old, no room sensor); the control value is then `sensorFaultValuePct` (0 % by default) until a temperature comes back. |

## Heating actuator and valve

`heatingActuator/v1` drives a thermoelectric valve. A continuous `value` command is converted to PWM using `cycleMs`; a one-bit `switch` command is applied directly. `valveType` tells the actuator whether its valve is normally closed or normally open; the radiator's `normallyOpen` parameter describes the valve actually installed. When they disagree, the valve opens when no heat is requested, and a configuration warning is shown above the diagram. Without a fresh command for `monitoringMs`, the actuator uses `emergencyPct` and reports a `fault`. Its `valueStatus` object reports the applied control value. When monitoring is enabled, the thermostat's `valueCyclicMs` should send often enough to prevent a false fault.

A `radiator` load opens and closes its valve over `openingTimeMs`, then heats or cools the assigned room. Short PWM cycles can prevent the valve from opening fully, so choose a cycle appropriate to the modeled travel time. A switching actuator can also control a radiator with two-point regulation.

```json
{
  "id": "heat",
  "address": "1.1.3",
  "kind": "heatingActuator",
  "behavior": "heatingActuator/v1",
  "objects": [
    { "id": "value", "ga": "3/0/1", "dpt": "5.001", "port": "value", "channel": "h1", "flags": { "W": true, "T": false } },
    { "id": "status", "ga": "3/4/4", "dpt": "5.001", "port": "valueStatus", "channel": "h1", "flags": { "W": false, "T": true } }
  ],
  "channels": [{
    "id": "h1", "label": "H1 living room",
    "parameters": { "cycleMs": 20000 },
    "equipment": { "type": "radiator", "room": "living" }
  }]
}
```

## Sensors

`windowContact/v1` sends changes to its `contact` object. The transmitted value always follows the DPT: with DPT 1.019 or 1.001, 1 means open; with DPT 1.009, 1 means closed. `contactType` describes the physical contact (normally open by default) and `invert` tells the input to interpret a normally closed contact; when they disagree, open and closed are reported the wrong way round and a configuration warning is shown. By default it also sends its initial state after `startDelayMs`, so a thermostat can learn that a window starts open. Set `sendOnStart: false` to suppress that telegram. `temperatureSensor/v1` transmits room temperature when it changes and, optionally, at a fixed interval.

## Example

The [room-heating example](../examples/hvac.html) combines PI control in the living room, two-point control in the bedroom, a window contact, and a central mode set through the USB interface panel.

```knx
scenario: room-heating
```

## Model limits

The thermal model uses one time constant per room. It does not simulate room-to-room heat transfer, solar gains, equipment inertia, a water circuit or a boiler, summer or winter changeover, fan coils, or BACnet. A `heatPump` load heats or cools its room while its output enables it, after the minimum off time of its compressor (`minOffMs`); its coefficient of performance (`cop`) gives the heat shown, the room model uses `powerK`. See the [heat pump example](../examples/heat-pump.html). The thermostat has no internal time program: schedules come from the bus, for example a [weekly time switch](devices.html#weekly-time-switch-timeswitch-v1) that sends HVAC modes. Humidity and CO₂ are values entered on an [air quality sensor](devices.html#air-quality-sensor-airqualitysensor-v1); ventilation drives a `fan` load but does not change the room temperature or air quality. A radiator with `emitter: "cooling"` removes heat without any condensation model or dew-point protection; use it only as a simplified cooling emitter. Auto mode selects comfort; a bus telegram can change the mode preselection. The operating mode is selected with a DPT 20.102 object only: the separate forced-mode object and the one-bit mode objects (comfort, night, frost protection) offered by many room controllers are not modeled.
