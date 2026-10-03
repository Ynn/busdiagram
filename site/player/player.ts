// Full screen player: scenario transmitted in the link (#d=... compressed, #json=... plain) or by URL (?src=...).
// Designed for full-screen embedding and web-based presentations.
import { create } from "bus-diagram";
import { hostTranslator } from "../../src/i18n";
import { decodeShare } from "../shared/embed";

async function main() {
  const app = document.getElementById("app")!;
  const params = new URLSearchParams(location.search);
  try {
    if (/(?:^#|&)(d|json)=/.test(location.hash)) {
      const { scenario, options, lang } = await decodeShare(location.hash);
      // The language of the link (that of the designer) applies, except ?lang=... explicit.
      const wanted = params.get("lang") ?? lang;
      if (wanted) document.documentElement.lang = wanted;
      // The designer published next to the player opens the scenario.
      create(app, scenario, {
        fit: "contain",
        designer: "designer/index.html",
        ...options,
      });
    } else if (params.get("src")) {
      create(app, params.get("src")!, {
        fit: "contain",
        designer: "designer/index.html",
      });
    } else {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = hostTranslator()`No scenario: open this player from the designer (Export → Player link), or with player.html?src=my-scenario.json.`;
      app.replaceChildren(p);
    }
  } catch (e) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = hostTranslator()`Unreadable link: ${String((e as Error).message)}`;
    app.replaceChildren(p);
  }
}
void main();
