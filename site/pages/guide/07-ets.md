---
title: Link to ETS
group: Tools
order: 7.6
---

# Link a diagram to ETS

Any diagram can be linked to ETS on the same computer: the designer, the player, a page of a course, a file opened from disk. ETS then sees the simulated installation as a KNX installation reached through an interface: its group monitor shows the telegrams of the diagram, and a write or a read from ETS acts on the simulated devices.

The link needs a small Windows program, **BusDiagram-ETS**, that ETS connects to as a KNXnet/IP tunnelling interface. The diagram's toolbar connects to it when the reader clicks **Link to ETS**.

```
ETS ──Tunneling IP 127.0.0.1:3672── BusDiagram-ETS ──ws://127.0.0.1:3761── diagram
```

## Get the program

Download `BusDiagram-ETS.exe` from the [releases of BusDiagram](https://github.com/Ynn/busdiagram/releases/latest) and start it: a window opens, to keep open during the session. It shows whether ETS and a diagram are connected, what to enter in ETS (with a button that copies the address), and a journal. It needs no installation; by default it is reachable from this computer only.

Port 3672 is chosen so as not to compete with KNX Virtual, which uses 3671: both can run at the same time.

## Link the diagram

1. Start BusDiagram-ETS.
2. In the diagram's toolbar, click **Link to ETS**. The control shows *ETS: waiting for ETS*, then *ETS linked* once ETS is connected.
3. In the ETS project, add the connection once (ETS 6.4: connection button at the right of the toolbar → *Manage configured connections* → *Add*): type *Tunneling IP*, address `127.0.0.1`, port `3672`, without NAT.
4. Click **Addresses for ETS** in the toolbar and import the file in the ETS project (right-click *Group Addresses* → *Import Group Addresses*): the group monitor then decodes the values with the names and DPTs of the diagram.
5. In ETS, open *Panels* → *Monitors* → *Group Monitor*, click *Start*, and choose the *Tunneling IP (127.0.0.1:3672)* connection.

One diagram is linked at a time: linking another one disconnects the first, which says so. **Disconnect** ends the link; closing the program ends it too.

## Where ETS reaches the bus

| The diagram has | ETS reaches the bus | Effect |
| --- | --- | --- |
| a USB or IP interface (`usbInterface/v1`) | through that interface, on its line | Exact: couplers filter as on a real installation; the interface's `groupAddresses` parameter decides what crosses them. With several interfaces, the toolbar lets the reader choose. |
| no interface | on the main line: the IP network, otherwise the backbone, otherwise the first main line, otherwise the line | Simpler: every group address of the diagram is assigned to ETS, so couplers forward them to and from it while the link lasts; the filter tables show them. |

Telegrams from ETS enter the bus there with their own source (the tunnel address, `15.15.251`), priority, routing counter and bytes. No DPT travels in a telegram: each receiving object decodes the bytes with its own DPT, and ignores a payload of another size, which the journal explains. Telegrams that reach the access point through the topology are sent to ETS, with the routing counter they have there.

## Programming individual addresses from ETS

In a diagram that simulates [commissioning](commissioning.html), the devices start at 15.15.255, as delivered. In ETS, right-click a device of the project → *Download* → *Individual Address*, then click the programming button of the device in the diagram (the small square beside its address): its LED lights up, ETS writes the address, restarts the device, and the LED goes out. The designer, when it shows the diagram, records the new address (column **Adr**). The usual mistakes have their effect: two LEDs on, and both devices answer; an address already used on the bus, and ETS finds it.

The devices of BusDiagram answer with the device descriptor 07B0 (TP1, System B) and the manufacturer code of KNX Association, as those of KNX Virtual; their applications are downloaded from the designer.

## Downloading an application from ETS

Manufacturers' devices, which BusDiagram does not deliver, are imported from a package of devices (`.bdpkg`, button **Import devices…** of the Catalog panel; see [extensions](extensions.html#deliver-manufacturers-devices-in-a-package)), and are programmed by ETS as the real ones. Turn on **Simulate commissioning** (Installation panel): without it, the devices hold no memory, and the toolbar says so when ETS tries to download one. Insert the device from the **Programmed by ETS** category of the designer's catalog, and create the same device in the ETS project, from the manufacturer's catalog. The device answers ETS with the mask of its application program (0011 or 0012 for a BCU1, 0701 or 0705 for a System 7, 07B0 for a System B) and holds a memory: ETS writes the parameters, the group address table, the associations and the group objects there (for a System 7 and a System B, through their load state machines; a System B allocates its segments itself), verifies each write by a read, starts the application, and restarts the device. As a delivered device, it holds the code of its manufacturer and the identifier of its application, which ETS checks first. The application code of a System 7 device is written too, which takes a few minutes, as on a real bus. The diagram then runs what the memory holds, as the device does, when it is one of the product's programs (another program, or one partly downloaded, runs nothing, and the journal says which program it got): change a parameter in ETS, download, and the device behaves accordingly; download without the group addresses, and it sends nothing. The designer writes into the project what the download left in the device (its parameters, its group objects and their group addresses), so that the scenario says how the device is really configured; **Undo** brings the former project back. On the diagram, a manufacturer's device shows only the group objects linked to a group address or driving a load; its sheet lists them all. The JSON file keeps all the memory the download wrote; the standalone page, the code to paste and the player link leave out the application code that ETS wrote from the manufacturer's catalog, and keep what the device runs from (system part, tables, parameters).

The parameter pages of the device in the designer are those of ETS: same pages, same parameters and choices, in the same order, with the names and functions of its group objects. The designer can also download it (context menu → *Download*), as ETS would.

A product taken from the online catalog of ETS works the same, when its application program is one the device simulates: same manufacturer, type and version, and not KNX Secure. A newer version of the program is downloaded by ETS but runs nothing in the diagram, until the package of devices brings it.

## While linked

- The simulation runs in real time, also when its tab is in the background, since ETS keeps sending and waits for answers.
- A group telegram from ETS is refused while the simulation is paused; it is not played later in a batch. The device management of ETS (individual addresses, downloads) goes on: a pause stops the applications, not the bus. Both are refused when the simulation is stopped by a fault.
- The speed is **Instant** when the link opens: telegrams take the time of a real bus (about 20 ms each, and as long again for each coupler crossed), and the cables they reach light up without anything travelling. **Animated** shows them travel at the pace of the diagram instead: a telegram that crosses couplers then takes a few seconds to arrive, which ETS accepts.
- Step by step is not available.

## Limits

| What | In BusDiagram-ETS |
| --- | --- |
| Group communication (write, read, response) | Yes |
| Individual address in programming mode (read, write), connection to a device, device descriptor, manufacturer and serial number, restart | Yes: the devices of the diagram answer as delivered devices do; with [commissioning](commissioning.html), ETS programs their individual address with the programming button of the diagram |
| Download of an application (memory, properties) | Yes for the manufacturers' devices imported from a package (BCU1 and System 7 masks); no for the devices of BusDiagram, whose parameters and associations are set in the diagram: ETS gets a refusal |
| Bus monitor, KNX Secure | No |
| Several diagrams at once | No, one at a time |
| Pages allowed to link | Files from disk, pages served on this computer, `https://ynn.github.io`; others in the settings |

## Settings of the program

The **Settings** section of the window changes, and keeps for the next sessions:

| Setting | Default | Use |
| --- | --- | --- |
| Port for ETS (UDP) | 3672 | Another port if 3672 is taken; enter the same in the ETS connection. |
| Port for the diagrams | 3761 | Another port if 3761 is taken; the diagram asks for it when it cannot connect. |
| Accept ETS from another computer of the network | off | ETS on another computer connects to this computer's address, which the window shows. Any computer of the network can then send telegrams to the diagram; no real installation is involved. The firewall must let the UDP port through. |
| Allowed sites | none | Sites, besides files, local pages and the published site, whose diagrams may link. |
| Detailed journal | off | Every telegram in the journal. |

When the diagram cannot reach the program, its toolbar offers to download it, and a **Port** field to give the program's port if it was changed; the browser remembers it.

The same settings exist on the command line, without saving them, and `--no-gui` runs the program in a terminal:

```
BusDiagram-ETS.exe [--no-gui] [--ws-port 3761] [--tunnel-port 3672] [--remote-ets] [--allow-origin https://site] [--verbose]
```

A page can also set the address of the program with the `bridge` option, and `bridge="none"` hides the control:

```html
<bus-diagram bridge="ws://127.0.0.1:3761/ws">
```

## For developers

The program is in `ets-bridge/` (Rust): a tunnelling server limited to what ETS uses, and a WebSocket where each binary message is one cEMI frame. On the simulation side, `Simulation.ingest(access, telegram)` puts an external telegram on the bus, and `Simulation.tap(access, fn)` gives the telegrams at an access point, `{ device: "usbInterface" }` or `{ segment: "L1.1" }`.
