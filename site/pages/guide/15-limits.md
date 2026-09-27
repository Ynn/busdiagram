---
title: Model and limits
group: Simulation model
order: 15
---

# Model and limits

BusDiagram is a diagram design tool; its simulation layer exists to illustrate the diagrams and makes the following choices. They describe the software model and should not be taken as a complete account of a physical KNX installation.

- **Timing:** propagation is slowed for inspection; it does not reproduce real twisted-pair bus timing.
- **Group services:** `GroupValueWrite`, `GroupValueRead`, and `GroupValueResponse` are modeled. Individual-address programming telegrams are outside the model.
- **TP exchange:** the frame view shows a group data frame. Bus arbitration, priority scheduling, TP acknowledgments (`ACK`, `NACK`, `BUSY`), and automatic retransmissions are outside the model.
- **Object flags:** W, T, R, and U are modeled; C is always enabled. Initialization-read behavior is not modeled.
- **Internal associations:** a device may deliver its own transmitted telegram to other local objects on the same group address, subject to W. Real product behavior varies.
- **Couplers:** filter tables derive from declared associations. The routing counter starts at 6 and decreases at each modeled coupler. A repeater does not filter. Each line has at most one extension (repeater or segment coupler), connected to its main segment; see [couplers and repeaters](couplers.html).
- **KNXnet/IP:** the model routes between IP routers with filter tables; it does not model tunneling that bypasses those tables.
- **Supervisors:** a supervisor does not automatically read states at startup. It shows values after receiving telegrams or USB interface reads.
- **Shutters:** the actuator estimates travel without a position sensor; the connected shutter moves at its own speed. See [shutters](shutters.html).
- **Clock:** the simulated clock has no time zone and no summer time change; DPT 19.001 (date and time with quality flags) is not supported. The clock in the timers example is a push-button that simulates scheduled times; see the [time schedule example](../examples/time-schedule.html) for a clock master and a time switch.
- **Relay feedback:** it reports the controlled relay state, not a measured mains voltage.
- **Scenes:** scene recall (DPT 17.001) is modeled; scene storage (DPT 18.001) is not.
- **DPTs:** only the [listed data types](../reference/dpt.html) are accepted.
- **USB interface panel:** group reads and writes are modeled, without programming or downloads.
- **DALI:** group and broadcast control are modeled, without DALI commissioning, color control, or emergency lighting. See [DALI](dali.html#model-limits).
- **Configuration warnings:** parameters that compensate a property of the load (valve type, motor wiring, contact type) are compared with that property; a mismatch is simulated and shown as a warning. See the [warning codes](../reference/errors.html#configuration-warnings).
- **Heating:** each room uses a simplified thermal time constant, and heating or cooling power is assumed to be available. Operating modes use a DPT 20.102 object; forced-mode and one-bit mode objects are not modeled. The thermostat has no built-in schedule; a time switch can send mode telegrams. Fan-coil units and air-conditioning gateways are not modeled. See [HVAC](hvac.html#model-limits).
- **Metering:** power comes from the rated power of each load, without measurement tolerance or power factor; energy is counted with a time scale (`energyTimeScale`).
- **Air quality:** measurements are entered by the reader; there is no air or ventilation model.
- **Venetian blinds:** slats turn before each movement; slat angle restoration after a movement and slat limit positions are not modeled.
- **Weather station:** measurements are entered by the reader; there is no weather model. Only wind and brightness thresholds are provided.
- **Logic module:** one-bit AND, OR, XOR, and NOT with an enable object and an optional daily time window; no delay blocks or numeric comparisons.
- **Outside scope:** BACnet, KNX Secure, and connection to a real bus.
