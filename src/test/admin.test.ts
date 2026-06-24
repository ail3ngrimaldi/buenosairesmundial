import { describe, it, expect } from "vitest";
import { isAdminEmail, ADMIN_EMAILS } from "@/lib/admin";

describe("isAdminEmail", () => {
  it("returns true for the admin email", () => {
    expect(isAdminEmail("ailenrgrimaldi@gmail.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAdminEmail("AilenRGrimaldi@Gmail.COM")).toBe(true);
  });

  it("returns false for an unknown email", () => {
    expect(isAdminEmail("random@example.com")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAdminEmail(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAdminEmail("")).toBe(false);
  });

  it("ADMIN_EMAILS list contains the expected address", () => {
    expect(ADMIN_EMAILS).toContain("ailenrgrimaldi@gmail.com");
  });
});
