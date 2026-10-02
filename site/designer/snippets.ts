// Templates of the topology: a group address and a line. The templates of the devices are
// contributed by their participants (src/participants/<name>/designer.ts).
import { t } from "./lang";
import type { Snippet } from "./snippet-kit";
import { SnippetRefusal, ensureBase } from "./snippet-kit";

export const TOPOLOGY_TEMPLATES: Snippet[] = [
  {
    id: "ga",
    get label() {
      return t`Group address`;
    },
    get hint() {
      return t`Declares the next free address 1/1/x (name and DPT to fill in).`;
    },
    apply(input) {
      const doc = ensureBase(input);
      return {
        ...doc,
      };
    },
  },
  {
    id: "line",
    get label() {
      return t`Line`;
    },
    get hint() {
      return t`Adds the next line of the area: couplers and main line appear.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const used = new Set(doc.lines!.map((l) => String(l.address)));
      const area = String(ctx.line ?? doc.lines![0]!.address).split(".")[0];
      let n = 1;
      while (n <= 15 && used.has(`${area}.${n}`)) n++;
      if (n > 15)
        throw new SnippetRefusal(t`area ${area} already has its 15 lines`);
      return {
        ...doc,
        lines: [
          ...doc.lines!,
          {
            address: `${area}.${n}`,
            name: t`Line ${area}.${n}`,
            powerSupply: { currentMa: 640 },
          },
        ],
      };
    },
  },
];
