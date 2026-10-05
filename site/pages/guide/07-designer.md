---
title: Designer
group: Tools
order: 7
---

# Designer

The [designer](../designer/index.html) is the main authoring tool for diagrams. It is a standalone web application that works offline. Editing tools appear on the left and a live preview on the right; drag the separator between them (or focus it and use the arrow keys) to share the width, and **Hide preview** to give the editor the whole window. The layout is remembered by the browser. You can prepare a scenario without writing JSON, edit the JSON directly, and export the result for a page or presentation.

Both editing modes use the same scenario. Changes made in the guided forms update the JSON; valid JSON edits update the forms. The browser saves the draft locally and restores it when you return.

## Start a scenario

Start with an empty installation, one of the interactive examples, or a template for a device or topology. You can also open an existing `.json` file, or follow the icon at the end of the toolbar of any diagram, which opens that diagram here.

## Guided editor

The guided editor follows the working logic taught in KNX courses: panels with a tree and a list, a catalog, group addresses linked to group objects by drag and drop. The preview on the right shows the result at once.

### Panels

Two panels are stacked. The selector in the title bar of each panel chooses its content: **Topology**, **Group addresses**, **Building**, **Catalog**, or **Installation** (title, description, simulated clock, and a button that opens the Building panel). **+ Panel** opens the second panel, and **×** closes it. Each panel has a tree on the left and a list on the right; the tabs at the bottom of the list change its content. Drag the separators (or focus them and use the arrow keys) to resize the tree, the list, and the two panels; the sizes are remembered by the browser.

In the Topology tree, a line with a line repeater or a segment coupler shows its two segments, and each device sits in its segment. A line without extension shows its devices directly. Devices are collapsed: open one (▸) to show its group objects in the tree. The **Filter** field above each tree keeps the nodes whose address or name contains the text, with their parents.

The Building tree lists the rooms, each with the devices placed in it and the outputs that heat or cool it, then the devices without outputs that are in no room. Here the room is not only a filing place: thermostats, temperature sensors, and window contacts can read the room they are in (a mark on their icon; a thermostat may use an external temperature instead), and radiators and fan coils heat or cool the room of their output. A device with outputs is not placed in a room; its heating and cooling outputs are, each in the room it heats.

| Tree selection | List tabs |
| --- | --- |
| Topology (root) | Overview: IP network, backbone, main lines, areas and lines with their devices, couplers and filter tables. |
| Area | Lines of the area; name of the area; **Add line**. |
| Line | Devices of the line; name, power supply, and line extension. |
| Device | **Group objects** (number, name, channel, object function, group addresses with the sending address marked **S**, length, DPT, C, R, W, T, U, and I flags) and **Parameters** (see below). |
| Group object | **Associations** (group addresses of the object; **Set as sending**; **Delete**; **Link with…**) and **Properties** (name, flags, priority, DPT). |
| Group addresses (root), main group, middle group | Main groups, middle groups, or addresses, with **Add main group**, **Add middle group**, and **Add group address**; name the groups. |
| Group address | **Associations** (objects linked to the address, with the sending one; their C, R, W, T, U, and I flags can be changed here; **Link with…**) and **Properties** (address, name, DPT, and grouped editing of linked objects). |
| Building (root) | Rooms with their temperatures and contents; **Add a room**. |
| Room | Name, initial and outside temperatures, window open at start; its devices and outputs, with the effect of the room on each; **Delete room** (refused while an output still heats or cools it; devices placed in the room and other loads that name it lose that link). |
| Catalog | The device types that the simulator models, by category, with their application and group objects; **Items** … **in line** … **Add** inserts devices. |

Selecting a device in the diagram shows it in the Topology panel.

**Numbers of group objects.** As in the object table of a KNX product, each input of a push-button interface and each output of an actuator has a block of numbers of fixed size: one per function of the input or output, in the order of the functions of the device (seven per input of a push-button interface; for a switch actuator: switching, status, scene, forcing, lock, logic, power, energy). The objects of the whole device follow the blocks. An input or an output therefore keeps its numbers when another one gains or loses objects, and unused places leave gaps. Adding or deleting an input or an output renumbers the blocks after it. Guided edits keep the objects of the scenario, and the rows of the diagram, in the order of their numbers; for a scenario written by hand, **Order group objects by number** in the context menu of the device does it.

A right-click on any tree node or list row (or the context-menu key, or Shift+F10 in a tree) opens the commands of that element; the same element has the same commands wherever it appears, and a list row also offers **Open**. A right-click on the empty part of a list opens the commands of the element it shows. The commands include: add an area, a line, or devices from the catalog; add or remove a line extension; open the group objects or parameters of a device; **Link with…**; **Rename**; unlink all addresses of an object; add or delete groups and addresses; delete the element; add a catalog entry on a line.

**Rename** an area, a line, a device, a group object, a group, or a group address by double-clicking its name (in a tree or a list), with **F2** in a tree, or with **Rename** in the context menu. **Enter** confirms, **Escape** cancels.

### Device parameters

The **Parameters** tab is organized as the parameter dialog of a KNX product: a tree of pages on the left, the selected page on the right with one parameter per row, label on the left and value on the right. A parameter page never shows a group address: three levels stay apart.

The page list and the selected page scroll independently. Selecting another page or device opens its page at the top.

1. **Parameters of the device.** **General** gives the name, the line, and the individual address. **Configuration** sets the number of outputs (or of inputs) and lists them in a table with their connected loads and the functions they enable. A new output repeats the previous one: its settings, its load, and its enabled group objects, which have no group address yet. The **Scenes** page of an output is a table of scene assignments, as in an actuator's parameters: per row, whether the output takes part in the scene, its number (1–64), and the state, level, or position it takes. It receives the scenes through its own scene object, or through the central scene object enabled on the **Scenes** page of the device. Each device type organizes its parameters by function: for a switch actuator, a page for metering and load shedding, then for each output a group (**+** / **−**) with **Function**, **Delays**, **Timer**, **Forcing and lock**, **Logic link**, **Scenes**, **Bus voltage**, **Metering**, and **Connected loads**. Dependent settings appear only when they apply: the timer options once a duration is set, the end of forcing once the forcing object is enabled.
2. **Group objects enabled by the parameters.** **Enable group object “…”** creates the object, as the corresponding parameter of a product does; unticking it deletes the object. The enabled objects appear in the **Group objects** tab, which is where they are linked to group addresses (or by drag and drop, or from a group address with **Link with…**).
3. **Loads wired to the outputs**, which belong to the simulation, not to the device configuration. An output is a relay or a channel of the actuator: it has its own settings and group objects, and is controlled on its own. The **Connected loads** page of an output lists the loads wired to it, in parallel: the output switches them all together, and a metering actuator measures the sum of their powers. **Connect a load…** adds one; each load has a type, an optional name shown in the diagram, its parameters, and, for a radiator, its heated room. A shutter output drives one motor.

A device whose functions belong to channels without driving a load, such as the measured circuits of an energy meter, has the same Configuration page (number of channels) and a group per channel, without connected loads. A push-button interface counts **inputs**: each input has its pages **Function**, **Lock**, **LED**, and **Bus voltage and cyclic sending**, then **Wired push-button**, which gives the text written on the push-button wired to the input, drawn on its key (the input keeps its name).

**Installation pages.** What belongs to the installation simulated around a device, and not to its parameters, is shown in the orange of the 230 V wiring, with a plug icon, under an **Installation** divider in the tree of pages: the **Connected loads** of an output, the **Wired push-button** of an input, the **Inputs in the diagram** of a device. Everything else is set as in the parameter dialog of the product. The function chosen on the **Function** page creates its group objects, as in a product's parameter dialog: switching gives a switching object, dimming a switching and a dimming object, a blind an up/down and a stop/step object; choosing another function replaces them, and an object kept from one function to the next keeps its addresses. The lock and LED objects are enabled on their pages.

**Inputs in the diagram**, another level of the simulation, lists the objects of the device for which the reader can type a value in the diagram: the measurements of a weather station or an air quality sensor, the power of a metered circuit, a value of a gateway. Tick **Entered**, then give the label, the minimum, the maximum, and the step of the field; the value is written to the object and sent on its group address, so the object needs one.

A right-click on an output or a key, in the tree of pages or in the Configuration table, opens its commands: settings, connected loads, rename, copy settings to other outputs, add, delete. A right-click on a load moves it up or down, or disconnects it.

**Tables.** Click a column header to sort by that column (again for descending order, a third time for the original order); drag the right edge of a header to resize the column, and double-click the edge to return to automatic widths. The widths are remembered by the browser. The Group objects table shows the channel of each object: the output of an actuator or the key of a push-button.

### Programming gestures

- **Add a device:** drag a catalog entry onto a line of the Topology tree or onto the device list of a line, double-click the entry, or use **Add** at the bottom of the Catalog panel. The device receives the first free individual address of the line.
- **Link a group address and a group object:** drag the address from the Group addresses panel onto a group object (in the tree, or a row of the Group objects or Associations tab), or drag the group object onto the address. When a panel shows a group address, a group object, a middle group, or a line, the whole list of that panel is a drop target: there is no need to aim at a row. The first address of an object is its sending address; later ones are only listened to. **Set as sending**, in the Associations tab of the object, changes the sending address.
- **Enable a group object:** on the Settings page of an output, tick **Enable group object “…”** (Forcing, Status feedback, …). The object appears in the tree and in the Group objects tab without any address, ready to be dragged onto a group address; removing its last address keeps it enabled. Untick the box to remove the object.
- **New address for an object:** drag a group object onto a middle group: a group address is created in it and linked to the object.
- **Move a device:** drag it onto another line; it receives a free address of that line and keeps its objects and links.
- **Place a device in a room:** drag it from the Topology panel or the Building tree onto a room, or onto **Not in a room** to take it out. Drag an output of the Building tree onto another room to heat or cool that room.

During a drag, the status bar at the bottom explains the gesture (“Link with 1: Key 1”). Only objects and addresses of the same data size can be linked: an incompatible target is shown in red and the drop is refused. Each gesture, and the equivalent button, is one step of the undo history.

In the **Properties** tab of a group address, the associated-object editor groups objects by device and lets you add or remove an address from several objects at once. Before applying the change, it lists the effects on transmission addresses and object links. The whole operation can be undone in one step.

**About**, in the title bar, gives the version, the license, and the address of the source code. BusDiagram is an independent educational project, not affiliated with KNX Association; KNX and ETS are trademarks of KNX Association.

### Validation and undo

The designer proposes only compatible choices where possible: for example, group addresses and objects must use compatible DPT sizes. Invalid edits are rejected with an explanation, and the scenario keeps its previous valid value. Destructive edits require confirmation. Guided and JSON edits share one undo history.

Validation errors are listed below the editor. Select an error to open the relevant device or field.

## JSON editor

The JSON tab edits the complete scenario. It offers insertion templates, formatting, and conversion to format 2. Completion suggests fields, behavior ports, DPTs, declared group addresses, and existing objects and channels at the cursor position. Errors are highlighted in place. While the JSON is invalid, the preview continues to show the last valid scenario.

## Preview and export

The **Simulation** tab, next to **Guided** and **JSON**, shows the diagram alone over the whole width of the window, with its monitor; the other tabs bring the editors back.

The preview can show a full or compact toolbar, hide the monitor or description, and fit the diagram to a 16:9 slide. Export uses the selected display options.

| Export | Use |
| --- | --- |
| Code snippet | Embed the diagram in HTML, Markdown output, or a reveal.js slide. The code comes in two parts, each with its own **Copy** button: the library (and the extensions) to paste once per page, then the diagram to paste where each one goes, so a page with several diagrams loads the library once. The library is a published version on a CDN, pinned with its integrity hash; see [versions](versions.html). See [Embedding](embedding.html). |
| Standalone HTML page | A single offline file containing the library, scenario, and loaded extensions. |
| JSON file | Save the scenario for version control or load it with `src`. |
| Viewer link | Put a compressed scenario in a URL fragment for an iframe or another web viewer. See [Viewer](viewer.html). |
| Library | Download `bus-diagram.js` to host alongside your page. |

To prepare a variant of an example, such as an address changed, a flag removed, or a coupler set to block, start from it in **Start from a template**, change it, and share it as a viewer link or a standalone page. Each copy runs with its own state.

## Extensions

The extension manager loads, replaces, and removes `.js` files. An extension can add a behavior, form fields, and a custom view. The designer remembers loaded extensions in the browser.

An update is accepted only when all loaded extensions, including their dependencies, can still load together. The designer checks them in an isolated environment equivalent to the exported standalone page. If an update fails, the existing definitions and saved sources remain in place. Extension scripts run in their own function scopes, so they can reuse internal variable names.

Required parameters and initial states are entered before a new extension device is added. The editor distinguishes an omitted value, an empty string, and `null` where the schema permits them.

Load only scripts you trust: an extension executes as part of the page. Standalone pages include loaded extensions. Code snippets reference extension files that you must host beside the page; viewer links do not carry extension code.

## Languages

The language menu switches the designer and preview between English and French. Exported pages and viewer links retain the chosen language. Scenario titles, names, and descriptions remain the author's own text. See [Languages](languages.html).
