---
title: Shutters
group: Write a scenario
order: 6
---

# Shutters: estimated and actual travel

A shutter actuator has no position sensor in this model. It estimates position from its **configured travel time**. If it is configured for 20 seconds, 10 seconds of downward travel is reported as 50%. The connected shutter has its own **actual travel time**. The model tracks both positions separately:

- **Estimated position:** the actuator's value, transmitted on `positionStatus`.
- **Actual position:** where the connected shutter is, including its physical end stops.
- **Motor command:** the direction currently applied to the output.

```knx
scenario: shutter-calibration
```

With a 50% target and a configured travel time of 20 seconds, the actuator runs down for 10 seconds and reports 50%. A real shutter that needs 30 seconds to complete its travel reaches only about 33%. Compare the result with a correctly configured actuator:

```knx
scenario: shutter-calibrated
attrs: monitor="false" description="false"
tabs: json
```

## Communication-object ports

| Port | DPT | Effect |
| --- | --- | --- |
| `move` | 1.008 | 0 raises toward 0%; 1 lowers toward 100%. |
| `stopStep` | 1.007 | Stops a moving shutter. At rest, turns the slats of a venetian blind by one step; has no effect on a roller shutter unless `stepPct` is set. |
| `positionCommand` | 5.001 | Sets a target position. |
| `positionStatus` | 5.001 | Sends the estimated position after a stop, with a delay. |
| `scene` | 17.001 | Recalls a channel position preset. |
| `slatCommand` / `slatStatus` | 5.001 | Slat angle setpoint and estimated angle of a venetian blind (0 % open, 100 % closed). |
| `windAlarm` | 1.005, 1.001 | 1 raises the shutter and ignores other commands; 0 releases it where it is. Without `channel`, applies to all channels. |
| `rainAlarm` / `frostAlarm` | 1.005, 1.001 | Rain and frost alarms, with their reactions `rainReaction` (up by default) and `frostReaction` (no movement by default); `windReaction` sets that of the wind alarm. |
| `forced` | 2.001 | 3 forces down, 2 forces up; 0 or 1 ends the forcing (`afterForcing`). |
| `lock` | 1.001 | 1 locks the output: commands are ignored; `lockStart` (up, down, stop, or a position `lockPositionPct`) and `afterLock` (up, down, or back to the position before the lock) set its reactions. |
| `recallPosition12` / `recallPosition34` | 1.001 | 0 or 1 moves to the stored position 1 or 2 (3 or 4): `preset1Pct` … `preset4Pct`. |
| `storePosition12` / `storePosition34` | 1.001 | 0 or 1 stores the current position as position 1 or 2 (3 or 4), unless `presetStoring` is false. |
| `upperLimit` / `lowerLimit` | 1.002 | 1 when the shutter is estimated at the top or at the bottom, sent on change. |

When several causes hold an output, the first active one applies, in the order of `safetyPriority` (weather alarms, then lock, then forcing by default, as on common shutter actuators), the weather alarms in the order of `alarmPriority` (wind, rain, frost by default). A cause that ends hands the output to the next one; when none remains, `afterAlarm`, `afterForcing`, or `afterLock` sets the movement (none, up, down, or back to the position before the first cause). With `alarmMonitoringMs`, an alarm object that receives no telegram within that time is considered active, as for a weather sensor that sends its alarms cyclically.

The position convention is **0% open (top), 100% closed (bottom)**. A motor wired in reverse is described on the shutter with `"wiringReversed": true` in its equipment parameters; the actuator's `invertOutput` compensates it without changing the DPT direction convention. When the two disagree, the shutter moves opposite to the commands and a configuration warning is shown above the diagram.

## Actuator rules

- A shutter usually rises more slowly than it falls. `estimatedTravelTimeUpMs` on the actuator channel and `actualTravelTimeUpMs` on the shutter set the upward times; without them, the upward time equals the downward time.

- `startDelayMs` (300 ms by default) separates a start or reversal from the previous motor command, preventing simultaneous power in both directions.
- A new command replaces a pending start, stop, or status transmission.
- At an estimated end stop, a command may have no effect even when the real shutter is elsewhere. `endSupplementPct` can add extra travel to reach the physical stop; its default is 0.
- While a wind alarm is active, move, stop/step, position, and scene commands are ignored and noted in the event log. The end of the alarm does not restore the previous position. See the [weather protection example](../examples/weather-protection.html).
- On a bus voltage failure the motors stop (`busFailure: "stop"`), or run toward an end position (`"up"`, `"down"`) until the voltage returns, the estimated position following the time elapsed; on recovery the output stays (`busRecovery: "none"`), moves up or down, or to `busRecoveryPositionPct`, and the estimated position is sent again.
- A stop/step command at rest turns the slats of a venetian blind (see below). On a roller shutter without slats it has no effect, as in the KNX stop/step function and in most actuator manuals. Some actuators instead move a roller shutter by a small step; set `stepPct` (for example 5) on the channel to model them.

## Venetian blinds and slats

A venetian blind uses the same motor to turn its slats and to move. Set `slatTravelMs`, the time for the slats to turn from open to closed, on both sides:

- on the actuator channel (`parameters.slatTravelMs`): the configured time used for the estimate;
- on the shutter equipment (`equipment.parameters.slatTravelMs`): the actual time of the blind.

A movement first turns the slats: closed (100 %) before going down, open (0 %) before going up. A stop/step command at rest turns the slats by `slatStepPct` (20 % by default) instead of moving the blind. The `slatCommand` port (DPT 5.001) turns the slats to an angle without moving the blind, and `slatStatus` reports the estimated angle after each stop. The diagram draws the slats thicker as they close. See the [venetian blind example](../examples/venetian-blind.html).

## Parameters

```json
"channels": [{
  "id": "s1",
  "label": "Shutter S1",
  "parameters": { "estimatedTravelTimeMs": 20000 },
  "initialState": { "estimatedPositionPct": 0 },
  "equipment": {
    "type": "shutter",
    "parameters": { "actualTravelTimeMs": 30000 },
    "initialState": { "positionPct": 0 }
  }
}]
```

See the [behavior reference](../reference/behaviors.html) for all parameters.
