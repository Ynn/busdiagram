# Changelog

All notable changes to BusDiagram are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the library follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The versioning policy is described in the guide page “Versions and releases”.

## [Unreleased]

### Changed

These corrections change simulation results for some existing scenarios; they follow the KNX training documentation, ETS behavior, and product manuals.

- Couplers: in filter mode, a group telegram crosses a coupler only when its address is in the coupler's filter table (addresses used on both sides), in both directions. Previously an address used only on the destination side also crossed, so a tool or visualisation outside the filter tables could reach devices behind a coupler.
- Group reads: an object with the R flag answers a read received on any of its group addresses, and sends the response on its sending address. Previously only a read on the sending address was answered.
- Shutter actuator: a stop/step command at rest no longer moves a roller shutter without slats by default (`stepPct` now defaults to 0); set `stepPct` to model actuators that do.
- Validation: a line repeater or segment coupler cannot use the line coupler address (`A.L.0`); lines 0.1 to 0.15 are reported as not supported by BusDiagram rather than invalid; a device address `A.0.0` is reported as reserved for the area (backbone) coupler.
- Documentation: KNX group addresses and DALI broadcast are no longer confused in the DALI example; filter tables are described as in ETS 6.3 and later, where manual entries are deprecated.

### Added

- Designer: communication objects can be renamed in the device view (section “Communication objects: names and flags”).
- USB interface: a `groupAddresses` parameter assigns group addresses to the interface, which then enter the coupler filter tables, as ETS does for a modeled bus interface.

## [0.1.2] - 2026-09-28

### Added

- Documentation: links to the source repository and the list of changes in the header and footer.

### Changed

- Documentation: complete review against the code. The DPT reference is sorted by number and shows the size and bytes of 3- and 4-byte values correctly, with the decoded value a receiver displays; the guide covers every optional root field, the clock and room assignment of temperature sensors, the clock hooks available to extensions, and the current HVAC limits.
- Documentation: command and status objects explained against product manuals (dimming example, R and U flags), and the two ways of driving a push-button indicator from the actual state of the load.
- Behaviors: every parameter and initial state has a description in the reference and the designer.
- Documentation: the home page shows how to load the library from the CDN, pinned to the documented version, as well as from a local copy.

## [0.1.1] - 2026-09-28

### Changed

- Designer: the code to paste into a page loads the library from jsDelivr at the designer's exact version, with a Subresource Integrity hash, instead of a local `bus-diagram.js` file.
- The documentation site, designer, and player are published with each release, so they always correspond to a version available on npm. The installation and versions guides show the pinned CDN tag of that version.

### Fixed

- Designer: a guided form field no longer loses text being typed when the page re-renders before the edit is confirmed (for example when an extension finishes loading).

## [0.1.0] - 2026-09-28

First public version.

### Added

- `<bus-diagram>` web component and `BusDiagram` global API, distributed as a classic script (`bus-diagram.js`) and an ES module (`bus-diagram.esm.js`), with TypeScript declarations.
- Scenario format 2 (JSON) with generated JSON Schema, validation with located error messages, and conversion from format 1.
- Diagram layout derived from individual addresses: lines, main lines, backbone, line and area couplers, KNXnet/IP routers, line repeaters, and segment couplers.
- Behaviors: push-button, switching actuator (timer, scenes, priority, normally closed relay, power and energy metering, load shedding), shutter actuator (venetian blind slats, wind alarm), dimming actuator (tunable white), KNX/DALI gateway, presence detector, room thermostat, heating actuator, window contact, temperature sensor, air quality sensor, weather station, logic module, clock master, weekly time switch, display, USB interface, and passive device.
- Simulation layer: telegram propagation, coupler filtering and routing counter, object flags, group reads and responses, step mode, simulated clock, room thermal model, and configuration warnings.
- Designer with guided forms, JSON editor, templates, extensions, and exports; standalone player; offline documentation site; prompt generator and authoring reference for language models; English and French interfaces.
