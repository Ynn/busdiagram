// Extension Delivery Control: Replays, in an isolated iframe, what a page will do
// published (autonomous page or tags <script src>): the bundle then each raw script, in
// the order, in the global scope. An extension accepted by the preview works so
// also once delivered (no global variable reporting between two scripts, no
// of missing dependency).
import { escapeScript, wrapExtension } from "../shared/embed";
import { t } from "./lang";

export interface DeliveryProblem {
  name: string;
  error: string;
}

/**
 * `wrapped`: scripts wrapped as in the standalone page; otherwise raw scripts, as
 * <script src> tags in a host page.
 */
export function deliveryCheck(
  bundleSource: string,
  sources: { name: string; source: string }[],
  wrapped = true,
  timeoutMs = 8000,
): Promise<DeliveryProblem[]> {
  if (!sources.length) return Promise.resolve([]);
  return new Promise((done) => {
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("sandbox", "allow-scripts");
    const token = Math.random().toString(36).slice(2);
    const problems: DeliveryProblem[] = [];
    const finish = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      frame.remove();
      done(problems);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return;
      const m = e.data as {
        token?: string;
        i?: number;
        error?: string;
        done?: boolean;
      };
      if (m?.token !== token) return;
      if (m.done) return finish();
      const name =
        m.i !== undefined && m.i >= 0 ? sources[m.i]!.name : "bus-diagram.js";
      if (!problems.some((p) => p.name === name))
        problems.push({ name, error: String(m.error) });
    };
    const timer = setTimeout(() => {
      problems.push({ name: sources.at(-1)!.name, error: t`timed out` });
      finish();
    }, timeoutMs);
    window.addEventListener("message", onMessage);
    const post = (body: string) => `<script>${body}</script>`;
    frame.srcdoc = [
      "<!doctype html><meta charset=utf-8>",
      post(
        `window.__i=-1;window.addEventListener("error",function(e){parent.postMessage({token:${JSON.stringify(token)},i:window.__i,error:e.error&&e.error.message||e.message},"*")});`,
      ),
      `<script>${escapeScript(bundleSource)}</script>`,
      ...sources.flatMap((s, i) => [
        post(`window.__i=${i};`),
        `<script>${escapeScript(wrapped ? wrapExtension(s.source, s.name) : s.source)}</script>`,
      ]),
      post(
        `parent.postMessage({token:${JSON.stringify(token)},done:true},"*");`,
      ),
    ].join("\n");
    document.body.append(frame);
  });
}
