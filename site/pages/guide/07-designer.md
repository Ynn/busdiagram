---
title: Designer
group: Tools
order: 7
---

# Designer

The [designer](../designer/index.html) is the main authoring tool for diagrams. It is a standalone web application that works offline. Editing tools appear on the left and a live preview on the right; drag the separator between them (or focus it and use the arrow keys) to share the width, and **Hide preview** to give the editor the whole window. The layout is remembered by the browser. You can prepare a scenario without writing JSON, edit the JSON directly, and export the result for a page or presentation.

Both editing modes use the same scenario. Changes made in the guided forms update the JSON; valid JSON edits update the forms. The browser saves the draft locally and restores it when you return.

## Start a scenario

Start with an empty installation, one of the interactive examples, or a template for a device or topology. You can also open an existing `.json` file. Format 1 scenarios are converted to format 2 when needed.

## Guided editor

The guided editor follows the working logic of ETS, so that students find the same gestures as in their KNX course: panels with a tree and a list, a catalog, group addresses linked to group objects by drag and drop. It does not copy ETS itself; the preview on the right shows the result at once.

### Panels

Two panels are stacked. The selector in the title bar of each panel chooses its content: **Topology**, **Group addresses**, **Catalog**, or **Installation** (title, description, simulated clock, heated rooms). **+ Panel** opens the second panel, and **×** closes it. Each panel has a tree on the left and a list on the right; the tabs at the bottom of the list change its content, as in ETS. Drag the separators (or focus them and use the arrow keys) to resize the tree, the list, and the two panels; the sizes are remembered by the browser.

In the Topology tree, a line with a line repeater or a segment coupler shows its two segments, and each device sits in its segment. A line without extension shows its devices directly. Devices are collapsed: open one (▸) to show its group objects in the tree. The **Filter** field above each tree keeps the nodes whose address or name contains the text, with their parents.

| Tree selection | List tabs |
| --- | --- |
| Topology (root) | Overview: IP network, backbone, main lines, areas and lines with their devices, couplers and filter tables. |
| Area | Lines of the area; name of the area; **Add line**. |
| Line | Devices of the line; name, power supply, and line extension. |
| Device | **Group objects** (number, name, object function, group addresses with the sending address marked **S**, length, DPT, C, W, T, R, and U flags) and **Parameters**: as in ETS, a list of pages on the left (General, each key, each output, objects shared by all outputs) and the parameters of the selected page on the right, one per row, label on the left and value on the right. |
| Group object | **Associations** (group addresses of the object; **Set as sending**; **Delete**; **Link with…**) and **Properties** (name, flags, DPT). |
| Group addresses (root), main group, middle group | Main groups, middle groups, or addresses, with **Add main group**, **Add middle group**, and **Add group address**; name the groups as in ETS. |
| Group address | **Associations** (objects linked to the address, with the sending one; their W, T, R, and U flags can be changed here, as in ETS; **Link with…**) and **Properties** (address, name, DPT, and grouped editing of linked objects). |
| Catalog | The device types that the simulator models, by category, with their application and group objects; **Items** … **in line** … **Add** inserts devices. |

Selecting a device in the diagram shows it in the Topology panel.

**Numbers of group objects.** As in the object table of an ETS application, each key of a push-button and each output of an actuator has a block of numbers of fixed size: two per key (single or short press, then long press), and one per function of the output, in the order of the functions of the device (for a switch actuator: switching, status, scene, forcing, power, energy). The objects of the whole device follow the blocks. A key or an output therefore keeps its numbers when another one gains or loses objects, and unused places leave gaps. Adding or deleting a key or an output renumbers the blocks after it. Guided edits keep the objects of the scenario, and the rows of the diagram, in the order of their numbers; for a scenario written by hand, **Order group objects by number** in the context menu of the device does it.

A right-click on any tree node or list row (or the context-menu key, or Shift+F10 in a tree) opens the commands of that element; the same element has the same commands wherever it appears, and a list row also offers **Open**. A right-click on the empty part of a list opens the commands of the element it shows. The commands include: add an area, a line, or devices from the catalog; add or remove a line extension; open the group objects or parameters of a device; **Link with…**; **Rename**; unlink all addresses of an object; add or delete groups and addresses; delete the element; add a catalog entry on a line.

**Rename** an area, a line, a device, a group object, a group, or a group address by double-clicking its name (in a tree or a list), with **F2** in a tree, or with **Rename** in the context menu. **Enter** confirms, **Escape** cancels.

### Programming gestures

- **Add a device:** drag a catalog entry onto a line of the Topology tree or onto the device list of a line, double-click the entry, or use **Add** at the bottom of the Catalog panel. The device receives the first free individual address of the line.
- **Link a group address and a group object:** drag the address from the Group addresses panel onto a group object (in the tree, or a row of the Group objects or Associations tab), or drag the group object onto the address. When a panel shows a group address, a group object, a middle group, or a line, the whole list of that panel is a drop target: there is no need to aim at a row. The first address of an object is its sending address; later ones are only listened to. **Set as sending**, in the Associations tab of the object, changes the sending address.
- **Activate a group object:** on a key or output page of the parameters, tick the box in front of a function (Forcing, Status feedback, …). The object appears in the tree and in the Group objects tab without any address, ready to be dragged onto a group address; removing its last address keeps it active. Untick the box to remove the object.
- **New address for an object:** drag a group object onto a middle group: a group address is created in it and linked to the object.
- **Move a device:** drag it onto another line; it receives a free address of that line and keeps its objects and links.

During a drag, the status bar at the bottom explains the gesture (“Link with 1: Key 1”). As in ETS, only objects and addresses of the same data size can be linked: an incompatible target is shown in red and the drop is refused. Each gesture, and the equivalent button, is one step of the undo history.

In the **Properties** tab of a group address, the associated-object editor groups objects by device and lets you add or remove an address from several objects at once. Before applying the change, it lists the effects on transmission addresses and object links. The whole operation can be undone in one step.

**About**, in the title bar, gives the version, the license, and the address of the source code. BusDiagram is an independent educational project, not affiliated with KNX Association; KNX and ETS are trademarks of KNX Association.

### Validation and undo

The designer proposes only compatible choices where possible: for example, group addresses and objects must use compatible DPT sizes. Invalid edits are rejected with an explanation, and the scenario keeps its previous valid value. Destructive edits require confirmation. Guided and JSON edits share one undo history.

Validation errors are listed below the editor. Select an error to open the relevant device or field.

## JSON editor

The JSON tab edits the complete scenario. It offers insertion templates, formatting, and conversion to format 2. Completion suggests fields, behavior ports, DPTs, declared group addresses, and existing objects and channels at the cursor position. Errors are highlighted in place. While the JSON is invalid, the preview continues to show the last valid scenario.

## Preview and export

The preview can show a full or compact toolbar, hide the monitor or description, and fit the diagram to a 16:9 slide. Export uses the selected display options.

| Export | Use |
| --- | --- |
| Code snippet | Embed the diagram in HTML, Markdown output, or a reveal.js slide. The code loads the designer's library version from a CDN, pinned with its integrity hash; see [versions](versions.html). See [Embedding](embedding.html). |
| Standalone HTML page | A single offline file containing the library, scenario, and loaded extensions. |
| JSON file | Save the scenario for version control or load it with `src`. |
| Viewer link | Put a compressed scenario in a URL fragment for an iframe or another web viewer. See [Viewer](viewer.html). |
| Library | Download `bus-diagram.js` to host alongside your page. |

## Extensions

The extension manager loads, replaces, and removes `.js` files. An extension can add a behavior, form fields, and a custom view. The designer remembers loaded extensions in the browser.

An update is accepted only when all loaded extensions, including their dependencies, can still load together. The designer checks them in an isolated environment equivalent to the exported standalone page. If an update fails, the existing definitions and saved sources remain in place. Extension scripts run in their own function scopes, so they can reuse internal variable names.

Required parameters and initial states are entered before a new extension device is added. The editor distinguishes an omitted value, an empty string, and `null` where the schema permits them.

Load only scripts you trust: an extension executes as part of the page. Standalone pages include loaded extensions. Code snippets reference extension files that you must host beside the page; viewer links do not carry extension code.

## Languages

The language menu switches the designer and preview between English and French. Exported pages and viewer links retain the chosen language. Scenario titles, names, and descriptions remain the author's own text. See [Languages](languages.html).
