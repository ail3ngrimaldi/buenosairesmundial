import { describe, it, expect } from "vitest";

function filterUpcomingMatches(
  matches: { kickoff_at: string }[],
  now: Date
): { kickoff_at: string }[] {
  return matches.filter((m) => new Date(m.kickoff_at) >= now);
}

describe("filterUpcomingMatches", () => {
  const past = { kickoff_at: "2026-06-10T18:00:00Z" };
  const future = { kickoff_at: "2026-12-01T18:00:00Z" };
  const exactNow = { kickoff_at: "2026-06-21T12:00:00Z" };
  const now = new Date("2026-06-21T12:00:00Z");

  it("excludes past matches", () => {
    expect(filterUpcomingMatches([past], now)).toHaveLength(0);
  });

  it("includes future matches", () => {
    expect(filterUpcomingMatches([future], now)).toHaveLength(1);
  });

  it("includes a match kicking off exactly now", () => {
    expect(filterUpcomingMatches([exactNow], now)).toHaveLength(1);
  });

  it("handles empty list", () => {
    expect(filterUpcomingMatches([], now)).toHaveLength(0);
  });

  it("filters correctly from a mixed list", () => {
    const result = filterUpcomingMatches([past, future, exactNow], now);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.kickoff_at)).not.toContain(past.kickoff_at);
  });
});
