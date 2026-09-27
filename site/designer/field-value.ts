// Value binding for form fields that never overwrites text being typed.
// `live()` rewrites the field on every render; an unrelated render between typing and
// the change event (for example when an extension finishes loading) would erase the
// typed text. This directive leaves a field alone while it holds uncommitted input,
// and otherwise shows the value from the scenario (including after a refused edit).
import { noChange } from "lit";
import type { ElementPart, PartInfo } from "lit/directive.js";
import { Directive, PartType, directive } from "lit/directive.js";

type Field = (HTMLInputElement | HTMLTextAreaElement) & {
  fieldValueDirty?: boolean;
  fieldValueWatched?: boolean;
};

class FieldValue extends Directive {
  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.PROPERTY)
      throw new Error("fieldValue() must be bound to the .value property");
  }

  render(value: string) {
    return value;
  }

  override update(part: ElementPart, [value]: [string]) {
    const el = part.element as Field;
    if (!el.fieldValueWatched) {
      el.fieldValueWatched = true;
      el.addEventListener("input", () => (el.fieldValueDirty = true));
      const commit = () => (el.fieldValueDirty = false);
      el.addEventListener("change", commit);
      el.addEventListener("blur", commit);
    }
    // Write the field directly: the part skips values equal to its last commit, which
    // would leave refused input in place.
    if (!el.fieldValueDirty && el.value !== value) el.value = value;
    return noChange;
  }
}

export const fieldValue = directive(FieldValue);
