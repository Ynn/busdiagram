---
title: Scenes with learning
group: Installations
summary: "Five keys: L1, L2, and the shutter by hand; two scene keys that recall with a short press and store with a long press (DPT 18.001)."
covers: "DPT 18.001 learn bit · central and per-output scene objects · status feedback"
order: 4.5
---

# Scenes with learning

The push-button interface has five keys. Keys 1 to 3 control L1, L2, and the shutter by hand. Keys 4 and 5 are scene keys: a short press recalls scene 1 or 2, a long press stores it. They send a scene control telegram (DPT 18.001) on 3/0/1: the scene number minus one, plus 128 for storing.

| Key | Function of the input | Address sent | Received by |
| --- | --- | --- | --- |
| L1 | Switching (toggle), listens to the status 1/1/1 | 1/0/1 | Output L1 |
| L2 | Switching (toggle), listens to the status 1/1/2 | 1/0/2 | Output L2 |
| Shutter | Blind on one key: long press moves, short press stops | 2/0/1, 2/0/2 | Shutter output |
| Scene 1 | Scene 1, storing by long press, object DPT 18.001 | 3/0/1 | Central scene object of the switching actuator, scene object of the shutter output |
| Scene 2 | Scene 2, storing by long press, object DPT 18.001 | 3/0/1 | Same |

Each output assigns scenes 1 and 2 on its **Scenes** page, with storing allowed; an output learns only the scenes assigned to it.

Try this sequence:

1. Press **Scene 1**: L1 and L2 turn on and the shutter opens, as configured.
2. Change the room by hand: switch L1 off with key 1, lower the shutter with a long press on key 3, and stop it halfway with a short press.
3. Hold **Scene 1**: each output stores its current state as its value for scene 1. The event log shows “scene 1 stored” for L1, L2, and the shutter.
4. Press **Scene 2**, then **Scene 1** again: L1 stays off, L2 turns on, and the shutter goes back to the stored position.

Two ways of receiving the scenes are shown:

- The switching actuator has one **central scene object** for its two outputs: one association to 3/0/1, and each output takes the state of its own assignment.
- The shutter actuator has a **scene object on its output**. With several outputs, each one can listen to its own scene address, or not take part in scenes at all.

The keys of L1 and L2 also listen to the status of their output (1/1/1 and 1/1/2). Without it, after a scene has turned L1 on, the next press on key 1 would send 1 again instead of switching it off.

In the designer, the **Scenes** page of an output shows its scene assignments as a table: whether the output takes part in a scene, the scene number, and the state, level, or position it takes. A stored scene replaces the configured value until the simulation restarts.

```knx
scenario: scene-learning
```
