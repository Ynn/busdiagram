// Designer language: link shared by modules (forms, operations, blocks).
import type { Translate } from "../../src/i18n";
import { registerMessages, translator } from "../../src/i18n";
import { designerFr } from "./fr";

registerMessages("fr", designerFr);

export let t: Translate = translator("en");

export function setDesignerLanguage(lang: string) {
  t = translator(lang);
}

/** A text of a product or a definition, in the language of the designer. */
export const tt = (text: string | undefined) =>
  text ? (t.s ? t.s(text) : text) : "";
