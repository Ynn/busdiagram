// Group addresses for ETS (ga-export/01 XML, as the schema embedded in ETS 6.4).
import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/knx/scenario";
import { etsDpt, etsGroupAddressXml } from "../../src/knx/ets-export";
import { fr } from "../../src/i18n";
import { activeScenarios, raw } from "./helpers";

describe("ETS group address export", () => {
  it("writes DPTs as ETS does", () => {
    expect(etsDpt("1.001")).toBe("DPST-1-1");
    expect(etsDpt("9.001")).toBe("DPST-9-1");
    expect(etsDpt("20.102")).toBe("DPST-20-102");
    expect(etsDpt("raw.2")).toBeNull();
  });

  it("nests addresses in their main and middle groups", () => {
    const s = buildScenario(raw("usb-interface.json"));
    const out = etsGroupAddressXml(s, fr);
    expect(out).toContain(
      '<GroupAddress-Export xmlns="http://knx.org/xml/ga-export/01">',
    );
    expect(out).toContain(
      '<GroupRange Name="Groupe principal 1" RangeStart="2048" RangeEnd="4095">',
    );
    expect(out).toContain(
      '<GroupRange Name="Groupe médian 1/1" RangeStart="2304" RangeEnd="2559">',
    );
    expect(out).toContain(
      '<GroupAddress Name="Office lighting" Address="1/1/1" DPTs="DPST-1-1" />',
    );
    // Opening and closing ranges balance.
    expect(out.match(/<GroupRange /g)!.length).toBe(
      out.match(/<\/GroupRange>/g)!.length,
    );
  });

  it("uses named ranges and escapes names", () => {
    const doc = raw("usb-interface.json");
    (doc.groupAddresses as { name: string }[])[0]!.name = 'Bureau "A" & <B>';
    doc.groupRanges = [{ address: "1", name: "Éclairage" }];
    const out = etsGroupAddressXml(buildScenario(doc));
    expect(out).toContain('Name="Éclairage" RangeStart="2048"');
    expect(out).toContain('Name="Bureau &quot;A&quot; &amp; &lt;B&gt;"');
  });

  it("covers every group address of every scenario, with a valid range", () => {
    for (const f of activeScenarios()) {
      const s = buildScenario(raw(f));
      const out = etsGroupAddressXml(s);
      for (const m of out.matchAll(/RangeStart="(\d+)" RangeEnd="(\d+)"/g)) {
        expect(Number(m[1])).toBeGreaterThanOrEqual(1);
        expect(Number(m[2])).toBeLessThanOrEqual(65535);
      }
      s.devices.forEach((d) =>
        d.objects.forEach((o) =>
          o.gas.forEach((g) => expect(out).toContain(`Address="${g}"`)),
        ),
      );
    }
  });
});
