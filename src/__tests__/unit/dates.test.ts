/**
 * @module dates.test
 * @purpose Unit tests for UTC date calculations.
 *          Tests leap years, month boundaries, past dates, dates < 7 days away,
 *          clamping, and clock injection.
 */

import {
  addDays,
  addWeeks,
  clampDate,
  daysBetween,
  formatUtcDate,
  isAfter,
  isBefore,
  isLeapYear,
  isValidDateString,
  parseUtcDate,
  weeksBetween,
} from "../../domain/dates";

describe("Date Engine Tests", () => {
  it("validates date format strictly", () => {
    expect(isValidDateString("2026-10-23")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true); // Valid leap year
    expect(isValidDateString("2023-02-29")).toBe(false); // Invalid non-leap year
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-00-10")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
  });

  it("identifies leap years accurately", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
  });

  it("parses and formats UTC dates consistently", () => {
    const parsed = parseUtcDate("2026-10-23");
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(9); // 0-indexed
    expect(parsed.getUTCDate()).toBe(23);
    expect(formatUtcDate(parsed)).toBe("2026-10-23");
  });

  it("handles month ends and leap year transitions across UTC", () => {
    // Leap day addition
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");

    // Non-leap year
    expect(addDays("2023-02-28", 1)).toBe("2023-03-01");

    // Month end rollover
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("calculates days and weeks between dates correctly", () => {
    expect(daysBetween("2026-10-01", "2026-10-15")).toBe(14);
    expect(daysBetween("2026-10-15", "2026-10-01")).toBe(-14);
    expect(weeksBetween("2026-10-01", "2026-10-22")).toBe(3);
  });

  it("evaluates past dates and dates less than 7 days away", () => {
    const today = "2026-10-23";
    const pastDate = "2026-10-10";
    const closeDate = "2026-10-26"; // 3 days away
    const farDate = "2026-12-25";

    expect(isBefore(pastDate, today)).toBe(true);
    expect(isAfter(pastDate, today)).toBe(false);

    expect(daysBetween(today, closeDate)).toBe(3);
    expect(daysBetween(today, closeDate) < 7).toBe(true);
    expect(daysBetween(today, farDate) >= 7).toBe(true);
  });

  it("clamps dates to [min, max] boundary properly", () => {
    const min = "2026-10-01";
    const max = "2026-10-31";

    // Within bounds
    const normal = clampDate("2026-10-15", min, max);
    expect(normal.clamped).toBe("2026-10-15");
    expect(normal.wasClamped).toBe(false);

    // Below min
    const below = clampDate("2026-09-15", min, max);
    expect(below.clamped).toBe(min);
    expect(below.wasClamped).toBe(true);

    // Above max
    const above = clampDate("2026-11-05", min, max);
    expect(above.clamped).toBe(max);
    expect(above.wasClamped).toBe(true);
  });

  it("converts weeks using addWeeks without timezone drift", () => {
    expect(addWeeks("2026-10-01", 2)).toBe("2026-10-15");
    expect(addWeeks("2026-10-15", -2)).toBe("2026-10-01");
  });
});
