# Changelog

All notable changes to BusDiagram are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the library follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The versioning policy is described in the guide page “Versions and releases”.

## [Unreleased]

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
