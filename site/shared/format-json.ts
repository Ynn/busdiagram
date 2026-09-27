// Readable formatting of a scenario: an object or a list on a line remains there
// (like scenario files/), otherwise it is unfolded with an indentation of 2 spaces.

export function formatJson(value: unknown, width = 100): string {
  return fmt(value, 0, width);
}

function inline(v: unknown): string {
  if (Array.isArray(v))
    return v.length ? `[${v.map(inline).join(", ")}]` : "[]";
  if (v && typeof v === "object") {
    const e = Object.entries(v as Record<string, unknown>).filter(
      ([, x]) => x !== undefined,
    );
    return e.length
      ? `{ ${e.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(", ")} }`
      : "{}";
  }
  return JSON.stringify(v) ?? "null";
}

function fmt(v: unknown, indent: number, width: number, prefix = 0): string {
  const one = inline(v);
  if (
    indent + prefix + one.length <= width ||
    v === null ||
    typeof v !== "object"
  )
    return one;
  const pad = " ".repeat(indent + 2);
  const end = " ".repeat(indent);
  if (Array.isArray(v))
    return `[\n${v.map((x) => pad + fmt(x, indent + 2, width)).join(",\n")}\n${end}]`;
  const e = Object.entries(v as Record<string, unknown>).filter(
    ([, x]) => x !== undefined,
  );
  return `{\n${e
    .map(([k, x]) => {
      const key = `${JSON.stringify(k)}: `;
      return pad + key + fmt(x, indent + 2, width, key.length);
    })
    .join(",\n")}\n${end}}`;
}
