# BusDiagram

Documentation: <https://ynn.github.io/busdiagram/> · Package: `npm install bus-diagram`

BusDiagram is a tool for designing instructional diagrams of KNX installations. A diagram is described in JSON and drawn by a web component: lines and couplers, devices, communication objects, group addresses, and connected loads. The layout is derived from the addresses, so no drawing coordinates are required.

Diagrams can also be operated. A limited simulation layer lets the reader press a button and follow the resulting telegrams through the topology, with a group monitor and a step mode. The simulation is a teaching aid with documented simplifications; it is not a protocol reference or a replacement for commissioning software.

The library is a single JavaScript file and works offline, including from `file://`.

## Quick start

Install it with `npm install bus-diagram`, load a fixed version from a CDN, or download `bus-diagram.js` from the documentation site:

```html
<script src="https://cdn.jsdelivr.net/npm/bus-diagram@0.1.2/dist/bus-diagram.js"></script>

<bus-diagram toolbar="compact">
  <script type="application/json">
    { "formatVersion": 2, "title": "Example", "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

JavaScript is also supported: `BusDiagram.create("#zone", scenario, { monitor: false })`.

## Documentation

The documentation is published at <https://ynn.github.io/busdiagram/>. It also works offline: open [docs/index.html](docs/index.html) in a browser, without a server or network connection.

- **Guide:** installation, a first diagram, the scenario format, devices, shutters, topology, DALI, HVAC, embedding, slides, extensions, timing, errors, and model limits.
- **Examples:** independent diagrams of typical installations and integration patterns, with HTML and JSON source you can copy.
- **Reference:** display options, JSON fields, behaviors, ports, DPTs, API, events, and error codes. Much of it is generated from the code.
- **Designer:** [docs/designer/index.html](docs/designer/index.html) offers guided forms and a JSON editor with completion, inline errors, a live preview, templates, extensions, and export options.
- **Generation:** a prompt generator and an authoring reference for language models (`llms.txt`) help write scenarios from a description; see the guide page on language models.
- **Languages:** the component and designer support English and French. Set the page's `lang` attribute or a component's `lang` attribute; additional catalogs can be registered with `BusDiagram.registerMessages`.

## Versions

BusDiagram follows [Semantic Versioning](https://semver.org/). `BusDiagram.version` and the banner of the distributed files give the version in use; changes are listed in [CHANGELOG.md](CHANGELOG.md). Pin a version in CDN URLs. See the guide page “Versions and releases” for what each kind of version can change.

## License

BusDiagram is distributed under the GNU Affero General Public License, version 3 ([LICENSE](LICENSE), [NOTICE](NOTICE)). Licenses of the third-party components included in the distributed files are in `THIRD_PARTY_NOTICES.txt`.
