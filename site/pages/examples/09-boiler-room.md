---
title: Heat pump behind a gateway
group: Systems and mechanisms
summary: "A heat pump and a hot-water tank controlled by their own system: a gateway links them to KNX, and an independent meter measures them."
covers: "Gateway to Modbus · energy meter · DPT 9.024 · DPT 13.013"
order: 9.47
---

# Heat pump and hot water behind a gateway

In many buildings, the heat pump, the hot-water tank, and the floor heating are controlled by their own system, connected to KNX through a gateway (Modbus, BACnet, or M-Bus). KNX then sees only the values and commands that the gateway exchanges. The diagram shows that boundary; the other system is not simulated.

- Enter the tank, flow, and return temperatures on the gateway: they come from Modbus and are sent on 3/1/x (DPT 9.001). The display shows them.
- The keys send the heating mode (3/2/0, DPT 20.102) and a hot-water boost (3/2/1). The gateway receives them and forwards them to Modbus; the event log shows this, but the heat pump's reaction is not modeled.
- The energy meter measures two circuits it does not switch. The heat pump uses kW and kWh (DPT 9.024 and 13.013), the water heater W and Wh (DPT 14.056 and 13.010): the same quantities in different units. Enter a measured power to change it; energy is counted 60 times faster than real time.

The line shows its power supply (640 mA) next to its name.

```knx
scenario: boiler-room
```
