---
title: Versions and releases
group: For developers
order: 11.5
---

# Versions and releases

BusDiagram follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). A version number `MAJOR.MINOR.PATCH` tells what an update can change for pages that already use the library. The changes of each version are listed in `CHANGELOG.md`.

## Find the version

- In a page: `BusDiagram.version`, for example `"0.1.0"`.
- In a file: the first line of `bus-diagram.js` and `bus-diagram.esm.js` is a banner such as `/*! BusDiagram v0.1.0 | AGPL-3.0-only … */`. Standalone pages exported by the designer embed the library with this banner.
- In the documentation: the footer of every page shows the version it describes. The published documentation, designer, and player always correspond to the latest released version.

## What the version covers

The public interface is what the [reference](../reference/index.html) documents:

- the `BusDiagram` global functions and the `<bus-diagram>` element: attributes, properties, methods, and `bd-*` events;
- the scenario format (`formatVersion` 2) and its JSON Schema;
- behavior and equipment identifiers, their ports, parameters, and initial states;
- the extension contracts: `registerBehavior`, `registerEquipment`, `registerEquipmentView`, and `registerMessages`.

The internal structure of the component (shadow DOM, CSS classes), the exact drawing, and the event log messages are not part of the public interface; they can change in any version.

| Change | From 1.0.0 | Before 1.0.0 |
| --- | --- | --- |
| Incompatible change of the public interface | New major version (2.0.0) | New minor version (0.2.0) |
| New compatible feature, such as an optional field, port, or behavior | New minor version (1.1.0) | New minor version (0.2.0) |
| Correction without interface change | New patch version (1.0.1) | New patch version (0.1.1) |

Behavior identifiers carry their own version (`switchActuator/v1`). An incompatible change of a behavior introduces a new identifier (`switchActuator/v2`) rather than changing the meaning of an existing one. The scenario format has its own number (`formatVersion`), independent of the library version; older formats remain readable, as [format 1](format-v1.html) is today.

## Pin a version

A page should load a known version of the library:

- **Self-hosted file:** keep `bus-diagram.js` next to your pages and replace it deliberately when you update. Check its banner to know which version it is.
- **CDN:** use a URL that contains the full version number. A URL without a version, a version range such as `@0` or `@0.1`, or a moving tag such as `latest` can change the behavior of an existing page when a new version is released. For version {{version}}:

  ```html
  {{cdn-tag}}
  ```

  The `integrity` attribute holds the SHA-384 hash of the published file (Subresource Integrity). Keep it when copying the tag; when changing the version, take the new tag from the [installation page](installation.html) or the designer, since the hash differs for each version.
- **Standalone page:** a page exported by the designer embeds the library. It keeps its version and works offline.
- **Code from the designer:** **Export → Code to paste into a page** loads the version of the designer that produced it from the CDN, with its integrity hash. A diagram designed today keeps working with the library it was checked against.

Before updating across a major version (or a minor version before 1.0.0), read the corresponding section of `CHANGELOG.md` and validate your scenarios with the [designer](../designer/index.html) or `npm run validate`.
