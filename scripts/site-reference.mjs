import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { cdnTag, cdnUrl } from "../site/shared/cdn.js";
// Reference blocks generated from code and inserted into Markdown pages :
// {{options}}, {{json:root|line|room|groupAddress|device|object|button|input|channel|equipment}},
// {{behaviors}}, {{equipment}}, {{dpts}}, {{ports}}, {{examples}}.

const DEFS = {
  root: ["Scenario root", "scenario-root"],
  line: ["Line", "line"],
  room: ["Room", "room"],
  groupAddress: ["Group address", "group-address"],
  device: ["Device", "device"],
  object: ["Communication object", "communication-object"],
  button: ["Button", "button"],
  input: ["Numeric or digital input", "numeric-or-digital-input"],
  channel: ["Channel", "channel"],
  equipment: ["Equipment", "equipment"],
};

const cell = (s) =>
  String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
const code = (s) => "`" + String(s).replace(/`/g, "") + "`";

function typeText(n, depth = 0) {
  if (!n || depth > 3) return "";
  if (n.$ref) {
    const name = n.$ref.replace("#/$defs/", "");
    if (name === "dpt") return "[DPT](dpt.html)";
    const [label, anchor] = DEFS[name] ?? [name, name];
    return `[${label}](#${anchor})`;
  }
  if ("const" in n) return code(JSON.stringify(n.const));
  if (n.enum) return n.enum.map((v) => code(JSON.stringify(v))).join(", ");
  if (n.oneOf) {
    const c = n.oneOf.filter((x) => "const" in x);
    return c.length > 6
      ? `${c
          .slice(0, 6)
          .map((x) => code(JSON.stringify(x.const)))
          .join(", ")}…`
      : c.map((x) => code(JSON.stringify(x.const))).join(", ");
  }
  if (n.anyOf)
    return n.anyOf
      .map((x) => typeText(x, depth + 1))
      .filter(Boolean)
      .join(" or ");
  const t = Array.isArray(n.type) ? n.type.join(" or ") : n.type;
  const fr = {
    string: "string",
    number: "number",
    integer: "integer",
    boolean: "boolean",
    object: "object",
    array: "array",
    null: "null",
  };
  if (t === "array")
    return `list of ${typeText(n.items, depth + 1) || "values"}`;
  if (typeof t === "string")
    return (
      t
        .split(" or ")
        .map((x) => fr[x] ?? x)
        .join(" or ") + (n.pattern ? " (validated format)" : "")
    );
  return "";
}

function fields(schema, def) {
  const node = def === "root" ? schema : schema.$defs[def];
  const req = node.required ?? [];
  const rows = Object.entries(node.properties ?? {}).map(
    ([k, p]) =>
      `| ${code(k)} | ${cell(typeText(p))} | ${req.includes(k) ? "yes" : ""} | ${cell(p.description ?? "")} |`,
  );
  return `${node.description ? `${node.description}\n\n` : ""}| Field | Type | Required | Description |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`;
}

function paramTable(list, empty) {
  if (!list.length) return `_${empty}_\n`;
  return `| Parameter | Type | Default | Constraints | Description |\n| --- | --- | --- | --- | --- |\n${list
    .map(
      (p) =>
        `| ${code(p.name)}${p.required ? " (required)" : ""} | ${p.type} | ${p.default ? code(p.default) : ""} | ${cell(p.constraints)} | ${cell(p.description)} |`,
    )
    .join("\n")}\n`;
}

function optionalTables(list) {
  const shown = list.filter(([, , rows]) => rows.length);
  if (!shown.length) return "_No parameters._\n";
  return shown
    .map(
      ([title, path, rows]) =>
        `**${title}** (${code(path)})\n\n${paramTable(rows, "")}`,
    )
    .join("\n");
}

const CHANNEL = {
  required: "required",
  optional: "optional (all channels when omitted)",
  none: "none",
};

/** {{include:path#region}}: excerpt from a tested source file (between #region and #endregion). */
function include(root, spec) {
  const [file, region] = spec.split("#");
  const text = readFileSync(resolve(root, file), "utf8");
  if (!region) return text.trim();
  const m = new RegExp(
    `// #region ${region}\\n([\\s\\S]*?)// #endregion ${region}`,
  ).exec(text);
  if (!m) throw new Error(`include: region "${region}" not found in ${file}`);
  return m[1].trim();
}

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Front matter of a page as flat key/value pairs; quoted values are JSON strings. */
function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return {};
  return Object.fromEntries(
    m[1].split("\n").flatMap((line) => {
      const i = line.indexOf(":");
      if (i < 0) return [];
      const raw = line.slice(i + 1).trim();
      return [
        [line.slice(0, i).trim(), raw.startsWith('"') ? JSON.parse(raw) : raw],
      ];
    }),
  );
}

/** {{examples}}: one list of cards per group, built from the example pages' front matter. */
function examplesIndex(root) {
  const dir = resolve(root, "site/pages/examples");
  const pages = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("00-"))
    .map((f) => ({
      href: `${f.replace(/\.md$/, "").replace(/^\d+-/, "")}.html`,
      ...frontMatter(readFileSync(resolve(dir, f), "utf8")),
    }))
    .sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99));
  const groups = [...new Set(pages.map((p) => p.group ?? ""))];
  return groups
    .map((group) => {
      const cards = pages
        .filter((p) => (p.group ?? "") === group)
        .map((p) => {
          if (!p.summary)
            throw new Error(`examples index: ${p.href} has no summary`);
          return `<a href="${p.href}">${escapeHtml(p.title)}<small>${escapeHtml(p.summary)}</small></a>`;
        })
        .join("\n");
      return `## ${group}\n\n<div class="examples-list">\n${cards}\n</div>\n`;
    })
    .join("\n");
}

// Version of the built library and the integrity hash of dist/bus-diagram.js. The site is
// published from release tags, so this file is the one published on npm for this version.
function release(root) {
  const { version } = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  const bundle = readFileSync(resolve(root, "dist/bus-diagram.js"));
  const integrity = `sha384-${createHash("sha384").update(bundle).digest("base64")}`;
  return { version, integrity };
}

export function expand(body, data, root) {
  const lib = /\{\{(version|cdn-url|cdn-tag)\}\}/.test(body)
    ? release(root)
    : undefined;
  return body
    .replace(/\{\{version\}\}/g, () => lib.version)
    .replace(/\{\{cdn-url\}\}/g, () => cdnUrl(lib.version))
    .replace(/\{\{cdn-tag\}\}/g, () => cdnTag(lib.version, lib.integrity))
    .replace(/\{\{examples\}\}/g, () => examplesIndex(root))
    .replace(/\{\{include:([^}]+)\}\}/g, (_m, spec) =>
      include(root, spec.trim()),
    )
    .replace(/\{\{options\}\}/g, () =>
      data.options
        .map(
          (o) => `### ${o.name}

| HTML attribute | JavaScript option | Type | Default |
| --- | --- | --- | --- |
| ${code(o.attribute)} | ${code(o.name)} | ${cell(o.type)} | ${cell(o.default)} |

${o.summary} ${o.details}

\`\`\`html
${o.example}
\`\`\`
`,
        )
        .join("\n"),
    )
    .replace(/\{\{json:(\w+)\}\}/g, (_m, def) => fields(data.schema, def))
    .replace(/\{\{behaviors\}\}/g, () =>
      data.behaviors
        .map(
          (b) => `### ${b.id}

${b.description}${b.output ? ` Output command: ${code(b.output)}.` : ""}${b.acceptsInputs ? " Uses buttons and inputs." : ""}

**Ports**

| Port | DPT | Channel | Role |
| --- | --- | --- | --- |
${b.ports.map((p) => `| ${code(p.name)} | ${p.dpts} | ${CHANNEL[p.channel] ?? p.channel} | ${cell(p.description || data.schema.$defs.object.properties.port.oneOf.find((x) => x.const === p.name)?.description || "")} |`).join("\n")}

${optionalTables([
  ["Device parameters", "parameters", b.parameters],
  ["Channel parameters", "channels[].parameters", b.channelParameters],
  ["Initial channel state", "channels[].initialState", b.channelInitialState],
])}`,
        )
        .join("\n"),
    )
    .replace(/\{\{equipment\}\}/g, () =>
      data.equipment
        .map(
          (e) => `### ${e.id}

${e.description} Accepted commands: ${code(e.accepts)}.

${optionalTables([
  ["Parameters", "equipment.parameters", e.parameters],
  ["Initial state", "equipment.initialState", e.initialState],
])}`,
        )
        .join("\n"),
    )
    .replace(
      /\{\{dpts\}\}/g,
      () =>
        `| DPT | Name | Size | Range | Examples: value → encoded bytes → display |\n| --- | --- | --- | --- | --- |\n${data.dpts
          .map(
            (d) =>
              `| ${code(d.id)} | ${d.name} | ${d.bits === 16 ? "2 bytes" : d.bits === 8 ? "1 byte" : `${d.bits} bit${d.bits > 1 ? "s" : ""}`} | ${d.range} | ${d.samples
                .map(
                  (s) =>
                    `${s.value} → ${code(
                      "0x" +
                        s.raw
                          .toString(16)
                          .toUpperCase()
                          .padStart(d.bits === 16 ? 4 : 2, "0"),
                    )} → ${s.text}`,
                )
                .join(" ; ")} |`,
          )
          .join("\n")}\n`,
    )
    .replace(/\{\{ports\}\}/g, () => {
      const users = (name) =>
        data.behaviors
          .filter((b) => b.ports.some((p) => p.name === name))
          .map((b) => code(b.id))
          .join(", ");
      return `| Port | Description | Behaviors |\n| --- | --- | --- |\n${data.schema.$defs.object.properties.port.oneOf
        .map(
          (p) =>
            `| ${code(p.const)} | ${cell(p.description)} | ${users(p.const)} |`,
        )
        .join("\n")}\n`;
    });
}
