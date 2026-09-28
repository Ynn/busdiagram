---
title: Designer
group: Tools
order: 7
---

# Designer

The [designer](../designer/index.html) is the main authoring tool for diagrams. It is a standalone web application that works offline. Editing tools appear on the left and a live preview on the right. You can prepare a scenario without writing JSON, edit the JSON directly, and export the result for a page or presentation.

Both editing modes use the same scenario. Changes made in the guided forms update the JSON; valid JSON edits update the forms. The browser saves the draft locally and restores it when you return.

## Start a scenario

Start with an empty installation, one of the interactive examples, or a template for a device or topology. You can also open an existing `.json` file. Format 1 scenarios are converted to format 2 when needed.

## Guided editor

The guided editor has three levels: installation, device, and group address. Breadcrumbs and the Back button return to the previous view.

The **installation** view contains the title, description, [topology](topology.html), couplers, heated [rooms](hvac.html), the [simulated clock](time.html#simulated-clock), and group addresses. You can add lines, areas, devices, an IP network, or a supervisor. New devices receive available individual addresses. For each group address, the designer shows its DPT and whether any object transmits or listens on that address.

Open a **device** from the list or the diagram to edit its name, line, address, parameters, communication objects, and flags. The available controls follow its behavior: buttons for a push button, outputs for an actuator, and forms for other built-in or extension behaviors. Output settings can be copied to compatible outputs without changing their objects or group addresses. Advanced controls expose scenes and other optional parameters.

Open a **group address** to inspect its connected objects and their W, T, R, and U flags. The associated-object editor groups objects by device and lets you add or remove an address from several objects at once. Before applying the change, it lists the effects on transmission addresses and object links. The whole operation can be undone in one step.

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
