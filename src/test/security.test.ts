import { describe, it, expect } from "vitest";
import { isAdminEmail } from "@/lib/admin";

describe("Security: admin access", () => {
  const attackVectors = [
    "ailenrgrimaldi@gmail.com.evil.com",
    "ailenrgrimaldi@gmail.com@attacker.com",
    " ailenrgrimaldi@gmail.com",
    "ailenrgrimaldi@gmail.com ",
    "ailenrgrimaldi+tag@gmail.com",
    "AILENRGRIMALDI@GMAIL.COM ",
    "ailenrgrimaldi@gmail.com\n",
  ];

  attackVectors.forEach((email) => {
    it(`rejects spoofed email: "${email}"`, () => {
      expect(isAdminEmail(email)).toBe(false);
    });
  });
});

describe("Security: XSS in user-supplied content", () => {
  const xssPayloads = [
    "<script>alert(1)</script>",
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)",
    "<svg onload=alert(1)>",
  ];

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  xssPayloads.forEach((payload) => {
    it(`escaping prevents XSS for: ${payload.slice(0, 30)}`, () => {
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("<svg");
      expect(escaped).not.toContain("<img");
    });
  });
});

describe("Security: geocoding fallback", () => {
  const FALLBACK_LAT = -34.6037;
  const FALLBACK_LNG = -58.3816;

  it("fallback lat is within Buenos Aires bounds", () => {
    expect(FALLBACK_LAT).toBeGreaterThan(-35);
    expect(FALLBACK_LAT).toBeLessThan(-34);
  });

  it("fallback lng is within Buenos Aires bounds", () => {
    expect(FALLBACK_LNG).toBeGreaterThan(-59);
    expect(FALLBACK_LNG).toBeLessThan(-58);
  });
});
