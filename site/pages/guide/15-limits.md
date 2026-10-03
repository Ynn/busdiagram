---
title: Model and limits
group: Simulation model
order: 15
---

# Model and limits

BusDiagram is a diagram design tool; its simulation layer exists to illustrate the diagrams and makes the following choices. They describe the software model and should not be taken as a complete account of a physical KNX installation.

- **Timing:** propagation is slowed for inspection; it does not reproduce real twisted-pair bus timing.
- **Group services:** `GroupValueWrite`, `GroupValueRead`, and `GroupValueResponse` are modeled. Individual-address programming telegrams are outside the model.
- **TP exchange:** the frame view shows a group data frame, with the priority of the sending object (low by default; the KNX data link layer gives normal as the default for short frames, and the priority is a setting of each object). Bus arbitration, priority scheduling, TP acknowledgments (`ACK`, `NACK`, `BUSY`), and automatic retransmissions are outside the model; the telegram details draw the acknowledgement for illustration, and their TP1 signal is schematic, not an electrical simulation.
- **Object flags:** C, R, W, T, U, and I are modeled. Read on initialisation (I) runs when a device starts again after a bus voltage failure, not at the start of the simulation. As in the KNX Application Layer, a read is answered by one object per device: the first one, in the order of its objects, that has the R flag and a known value; the response is sent on its sending address.
- **Internal associations:** when a device sends, its other objects on the same group address take the value, as the KNX Application Layer specifies; their W flag (U for a response) decides only whether the device reacts.
- **Power supplies:** drawn on lines and segments that declare one; a TP segment without one gets the warning `config-no-power-supply`. Main lines and the backbone are not given one, and the bus load (consumption against rated current) and voltage drop are not computed.
- **Topology:** lines 0.1 to 0.15, connected directly to the backbone, are allowed in KNX but not supported; lines belong to areas 1 to 15.
- **Couplers:** filter tables derive from declared associations. The routing counter starts at 6 and decreases at each modeled coupler. A repeater does not filter. Each line has at most one extension (repeater or segment coupler), connected to its main segment; see [couplers and repeaters](couplers.html).
- **KNXnet/IP:** the model routes between IP routers with filter tables; it does not model tunneling that bypasses those tables.
- **Supervisors:** a supervisor does not automatically read states at startup. It shows values after receiving telegrams or USB interface reads.
- **Shutters:** the actuator estimates travel without a position sensor; the connected shutter moves at its own speed. See [shutters](shutters.html).
- **Clock:** the simulated clock has no time zone and no summer time change; DPT 19.001 (date and time with quality flags) is not supported. See the [time schedule example](../examples/time-schedule.html) for a clock master and a time switch.
- **Relay feedback:** it reports the controlled relay state, not a measured mains voltage.
- **Scenes:** recall (DPT 17.001 and 18.001) and storing by the learn bit (DPT 18.001) are modeled; a stored scene lasts until the simulation restarts.
- **Bus voltage:** a line or segment can lose its bus voltage from its power supply on the diagram; devices then stop and run their failure and recovery behavior. Behavior after a download of the configuration is outside the model, and the simulation starts with the installation already in operation, without a recovery reaction.
- **Push-button interface:** contact inputs measure presses in simulated time; while the simulation is paused, a press cannot become long. Debounce and telegram rate limits are not modeled; the contact type of the push-button (normally open or closed) and the contact expected by the input are.
- **DPTs:** only the [listed data types](../reference/dpt.html) are simulated; passive and display devices can show other standard DPTs as raw bytes.
- **Other systems:** a gateway models only its KNX side; Modbus, BACnet, and M-Bus are not simulated.
- **USB interface panel:** group reads and writes are modeled, without programming or downloads.
- **DALI:** group and broadcast control are modeled, without DALI commissioning, color control, or emergency lighting. See [DALI](dali.html#model-limits).
- **Configuration warnings:** parameters that compensate a property of the load (valve type, motor wiring, contact type) are compared with that property; a mismatch is simulated and shown as a warning. See the [warning codes](../reference/errors.html#configuration-warnings).
- **Heating:** each room uses a simplified thermal time constant, and heating or cooling power is assumed to be available. Operating modes use a DPT 20.102 object; forced-mode and one-bit mode objects are not modeled. The thermostat has no built-in schedule; a time switch can send mode telegrams. Fan-coil units and air-conditioning gateways are not modeled. See [HVAC](hvac.html#model-limits).
- **Metering:** power comes from the rated power of each load, without measurement tolerance or power factor; energy is counted with a time scale (`energyTimeScale`).
- **Air quality:** measurements are entered by the reader; there is no air or ventilation model.
- **Venetian blinds:** slats turn before each movement; slat angle restoration after a movement and slat limit positions are not modeled.
- **Presence detector:** brightness is entered by the reader; there is no light model and no constant light regulation.
- **Weather station:** measurements are entered by the reader; there is no weather model. Wind, brightness, and frost thresholds and a rain alarm with delays are provided; there are no generic comparators on every measurement, no minimum exceedance times, and no lock per threshold.
- **Logic module:** one-bit AND, OR, XOR, and NOT, with inversion of each input and of the result, an enable object, and an optional daily time window; no delay blocks or numeric comparisons.
- **Outside scope:** BACnet, KNX Secure, and connection to a real bus.
