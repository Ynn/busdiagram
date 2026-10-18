---
title: Commissioning
group: Tools
order: 7.5
---

# Commissioning

On a training board, students do not only design a project: they program the individual address of each device with its programming button, download the applications, and find out why a device does not answer. A scenario can simulate this part of the work. The devices then hold, apart from the project, what was downloaded into them, as real devices do.

## Turn it on

In the [designer](designer.html), **Installation** panel, tick **Simulate commissioning**. In JSON, add an `installation` section at the root of the scenario:

```json
"installation": {}
```

An empty section means that every device and coupler is as delivered: individual address 15.15.255 (15.15.0 for a coupler), no application. A device without an application does nothing: its keys send no telegram, its outputs do not switch, and its card in the diagram says **not loaded**. A coupler without an application forwards no group telegram.

Without the section, nothing changes: the diagram runs the project as if every device were already commissioned.

## In the diagram

With commissioning, each device and coupler has a small square beside its address: its **programming button**. A click switches the programming mode on (the red LED lights up) or off. When the address held by a device is not the one of the project, the card shows it after a **≠** sign, in red.

## In the designer

The context menu of a device (right-click in the Topology panel or in the device list of a line) offers the downloads of ETS:

| Command | What it does |
| --- | --- |
| Download all | Programs the individual address with the programming button, then downloads the application. When the device already answers at its address, only the application. |
| Download: individual address | Waits for a programming button, checks that a single device is in programming mode and that no other device holds the address, writes it, and ends programming mode. |
| Download: partial (application) | Downloads the application to the device that answers at the address of the project. |
| Unload the application… | Removes the application of the device at that address, after a confirmation. |

The context menu of a line adds **Scan the line**, which lists the devices that answer at the addresses of the line, with what they hold; a device as delivered (15.15.255) is not on it. The couplers of a line, and the area coupler of an area, have their own download commands in the same menus.

The device list of a line shows the download state, as in the ETS topology: **Adr** (individual address programmed), **Prg** (application program loaded), **Par** (parameters up to date), **Grp** (group addresses up to date), and **Cfg** (flags, DPTs, and priorities up to date). A change of the project, such as a new association, turns the column red until the device is downloaded again: until then, the device keeps its former settings.

The **Commissioning** bar above the panels keeps the history of the operations. When an operation waits for a programming button, the bar says which one; it goes on as soon as the button is pressed in the diagram, and **Cancel** stops it. **Devices in programming mode** lists the devices whose LED is on. **All to delivery state…** brings every device back as delivered, and **All as the project…** loads every device with its address and application, as after a complete download. Both replace what the devices hold, including what ETS downloaded, outside the undo history: a dialog asks first. So does **Unload the application…**.

The state of the devices is kept in the scenario: a programming button, an address written, or a download does not add a step to the undo history of the project.

## What students can get wrong

The procedures act on the device that answers, not on the one the student meant. They refuse what ETS refuses:

- two programming LEDs on at the same time;
- an individual address already held by another device of the bus (scan the line to find it);
- a download to an address where no device answers;
- a download to a device whose application program is not the one of the project.

The other mistakes have their consequences: if the wrong programming button was pressed, the wrong device receives the address, then the application of another device of the same type, and the wrong lamp switches. A new group address that crosses a coupler works only once the coupler is downloaded again, with its new filter table.

To prepare an exercise where a board was left programmed by another group, give some devices another address in the `installation` section:

```json
"installation": {
  "devices": [{ "device": "switchActuator", "address": "1.1.1" }]
}
```

## The installation section

| Field | Content |
| --- | --- |
| `devices[].device` | ID of the device in the project. |
| `devices[].address` | Individual address held by the device (15.15.255 by default). |
| `devices[].programmingMode` | Programming LED on. |
| `devices[].application` | Application downloaded: behavior, parameters, objects with their associations, keys, and the parameters and scenes of each channel. Absent: no application. |
| `devices[].memory` | Memory of a manufacturer's device, as ETS wrote it (blocks of octets in hexadecimal by address); the device runs the application started there. |
| `couplers[].coupler` | Address of the coupler or repeater in the project. |
| `couplers[].address` | Individual address held by it (15.15.0 by default). |
| `couplers[].application` | Filter table (`filterTable`) and routing of group telegrams (`down`, `up`). Absent: no application. |

The names, addresses, and rooms of the devices, and the loads and push-buttons wired to them, stay in the project: they are not downloaded.

## Model limits

- Device management reaches every device that has bus voltage, through the couplers, whatever they hold.
- A download restarts the device that received it, with the application it now holds: its deadlines end and it starts as after a restart; its loads keep their state, and the other devices, the time and the telegrams under way go on.
- The programming mode ends when the simulation is reset, as when the bus voltage returns; the addresses held stay.
- An application program is identified by the behavior of the device: two devices of the same type accept each other's application.
