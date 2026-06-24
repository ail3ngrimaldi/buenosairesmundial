import { describe, it, expect } from "vitest";
import { ZONAS, NEIGHBORHOODS_BY_ZONA, FEATURE_OPTIONS } from "@/lib/types";

describe("ZONAS", () => {
  it("has four zones", () => {
    expect(ZONAS).toHaveLength(4);
    expect(ZONAS).toEqual(["CABA", "Zona Norte", "Zona Sur", "Zona Oeste"]);
  });
});

describe("NEIGHBORHOODS_BY_ZONA", () => {
  it("every zona has at least one neighborhood", () => {
    for (const zona of ZONAS) {
      expect(NEIGHBORHOODS_BY_ZONA[zona].length).toBeGreaterThan(0);
    }
  });

  it("no neighborhood appears in two different zones", () => {
    const all: string[] = [];
    for (const zona of ZONAS) {
      for (const n of NEIGHBORHOODS_BY_ZONA[zona]) {
        expect(all).not.toContain(n);
        all.push(n);
      }
    }
  });
});

describe("FEATURE_OPTIONS", () => {
  it("all feature ids are unique", () => {
    const ids = FEATURE_OPTIONS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
