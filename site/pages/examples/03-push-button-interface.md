---
title: Push-button interface
group: Installations
summary: "A push-button interface measures presses itself: one-key dimming and blind, and a scene stored by a long press."
covers: "DPT 3.007 · DPT 1.008 · DPT 18.001 · contact inputs"
order: 3.8
---

# Push-button interface

The interface has four inputs wired to conventional push-buttons. Each key on the diagram is a contact: it reports when it is pressed and when it is released, and the interface decides whether the press is short or long, as a real device does.

- **Input 1** toggles L1. Its switching object also listens to the status address 1/4/1, so the toggle follows the lamp.
- **Input 2** dims L2 on one key: a short press switches it, a long press dims brighter when the lamp is off and otherwise the other way than last time; releasing the key stops dimming.
- **Input 3** moves the blind on one key: a long press moves it, in the other direction each time; a short press stops it.
- **Input 4** recalls scene 1 with a short press. A long press stores the scene (DPT 18.001, learn bit): each actuator keeps its current state as the new scene 1. Change the lights, store, change them again, then recall.

```knx
scenario: push-button-interface
```
