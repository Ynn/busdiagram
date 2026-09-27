import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const entries = [
  [
    "lighting-control",
    "One telegram, multiple outputs",
    "Key 3 turns on L1 through L4 with one telegram.",
  ],
  [
    "status-feedback",
    "Status feedback",
    "Press Key 2, then Key 1: the first press appears to have no effect.",
  ],
  [
    "shutter-calibration",
    "Misconfigured shutter",
    "50% target: 50% estimated, 33% actual.",
  ],
  [
    "full-topology",
    "Topology and filtering",
    "Compare the local Key 3 with a long press on Key 2 (2/1/1 crosses the IP network).",
  ],
];

export default async function () {
  return {
    layout: false,
    eleventyExcludeFromCollections: true,
    slides: await Promise.all(
      entries.map(async ([name, title, note]) => ({
        title,
        note,
        scenario: (
          await readFile(
            resolve(import.meta.dirname, "../../../scenarios", `${name}.json`),
            "utf8",
          )
        ).replace(/<\//g, "<\\/"),
      })),
    ),
  };
}
