---
title: USB interface tool
group: Tools
order: 7.5
---

# USB interface panel

The built-in USB interface panel represents a commissioning computer connected to the bus through a USB interface. It sends group-address reads and writes into the same simulated topology as every other device. The panel appears only when the scenario declares an interface.

## Add a USB interface

Place `usbInterface/v1` on the desired line. Its address is often at the upper end of the line's address range:

```json
{
  "id": "usbInterface",
  "name": "USB interface",
  "address": "1.1.255",
  "kind": "interface",
  "behavior": "usbInterface/v1",
  "objects": []
}
```

The designer can add this device through its guided device selector.

## Read and write

| Action | KNX service | Effect |
| --- | --- | --- |
| Write | `GroupValueWrite` | Sends the entered value to the selected group address. |
| Read | `GroupValueRead` | Requests a response from the objects associated with the address whose R flag is set; each responds on its own sending address. |

The panel uses the group's declared DPT, or a DPT inferred from associated objects. Its telegrams follow the same couplers and filter tables as device telegrams and appear in the bus monitor.

A USB interface has no communication objects, so its addresses are not in the coupler filter tables unless they are assigned to it, as in ETS for a modeled bus interface. List them in the `groupAddresses` parameter, for example `"parameters": { "groupAddresses": "1/1/1 1/4/1" }`. Without it, a write to an address used only on another line is filtered by the first coupler, and the response to a read cannot come back. See [filter tables](couplers.html#filter-tables-and-routing-counter).

A read request may use any address associated with the object that should answer; the response is always sent on that object's sending address, its first address. If the sending address is not the one that was read, the response can act on other devices; the KNX training documentation therefore recommends reading on the sending address.

```knx
scenario: usb-interface
tabs: json
```

## R and U flags

| Flag | Purpose | Default in this model |
| --- | --- | --- |
| `R` read | Answer a read on any associated address; the response uses the object's sending address. | Enabled for typical status objects, such as `status` and `positionStatus`. |
| `U` update | Apply a received response to the object. | Enabled for display objects. |

```json
"flags": { "W": false, "T": true, "R": true }
```

A command object's U flag is normally off so a read response does not accidentally act as a new command. You can enable U explicitly to inspect that behavior.

To learn the state of an output, read its **status** address, not its command address. Actuator command objects usually have no R flag, as in product manuals (for example a dimming actuator's switching object is C, W, T, and its switching status object is C, R, T). A read of the command address therefore receives no response from the actuator, and the command object keeps the last command it received even when another command, such as a brightness value, has since changed the output.

## JavaScript API

```js
const diagram = document.querySelector("bus-diagram");
diagram.groupWrite("1/1/1", 1);
diagram.groupRead("1/4/1");
```

The DOM-free API also exposes `groupWrite(interfaceId, groupAddress, value)` and `groupRead(interfaceId, groupAddress)` through `createSimulator`. Invalid values are rejected before transmission. For example, `NaN`, infinity, out-of-range values, or a fraction for an integer DPT cause `groupWrite` to throw `RangeError`. Accepted values are sent in their encoded DPT form; 30% in DPT 5.001 is represented as about 30.196% after encoding to a byte.
