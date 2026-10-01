import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { LIBRARY, SITE, notices } from "./notices.mjs";

const root = resolve(import.meta.dirname, "..");

const site = notices(SITE);
await writeFile(
  resolve(root, "docs/THIRD_PARTY_NOTICES.txt"),
  `Licenses for third-party components distributed with this site.\n\n${site.text}\n`,
);
const library = notices(LIBRARY);
await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(
  resolve(root, "dist/THIRD_PARTY_NOTICES.txt"),
  `Licenses for third-party components included in bus-diagram.js and bus-diagram.esm.js.\n\n${library.text}\n`,
);
console.log(
  `Third-party notices: ${site.count} packages (site), ${library.count} (library).`,
);
