/**
 * @module ics.test
 * @purpose Unit tests for RFC 5545 iCalendar generation.
 *          Verifies CRLF line delimiters, UTF-8 octet-safe 75-byte folding,
 *          escaping of special characters, stable UIDs, and DTSTAMP formatting.
 */

import {
  escapeIcsText,
  foldIcsLine,
  formatIcsTimestamp,
  generateIcs,
  toIcsDate,
} from "../../domain/ics";
import type { Milestone } from "../../domain/types";

describe("ICS Engine Tests", () => {
  it("escapes backslashes, semicolons, commas, and newlines per RFC 5545", () => {
    const raw = "Note: A, B; C \\ D\nLine two\r\nLine three";
    const escaped = escapeIcsText(raw);
    expect(escaped).toBe("Note: A\\, B\\; C \\\\ D\\nLine two\\nLine three");
  });

  it("folds lines exceeding 75 octets with CRLF + space continuation", () => {
    const longText = "DESCRIPTION:" + "A".repeat(100);
    const folded = foldIcsLine(longText);

    // Splits into lines by CRLF
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);

    const encoder = new TextEncoder();
    // First line must be <= 75 bytes
    expect(encoder.encode(lines[0]!).length).toBeLessThanOrEqual(75);

    // Subsequent lines must start with space and be <= 75 bytes total
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i]!.startsWith(" ")).toBe(true);
      expect(encoder.encode(lines[i]!).length).toBeLessThanOrEqual(75);
    }
  });

  it("formats dates and timestamps according to iCalendar specs", () => {
    expect(toIcsDate("2026-10-23")).toBe("20261023");

    const fixedDate = new Date(Date.UTC(2026, 9, 23, 14, 30, 0));
    expect(formatIcsTimestamp(fixedDate)).toBe("20261023T143000Z");
  });

  it("generates a full compliant VCALENDAR document", () => {
    const milestones: Milestone[] = [
      {
        id: "m_cake",
        title: "Tasting: Cakes & Pastries; Special Order",
        dueDate: "2026-11-05",
        category: "Catering",
        status: "pending",
        dependsOn: [],
        isCriticalPath: false,
        wasClamped: false,
        overdue: false,
        notes: "Bring dietary list, confirm flavors",
      },
    ];

    const dtstamp = new Date(Date.UTC(2026, 9, 23, 12, 0, 0));
    const ics = generateIcs({
      eventTitle: "Autumn Gala",
      milestones,
      dtstamp,
    });

    // Mandatory headers
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("VERSION:2.0\r\n");
    expect(ics).toContain("PRODID:-//Gatherly//Event Planner//EN\r\n");
    expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
    expect(ics).toContain("METHOD:PUBLISH\r\n");

    // Event properties
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("UID:m_cake@gatherly.app\r\n");
    expect(ics).toContain("DTSTAMP:20261023T120000Z\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261105\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261106\r\n");
    expect(ics).toContain("SUMMARY:Tasting: Cakes & Pastries\\; Special Order\r\n");
    expect(ics).toContain("CATEGORIES:Catering\r\n");
    expect(ics).toContain("STATUS:TENTATIVE\r\n");
    expect(ics).toContain("END:VEVENT\r\n");
    expect(ics).toContain("END:VCALENDAR\r\n");

    // All line endings must strictly be CRLF
    expect(ics.includes("\r\n")).toBe(true);
    // There should be no lone \n without \r
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });
});
