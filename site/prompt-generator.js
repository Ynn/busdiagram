// Prompt generator: builds a complete request for a language model from a description,
// then validates the model's answer with the library and prepares a correction request.
// Data: window.BUSDIAGRAM_LLM (reference text and example scenarios), generated at build.
function initPromptGenerator() {
  const root = document.getElementById("pg");
  const data = window.BUSDIAGRAM_LLM;
  if (!root || !data) return;
  const $ = (id) => document.getElementById(id);
  const example = $("pg-example");
  const names = $("pg-names");
  const catalogs = $("pg-catalogs");
  const description = $("pg-description");
  const prompt = $("pg-prompt");
  const size = $("pg-size");
  const answer = $("pg-answer");
  const result = $("pg-result");
  const correction = $("pg-correction");
  const open = $("pg-open");

  Object.entries(data.examples).forEach(([id, ex]) => {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = ex.title;
    example.append(o);
  });

  const NAMES = {
    en: "Write all display text (title, description, device, object, key, channel, and group address names) in English.",
    fr: "Write all display text (title, description, device, object, key, channel, and group address names) in French. Keep identifiers, ports, and JSON keys in English.",
    same: "Write all display text in the language of the request. Keep identifiers, ports, and JSON keys in English.",
  };

  /** Reference text without the generated catalogs, when they are not wanted. */
  const reference = () =>
    catalogs.checked
      ? data.reference
      : data.reference.split("\n## Behaviors\n")[0] +
        "\n\nThe complete catalogs of behaviors, equipment types, and DPTs are omitted from this request; use only the behaviors shown in the example.\n";

  function build() {
    const ex = data.examples[example.value];
    const request = description.value.trim();
    const parts = [
      "You are writing a BusDiagram scenario: a JSON document (format 2) that describes a KNX installation for an instructional diagram. Follow the reference below exactly. Answer with one JSON object only, without comments or explanations.",
      "",
      "## Request",
      "",
      request || "(Describe the installation here.)",
      "",
      "## Requirements",
      "",
      `- ${NAMES[names.value]}`,
      "- Give every group address a name and a DPT in `groupAddresses`.",
      "- Use only behaviors, ports, DPTs, parameters, and equipment types from the reference.",
      ex
        ? `- Start from the example scenario “${ex.title}” below and adapt it to the request.`
        : "",
      "",
      "## Reference",
      "",
      reference(),
    ];
    if (ex)
      parts.push(
        "",
        `## Example scenario: ${ex.title}`,
        "",
        "```json",
        JSON.stringify(ex.json, null, 2),
        "```",
      );
    prompt.value = parts.filter((p) => p !== null).join("\n");
    size.textContent = `${prompt.value.length.toLocaleString("en")} characters`;
  }

  async function copy(field, button) {
    try {
      await navigator.clipboard.writeText(field.value);
      button.textContent = "Copied";
    } catch {
      field.select();
      button.textContent = "Press Ctrl+C";
    }
    setTimeout(() => (button.textContent = button.dataset.label), 1600);
  }

  /** JSON text from an answer that may be wrapped in a Markdown code fence. */
  function extractJson(text) {
    const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
    const body = (fence ? fence[1] : text).trim();
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    return start >= 0 && end > start ? body.slice(start, end + 1) : body;
  }

  function check() {
    result.replaceChildren();
    correction.value = "";
    $("pg-correction-box").hidden = true;
    open.hidden = true;
    const text = extractJson(answer.value);
    if (!text) return;
    let json;
    let problems;
    try {
      json = JSON.parse(text);
    } catch (e) {
      problems = [{ path: "", code: "json", message: e.message }];
    }
    if (json !== undefined) {
      try {
        window.BusDiagram.buildScenario(json);
        problems = [];
      } catch (e) {
        problems = e.details ?? [
          { path: "", code: "exception", message: String(e.message ?? e) },
        ];
      }
    }
    const status = document.createElement("p");
    status.className = problems.length ? "pg-bad" : "pg-ok";
    status.textContent = problems.length
      ? `${problems.length} problem(s) found.`
      : "Valid scenario.";
    result.append(status);
    if (problems.length) {
      const list = document.createElement("ul");
      problems.forEach((p) => {
        const li = document.createElement("li");
        const code = document.createElement("code");
        code.textContent = p.path || "(root)";
        li.append(code, ` ${p.message}`);
        list.append(li);
      });
      result.append(list);
      correction.value = [
        "The BusDiagram validator reported these problems in your scenario:",
        "",
        ...problems.map(
          (p) => `- ${p.path || "(root)"} [${p.code}] ${p.message}`,
        ),
        "",
        "Fix each reported path without removing objects that the request needs, and return the complete corrected scenario as one JSON object only.",
      ].join("\n");
      $("pg-correction-box").hidden = false;
    }
    if (json !== undefined) {
      const fragment = `json=${encodeURIComponent(JSON.stringify(json))}`;
      open.href = `../designer/index.html#${fragment}`;
      open.hidden = false;
    }
  }

  [example, names, catalogs, description].forEach((el) =>
    el.addEventListener("input", build),
  );
  $("pg-copy").addEventListener("click", (e) => copy(prompt, e.currentTarget));
  $("pg-copy-correction").addEventListener("click", (e) =>
    copy(correction, e.currentTarget),
  );
  $("pg-check").addEventListener("click", check);
  build();
}

// The layout loads page scripts in <head>: wait for the form.
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initPromptGenerator);
else initPromptGenerator();
