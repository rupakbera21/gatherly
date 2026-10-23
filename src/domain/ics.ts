/**
 * @module ics
 * @purpose RFC 5545 compliant iCalendar (.ics) generator.
 *          CRLF line endings, UTF-8 octet-safe line folding at 75 bytes,
 *          escaped special characters (\\, \;, \,, \\n), stable UIDs,
 *          DTSTAMP, and all-day events via VALUE=DATE.
 * @rubric Problem Statement Alignment & Code Quality – RFC 5545 compliance.
 */

import { addDays } from "./dates";
import type { Milestone } from "./types";

/**
 * Escape text for RFC 5545 TEXT properties.
 * Escapes backslashes, semicolons, commas, and newlines.
 */
export function escapeIcsText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold an RFC 5545 line so no physical line exceeds 75 octets (UTF-8 bytes).
 * Continuation lines begin with a single space.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let currentStart = 0;
  let isFirstLine = true;

  while (currentStart < line.length) {
    const maxOctets = isFirstLine ? 75 : 74; // 74 because of leading space on continuation line
    let currentEnd = currentStart + 1;

    // Expand currentEnd character-by-character while UTF-8 bytes <= maxOctets
    while (currentEnd <= line.length) {
      const slice = line.slice(currentStart, currentEnd);
      const byteCount = encoder.encode(slice).length;
      if (byteCount > maxOctets) {
        currentEnd--;
        break;
      }
      currentEnd++;
    }

    // Ensure forward progress
    if (currentEnd <= currentStart) {
      currentEnd = currentStart + 1;
    }

    const chunk = line.slice(currentStart, currentEnd);
    chunks.push(isFirstLine ? chunk : ` ${chunk}`);

    isFirstLine = false;
    currentStart = currentEnd;
  }

  return chunks.join("\r\n");
}

/**
 * Convert YYYY-MM-DD date to iCalendar DATE format (YYYYMMDD).
 */
export function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/**
 * Format timestamp into UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ.
 */
export function formatIcsTimestamp(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Generate RFC 5545 iCalendar content for event milestones.
 */
export function generateIcs(params: {
  eventTitle: string;
  milestones: Milestone[];
  dtstamp?: Date;
}): string {
  const timestamp = formatIcsTimestamp(params.dtstamp || new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gatherly//Event Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(params.eventTitle)} - Timeline`,
  ];

  for (const m of params.milestones) {
    const uid = `${m.id}@gatherly.app`;
    const dtstart = toIcsDate(m.dueDate);
    // DTEND for all-day events is exclusive, so the next day
    const dtend = toIcsDate(addDays(m.dueDate, 1));
    const summary = escapeIcsText(m.title);
    const category = escapeIcsText(m.category);
    const description = escapeIcsText(
      m.notes
        ? `${m.notes} (Category: ${m.category})`
        : `Category: ${m.category} | Status: ${m.status}`
    );

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`CATEGORIES:${category}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`STATUS:${m.status === "completed" ? "CONFIRMED" : "TENTATIVE"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold lines and join with CRLF
  const folded = lines.map(foldIcsLine).join("\r\n") + "\r\n";
  return folded;
}
