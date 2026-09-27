---
title: Generate with a language model
group: Tools
order: 7.8
---

# Generate diagrams with a language model

A scenario is a declarative JSON document: devices, communication objects, group addresses, and loads. The layout is derived from the addresses, so no coordinates are needed. This makes the format suitable for generation by a language model from a textual description, provided that the result is validated before use.

The [prompt generator](prompt-generator.html) assembles everything a model needs into one request and checks its answer; the rest of this page explains the method.

## What is provided

| Resource | Purpose |
| --- | --- |
| [`llms.txt`](../llms.txt) | Authoring reference written for language models: output rules, a complete minimal example, and generated catalogs of behaviors, ports, parameters, equipment types, and DPTs. It is rebuilt with the library, so it always matches the published version. |
| [`schema/scenario-v2.schema.json`](../schema/scenario-v2.schema.json) | JSON Schema of format 2, for tools that support structured output or schema validation. |
| [`scenarios/`](../examples/index.html) | Complete example scenarios in format 2, useful as starting points. |
| Validator | The [designer](designer.html) validates as you type. With a checkout of the project, `npm run validate -- file.json` validates files from the command line. |
| `#json=` links | `designer/index.html#json=…` and `player.html#json=…` open a scenario passed in the link, without compression. |

The JSON Schema checks the structure of the document. The validator also checks rules that a schema cannot express, such as ports accepted by a behavior, DPT compatibility on a group address, reserved addresses, and references between objects, buttons, and channels. Always use the validator as the final check.

## Workflow

1. Give the model the content of `llms.txt` and, when available, the closest example scenario. The [prompt generator](prompt-generator.html) does this for you.
2. Describe the installation: lines, devices, what each key does, and which status feedback is expected. Ask for a single JSON object in format 2.
3. Validate the result. Each problem is reported with a JSON path, a code, and a message:

   ```text
   $ npm run validate -- office.json
   office.json: 2 problem(s)
     devices[1].objects[0].dpt [dpt] DPT 5.001 incompatible with port “switch” (expected: 1.001)
     devices[1].objects[0].dpt [association] 1/1/1 is associated with objects of different sizes: 5.001 here, groupAddresses (1.001) elsewhere
   ```

4. Send the reported problems back to the model and ask for a corrected version. Repeat until the scenario is valid.
5. Open the scenario in the designer to review the diagram and adjust names and layout-related choices, such as device order on a line.

`npm run validate -- --json -` reads a scenario from standard input and prints one JSON result per file, which suits automated generate-and-validate loops. The exit code is 1 when a scenario is invalid.

## Example request

```text
Using the BusDiagram reference below, write a scenario in format 2.
Installation: one line 1.1 named "Office". A two-key push-button (1.1.1):
key 1 switches the ceiling light on and off, key 2 dims it with a long press.
A dimming actuator (1.1.2) drives the ceiling light and reports its switching
state and level. Name every group address and give it a DPT.
Answer with the JSON object only.

<content of llms.txt>
```

## Open a generated scenario from a link

A link can carry the scenario directly in the fragment after `#`, which is not sent to the server:

```text
designer/index.html#json=%7B%22formatVersion%22%3A2%2C...%7D
player.html#json=%7B%22formatVersion%22%3A2%2C...%7D
```

Percent-encode the whole JSON text, for example with `encodeURIComponent(JSON.stringify(scenario))`. The designer loads the text even when it is invalid and shows the errors in its JSON editor. For links shared with readers, prefer **Export → Viewer link** in the designer, which produces a shorter compressed link.

## Limits

- Validation confirms that a scenario is consistent, not that it matches the intended installation. Review group addresses, flags, and key functions in the diagram.
- Models may use behaviors, ports, or DPTs that do not exist. The validator reports them; do not work around an error by removing the related object without checking the intent.
- Long scenarios can exceed the practical length of a link. Save them as files and open them in the designer instead.
