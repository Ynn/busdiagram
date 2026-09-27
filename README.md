# BusDiagram

BusDiagram is a tool for designing instructional diagrams of KNX installations. A diagram is described in JSON and drawn by a web component: lines and couplers, devices, communication objects, group addresses, and connected loads. The layout is derived from the addresses, so no drawing coordinates are required.

Diagrams can also be operated. A limited simulation layer lets the reader press a button and follow the resulting telegrams through the topology, with a group monitor and a step mode. The simulation is a teaching aid with documented simplifications; it is not a protocol reference or a replacement for commissioning software.

The library is a single JavaScript file and works offline, including from `file://`.

```html
<script src="bus-diagram.js"></script>

<bus-diagram toolbar="compact">
  <script type="application/json">
    { "formatVersion": 2, "title": "Example", "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

JavaScript is also supported: `BusDiagram.create("#zone", scenario, { monitor: false })`.

## Documentation

Open [docs/index.html](docs/index.html) directly in a browser. No server or network connection is needed. Documentation pages are maintained as Markdown in `site/pages/` and generated with Eleventy; `docs/` is the build output.

- **Guide:** installation, a first diagram, the scenario format, devices, shutters, topology, DALI, HVAC, embedding, slides, extensions, timing, errors, and model limits.
- **Examples:** independent diagrams of typical installations and integration patterns, with HTML and JSON source you can copy.
- **Reference:** display options, JSON fields, behaviors, ports, DPTs, API, events, and error codes. Much of it is generated from the code.
- **Designer:** [docs/designer/index.html](docs/designer/index.html) offers guided forms and a JSON editor with completion, inline errors, a live preview, templates, extensions, and export options.
- **Generation:** `docs/llms.txt` is an authoring reference for language models, generated from the library; `npm run validate -- file.json` checks scenarios from the command line. See the guide page on language models.
- **Languages:** the component and designer support English and French. Set the page's `lang` attribute or a component's `lang` attribute; additional catalogs can be registered with `BusDiagram.registerMessages`.

## Publishing

`docs/` is a static site with relative links. It can be hosted at a domain root or under a subpath.

- **GitHub Pages:** select *GitHub Actions* as the Pages source. [The workflow](.github/workflows/pages.yml) checks and builds on pushes to `main`; run it manually with **Run workflow** to deploy after the release review.
- **Cloudflare Pages:** use `npm run build` and publish `docs/`. The Node version is in `.node-version`.
- **Other web servers:** copy `docs/`.

Third-party license texts for the distributed bundles are in [docs/THIRD_PARTY_NOTICES.txt](docs/THIRD_PARTY_NOTICES.txt).

## Repository checks

Install [pre-commit](https://pre-commit.com/) and Go, then run `npm install` to activate the Git hook. On each commit, the hook checks the staged files with Gitleaks and standard repository hygiene checks. Run `npm run check:publication` to inspect every file Git would publish, including currently untracked files, using an isolated temporary index. The command leaves your real staging area unchanged.

An optional, untracked `.local/publication-rules.yaml` file can add maintainer-specific pre-commit rules; the local hook and the full check run it when it exists. GitHub Pages CI runs the public rules only. Automated checks cannot determine whether text or images may be published; review their provenance before release.

## Versions and releases

BusDiagram follows [Semantic Versioning](https://semver.org/). The version is defined once in `package.json`; it appears as `BusDiagram.version`, in the banner of the distributed files, and in the documentation footer. Changes are listed in [CHANGELOG.md](CHANGELOG.md), and the policy is described in the guide page “Versions and releases”.

To release a version:

1. Move the entries of `## [Unreleased]` in `CHANGELOG.md` to a new `## [X.Y.Z] - YYYY-MM-DD` section.
2. Run `npm version <patch|minor|major>`: it updates `package.json` and `package-lock.json`, commits, and creates the tag `vX.Y.Z`. `npm run check:version` verifies that the version is valid and documented.
3. Push the branch and the tag (`git push --follow-tags`). The [release workflow](.github/workflows/release.yml) checks that the tag matches the version, runs all checks, and creates a GitHub release with `bus-diagram.js`, `bus-diagram.esm.js`, and the third-party notices.

The package is marked `"private": true` to prevent an accidental publication. To publish on npm, set `private` to `false`, add the `NPM_TOKEN` secret and the repository variable `NPM_PUBLISH=true`; the release workflow then runs `npm publish`. The package provides a classic script (`main`, `browser`, `jsdelivr`, `unpkg`), an ES module (`module`, `exports.import`), and TypeScript declarations (`types`).

## Development

```bash
npm install
npm run check          # lint, type check, unit tests, and full build
npm run test:e2e       # build and run the Chromium browser tests
npm run sync           # regenerate demo/offline.html from scenarios/*.json
npm run build:site     # regenerate docs/ after the main build
npm run schema         # regenerate the v2 JSON schema and TypeScript types
npm run validate -- f.json  # validate scenario files (use - for standard input)
```

Visual regression snapshots are in [tests/e2e/demo.spec.ts-snapshots](tests/e2e/demo.spec.ts-snapshots). After an intentional visual change, update them with `npx playwright test tests/e2e/demo.spec.ts -g "reference screenshots" --update-snapshots` and review the resulting images.

## Project layout

- `src/knx/`: diagram model and simulation engine, scenario validation, event queue, network, behaviors, DPT codecs, telegram format, and v2 export.
- `src/equipment/` and `src/ui/`: connected loads and the `<bus-diagram>` web component.
- `src/core.ts` and `src/index.ts`: DOM-free API and browser bundle entry points.
- `site/`: documentation, designer, and player sources; `scripts/build-site.mjs` generates `docs/`.
- `scenarios/`: example installations; `site/samples/extensions/`: sample extensions; `schema/`: generated authoring schema.
- `demo/`: offline demonstration; `docs/`: generated, publishable site.
