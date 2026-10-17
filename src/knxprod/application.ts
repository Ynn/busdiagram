// Application program of a KNX product database (knx_xml schema, ETS 4 and later): the
// memory segments with their default image, the parameter types, the parameters and where
// they are stored, the group objects, the tables, the Dynamic tree of the parameter
// dialog, and the translations. Read from the XML as ETS reads it; nothing here depends
// on a particular product.
import type { XmlElement } from "./xml";
import { child, descendants, kids } from "./xml";
import { profileOf } from "../bcu";
import type { ParameterCalculation } from "./calculation";

export interface Segment {
  id: string;
  address: number;
  size: number;
  /** Default image of the segment (Data), or zeros. */
  data: Uint8Array;
  /**
   * Load state machine of a relative segment (System B), which the device allocates: its
   * address is where the profile of the mask puts it.
   */
  lsm?: number;
}

export type ParameterTypeKind =
  "enum" | "number" | "float" | "time" | "text" | "none" | "picture" | "other";

export interface ParameterType {
  id: string;
  kind: ParameterTypeKind;
  sizeInBit: number;
  /** Enumeration: value → text (and translated text by id). */
  enums?: { value: number; text: string; id: string }[];
  /** Number: signed or unsigned, bounds. */
  signed?: boolean;
  min?: number;
  max?: number;
  /** Text shown after the value (for numbers): unit. */
  uiHint?: string;
  /**
   * Time: the unit of its value (Seconds, Milliseconds…, PackedDaysHoursMinutesAndSeconds:
   * a value in seconds, one octet each for its seconds, minutes, hours, days).
   */
  unit?: string;
}

/** Where a parameter is stored: in a segment at an offset, its bits counted from the MSB. */
export interface MemoryLocation {
  segment: string;
  offset: number;
  bitOffset: number;
}

export interface Parameter {
  id: string;
  name: string;
  type: string;
  text: string;
  value: string;
  access: string;
  memory: MemoryLocation | null;
  /** Default parameter of its union (its value is written when no other is visible). */
  defaultUnion: boolean;
  /** Union it shares memory with, if any. */
  union: string | null;
}

export interface ParameterRef {
  id: string;
  ref: string;
  /** Overrides of the parameter, as written in the ParameterRef. */
  text?: string;
  value?: string;
  access?: string;
  /** Place of the parameter on its page (ETS shows a page in this order). */
  displayOrder?: number;
}

export interface ComObject {
  id: string;
  name: string;
  text: string;
  number: number;
  functionText: string;
  size: string;
  dpt: string;
  priority: string;
  flags: {
    C: boolean;
    R: boolean;
    W: boolean;
    T: boolean;
    U: boolean;
    I: boolean;
  };
}

export interface ComObjectRef {
  id: string;
  ref: string;
  text?: string;
  functionText?: string;
  size?: string;
  dpt?: string;
  flags: Partial<ComObject["flags"]>;
}

/** Node of the Dynamic tree, as written: blocks, choices, references. */
export type DynNode =
  | { kind: "channel"; id: string; text: string; children: DynNode[] }
  | {
      kind: "block";
      id: string;
      name: string;
      text: string;
      /** Parameter whose text titles the block (ParamRefId), or "". */
      paramRef: string;
      access: string;
      inline: boolean;
      children: DynNode[];
    }
  | { kind: "separator"; id: string; text: string }
  | { kind: "param"; ref: string }
  | { kind: "object"; ref: string }
  | { kind: "choose"; ref: string; whens: DynWhen[] };

export interface DynWhen {
  /** Values or ranges ("1", "2 3", "<5", ">=2") that select it; empty for default. */
  test: string[];
  isDefault: boolean;
  children: DynNode[];
}

/**
 * A property of its own that the load procedure of the program writes (LdCtrlWriteProp):
 * its interface object and number, its number of elements and their size in octets.
 */
export interface WrittenProperty {
  object: number;
  pid: number;
  count: number;
  size: number;
}

/**
 * A property of the device that the load procedure compares before loading
 * (LdCtrlCompareProp, such as the hardware type 0/78): ETS stops when it differs.
 */
export interface ComparedProperty {
  object: number;
  pid: number;
  /** The value it expects, in hexadecimal. */
  data: string;
  /** The bits it compares, in hexadecimal, when it does not compare them all. */
  mask?: string;
}

export interface TableLocation {
  /** Its segment, or "" for a table of its own load state machine (System B). */
  segment: string;
  offset: number;
  maxEntries: number;
}

export interface ApplicationProgram {
  id: string;
  name: string;
  number: number;
  version: number;
  mask: string;
  peiType: number;
  loadProcedureStyle: string;
  segments: Map<string, Segment>;
  types: Map<string, ParameterType>;
  parameters: Map<string, Parameter>;
  parameterRefs: Map<string, ParameterRef>;
  objects: Map<string, ComObject>;
  objectRefs: Map<string, ComObjectRef>;
  addressTable: TableLocation | null;
  associationTable: TableLocation | null;
  objectTable: TableLocation | null;
  dynamic: DynNode[];
  /** Properties that the load procedure writes, which the device must accept. */
  writtenProperties: WrittenProperty[];
  /** Hidden parameters that ETS sets from those of the dialog, in their order. */
  calculations?: ParameterCalculation[];
  comparedProperties: ComparedProperty[];
  /** Translations: language → (element id + attribute) → text. */
  translations: Map<string, Map<string, string>>;
}

const num = (s: string | undefined, d = 0) => {
  if (s === undefined || s === "") return d;
  const v = Number(s);
  return Number.isFinite(v) ? v : d;
};

const base64 = (s: string): Uint8Array => {
  const bin = atob(s.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const enabled = (v: string | undefined) => v === "Enabled";

function memoryOf(e: XmlElement | undefined): MemoryLocation | null {
  if (!e) return null;
  return {
    segment: e.attrs.CodeSegment ?? "",
    offset: num(e.attrs.Offset),
    bitOffset: num(e.attrs.BitOffset),
  };
}

function parseType(t: XmlElement): ParameterType {
  const k = t.children[0];
  const id = t.attrs.Id!;
  if (!k) return { id, kind: "none", sizeInBit: 0 };
  const size = num(k.attrs.SizeInBit);
  switch (k.name) {
    case "TypeRestriction":
      return {
        id,
        kind: "enum",
        sizeInBit: size,
        enums: kids(k, "Enumeration").map((e) => ({
          value: num(e.attrs.Value),
          text: e.attrs.Text ?? "",
          id: e.attrs.Id ?? "",
        })),
      };
    case "TypeNumber":
      return {
        id,
        kind: "number",
        sizeInBit: size,
        signed: k.attrs.Type === "signedInt",
        min: num(k.attrs.minInclusive, 0),
        max: num(k.attrs.maxInclusive, 2 ** size - 1),
        uiHint: k.attrs.UIHint,
      };
    case "TypeFloat":
      return {
        id,
        kind: "float",
        sizeInBit:
          k.attrs.Encoding === "IEEE-754 Double"
            ? 64
            : k.attrs.Encoding === "DPT 9"
              ? 16
              : 32,
        min: num(k.attrs.minInclusive, -Infinity),
        max: num(k.attrs.maxInclusive, Infinity),
      };
    case "TypeTime":
      return {
        id,
        kind: "time",
        sizeInBit: size,
        min: num(k.attrs.minInclusive, 0),
        max: num(k.attrs.maxInclusive, 2 ** size - 1),
        unit: k.attrs.Unit ?? "Seconds",
        uiHint: k.attrs.UIHint,
      };
    case "TypeText":
      return { id, kind: "text", sizeInBit: size };
    case "TypeNone":
      return { id, kind: "none", sizeInBit: 0 };
    case "TypePicture":
      return { id, kind: "picture", sizeInBit: 0 };
    default:
      return { id, kind: "other", sizeInBit: size };
  }
}

function parseDynamic(e: XmlElement): DynNode[] {
  const out: DynNode[] = [];
  for (const c of e.children) {
    switch (c.name) {
      case "Channel":
        out.push({
          kind: "channel",
          id: c.attrs.Id ?? "",
          text: c.attrs.Text ?? "",
          children: parseDynamic(c),
        });
        break;
      case "ChannelIndependentBlock":
        out.push(...parseDynamic(c));
        break;
      case "ParameterBlock":
        out.push({
          kind: "block",
          id: c.attrs.Id ?? "",
          name: c.attrs.Name ?? "",
          text: c.attrs.Text ?? "",
          paramRef: c.attrs.ParamRefId ?? "",
          access: c.attrs.Access ?? "",
          inline: c.attrs.Inline === "true",
          children: parseDynamic(c),
        });
        break;
      case "ParameterSeparator":
        out.push({
          kind: "separator",
          id: c.attrs.Id ?? "",
          text: c.attrs.Text ?? "",
        });
        break;
      case "ParameterRefRef":
        out.push({ kind: "param", ref: c.attrs.RefId ?? "" });
        break;
      case "ComObjectRefRef":
        out.push({ kind: "object", ref: c.attrs.RefId ?? "" });
        break;
      case "choose":
        out.push({
          kind: "choose",
          ref: c.attrs.ParamRefId ?? "",
          whens: kids(c, "when").map((w) => ({
            test: (w.attrs.test ?? "").split(/\s+/).filter(Boolean),
            isDefault: w.attrs.default === "true",
            children: parseDynamic(w),
          })),
        });
        break;
      default:
        // Assign, Rename, Module… are not used by the programs supported so far.
        break;
    }
  }
  return out;
}

/** Read an application program from its XML file (the root KNX element). */
export function parseApplication(doc: XmlElement): ApplicationProgram {
  const app = descendants(doc, "ApplicationProgram")[0];
  if (!app) throw new Error("no ApplicationProgram in this file");
  const st = child(app, "Static");
  const segments = new Map<string, Segment>();
  for (const s of descendants(child(st, "Code") ?? app, "AbsoluteSegment")) {
    const size = num(s.attrs.Size);
    const d = child(s, "Data")?.text;
    const data = new Uint8Array(size);
    if (d) data.set(base64(d).subarray(0, size));
    segments.set(s.attrs.Id!, {
      id: s.attrs.Id!,
      address: num(s.attrs.Address),
      size,
      data,
    });
  }
  // Relative segments, which the device allocates where its mask puts them.
  const profile = profileOf((app.attrs.MaskVersion ?? "").replace(/^MV-/, ""));
  for (const s of descendants(child(st, "Code") ?? app, "RelativeSegment")) {
    const size = num(s.attrs.Size);
    const lsm = num(s.attrs.LoadStateMachine);
    const base = profile?.relativeSegment?.(lsm);
    if (base === undefined)
      throw new Error(
        `${s.attrs.Id}: no relative segment of LSM ${lsm} for ${app.attrs.MaskVersion}`,
      );
    const d = child(s, "Data")?.text;
    const data = new Uint8Array(size);
    if (d) data.set(base64(d).subarray(0, size));
    segments.set(s.attrs.Id!, {
      id: s.attrs.Id!,
      address: base + num(s.attrs.Offset),
      size,
      data,
      lsm,
    });
  }
  const types = new Map<string, ParameterType>();
  for (const t of kids(child(st, "ParameterTypes"), "ParameterType"))
    types.set(t.attrs.Id!, parseType(t));
  const parameters = new Map<string, Parameter>();
  const addParam = (
    p: XmlElement,
    memory: MemoryLocation | null,
    union: string | null,
  ) =>
    parameters.set(p.attrs.Id!, {
      id: p.attrs.Id!,
      name: p.attrs.Name ?? "",
      type: p.attrs.ParameterType ?? "",
      text: p.attrs.Text ?? "",
      value: p.attrs.Value ?? "",
      access: p.attrs.Access ?? "",
      memory,
      defaultUnion: p.attrs.DefaultUnionParameter === "true",
      union,
    });
  for (const p of child(st, "Parameters")?.children ?? []) {
    if (p.name === "Parameter") addParam(p, memoryOf(child(p, "Memory")), null);
    else if (p.name === "Union") {
      const m = memoryOf(child(p, "Memory"));
      const uid = `${m?.segment}:${m?.offset}:${m?.bitOffset}:${p.attrs.SizeInBit}`;
      for (const q of kids(p, "Parameter"))
        addParam(
          q,
          m
            ? {
                segment: m.segment,
                offset: m.offset + num(q.attrs.Offset),
                bitOffset: m.bitOffset + num(q.attrs.BitOffset),
              }
            : null,
          uid,
        );
    }
  }
  const parameterRefs = new Map<string, ParameterRef>();
  for (const r of kids(child(st, "ParameterRefs"), "ParameterRef"))
    parameterRefs.set(r.attrs.Id!, {
      id: r.attrs.Id!,
      ref: r.attrs.RefId!,
      text: r.attrs.Text,
      value: r.attrs.Value,
      access: r.attrs.Access,
      ...(r.attrs.DisplayOrder !== undefined
        ? { displayOrder: Number(r.attrs.DisplayOrder) }
        : {}),
    });
  const objects = new Map<string, ComObject>();
  const tableEl = child(st, "ComObjectTable");
  for (const o of kids(tableEl, "ComObject"))
    objects.set(o.attrs.Id!, {
      id: o.attrs.Id!,
      name: o.attrs.Name ?? "",
      text: o.attrs.Text ?? "",
      number: num(o.attrs.Number),
      functionText: o.attrs.FunctionText ?? "",
      size: o.attrs.ObjectSize ?? "",
      dpt: o.attrs.DatapointType ?? "",
      priority: o.attrs.Priority ?? "Low",
      flags: {
        C: enabled(o.attrs.CommunicationFlag),
        R: enabled(o.attrs.ReadFlag),
        W: enabled(o.attrs.WriteFlag),
        T: enabled(o.attrs.TransmitFlag),
        U: enabled(o.attrs.UpdateFlag),
        I: enabled(o.attrs.ReadOnInitFlag),
      },
    });
  const objectRefs = new Map<string, ComObjectRef>();
  for (const r of kids(child(st, "ComObjectRefs"), "ComObjectRef")) {
    const f = (k: string) =>
      r.attrs[k] === undefined ? undefined : enabled(r.attrs[k]);
    const flags: ComObjectRef["flags"] = {};
    const set = (key: keyof ComObject["flags"], attr: string) => {
      const v = f(attr);
      if (v !== undefined) flags[key] = v;
    };
    set("C", "CommunicationFlag");
    set("R", "ReadFlag");
    set("W", "WriteFlag");
    set("T", "TransmitFlag");
    set("U", "UpdateFlag");
    set("I", "ReadOnInitFlag");
    objectRefs.set(r.attrs.Id!, {
      id: r.attrs.Id!,
      ref: r.attrs.RefId!,
      text: r.attrs.Text,
      functionText: r.attrs.FunctionText,
      size: r.attrs.ObjectSize,
      dpt: r.attrs.DatapointType,
      flags,
    });
  }
  const table = (name: string): TableLocation | null => {
    const t = child(st, name);
    // A table of its own load state machine (System B) has only its capacity.
    return t && (t.attrs.CodeSegment || t.attrs.MaxEntries)
      ? {
          segment: t.attrs.CodeSegment ?? "",
          offset: num(t.attrs.Offset),
          maxEntries: num(t.attrs.MaxEntries),
        }
      : null;
  };
  const written = new Map<string, WrittenProperty>();
  for (const w of descendants(app, "LdCtrlWriteProp")) {
    const count = num(w.attrs.Count, 1);
    const p = {
      object: num(w.attrs.ObjIdx),
      pid: num(w.attrs.PropId),
      count,
      size: Math.max(1, (w.attrs.InlineData ?? "").length / 2 / count),
    };
    written.set(`${p.object}/${p.pid}`, p);
  }
  const compared = new Map<string, ComparedProperty>();
  for (const c of descendants(app, "LdCtrlCompareProp")) {
    const p = {
      object: num(c.attrs.ObjIdx),
      pid: num(c.attrs.PropId),
      data: (c.attrs.InlineData ?? "").toUpperCase(),
      ...(c.attrs.Mask ? { mask: c.attrs.Mask.toUpperCase() } : {}),
    };
    compared.set(`${p.object}/${p.pid}`, p);
  }
  const calculations: ParameterCalculation[] = descendants(
    app,
    "ParameterCalculation",
  )
    .filter((c) => (c.attrs.Language ?? "JavaScript") === "JavaScript")
    .map((c) => {
      const aliases = (side: string) =>
        kids(child(c, side), "ParameterRefRef").map((r) => ({
          ref: r.attrs.RefId ?? "",
          alias: r.attrs.AliasName ?? "",
        }));
      return {
        id: c.attrs.Id ?? "",
        script: child(c, "LRTransformation")?.text ?? "",
        inputs: aliases("LParameters"),
        outputs: aliases("RParameters"),
      };
    });
  const translations = new Map<string, Map<string, string>>();
  for (const lang of descendants(doc, "Language")) {
    const m =
      translations.get(lang.attrs.Identifier!) ?? new Map<string, string>();
    for (const te of descendants(lang, "TranslationElement"))
      for (const tr of kids(te, "Translation"))
        m.set(
          `${te.attrs.RefId}|${tr.attrs.AttributeName}`,
          tr.attrs.Text ?? "",
        );
    translations.set(lang.attrs.Identifier!, m);
  }
  return {
    id: app.attrs.Id!,
    name: app.attrs.Name ?? "",
    number: num(app.attrs.ApplicationNumber),
    version: num(app.attrs.ApplicationVersion),
    mask: app.attrs.MaskVersion ?? "",
    peiType: num(app.attrs.PeiType),
    loadProcedureStyle: app.attrs.LoadProcedureStyle ?? "",
    segments,
    types,
    parameters,
    parameterRefs,
    objects,
    objectRefs,
    addressTable: table("AddressTable"),
    associationTable: table("AssociationTable"),
    objectTable: tableEl?.attrs.CodeSegment
      ? {
          segment: tableEl.attrs.CodeSegment,
          offset: num(tableEl.attrs.Offset),
          maxEntries: 0,
        }
      : null,
    dynamic: parseDynamic(
      child(app, "Dynamic") ?? { name: "", attrs: {}, children: [], text: "" },
    ),
    writtenProperties: [...written.values()],
    ...(calculations.length ? { calculations } : {}),
    comparedProperties: [...compared.values()],
    translations,
  };
}

/** Text of an element in a language (translation of `attr` of `id`), or its default. */
export function textOf(
  app: ApplicationProgram,
  id: string,
  attr: string,
  fallback: string,
  lang = "en",
): string {
  const l = lang.toLowerCase();
  for (const [k, m] of app.translations)
    if (k.toLowerCase() === l || k.toLowerCase().startsWith(l + "-")) {
      const v = m.get(`${id}|${attr}`);
      if (v) return v;
    }
  return fallback;
}
