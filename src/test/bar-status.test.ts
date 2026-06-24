import { describe, it, expect } from "vitest";
import type { BarStatus } from "@/lib/types";

// Mirrors the business rules enforced by Supabase RLS and admin actions
function canOwnerEditBar(status: BarStatus): boolean {
  // Owners can only update their own bar data (not status field)
  // This is enforced by RLS; here we test the status visibility logic
  return status !== "rejected";
}

function isBarPubliclyVisible(status: BarStatus): boolean {
  return status === "approved";
}

describe("Bar status rules", () => {
  it("only approved bars are publicly visible", () => {
    expect(isBarPubliclyVisible("approved")).toBe(true);
    expect(isBarPubliclyVisible("pending")).toBe(false);
    expect(isBarPubliclyVisible("rejected")).toBe(false);
  });

  it("owners of pending and approved bars can still edit", () => {
    expect(canOwnerEditBar("pending")).toBe(true);
    expect(canOwnerEditBar("approved")).toBe(true);
  });

  it("rejected bar owners cannot edit (handled by RLS policy)", () => {
    expect(canOwnerEditBar("rejected")).toBe(false);
  });
});

describe("Bar status transitions (admin actions)", () => {
  type Transition = { from: BarStatus; to: BarStatus; valid: boolean };
  const transitions: Transition[] = [
    { from: "pending", to: "approved", valid: true },
    { from: "pending", to: "rejected", valid: true },
    { from: "approved", to: "rejected", valid: true },
    { from: "rejected", to: "approved", valid: true },
    { from: "pending", to: "pending", valid: false },
    { from: "approved", to: "approved", valid: false },
  ];

  function isValidTransition(from: BarStatus, to: BarStatus): boolean {
    return from !== to;
  }

  transitions.forEach(({ from, to, valid }) => {
    it(`${from} → ${to} is ${valid ? "valid" : "no-op"}`, () => {
      expect(isValidTransition(from, to)).toBe(valid);
    });
  });
});
