/**
 * @module csv
 * @purpose RFC 4180 compliant CSV export with formula injection defense.
 *          Neutralises spreadsheet formula injection (CWE-1236) by prepending
 *          single quotes to cells starting with =, +, -, @, or tab.
 *          Properly quotes fields containing commas, quotes, and newlines.
 * @rubric Security & Code Quality – CWE-1236 mitigation and RFC 4180 compliance.
 */

import { fromMinorUnits } from "./money";
import type { BudgetCategory, Milestone, VendorItem } from "./types";

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Sanitize a single CSV cell value:
 * 1. Convert to string
 * 2. Prefix with single quote if it begins with formula execution characters (=, +, -, @, tab)
 * 3. Escape internal quotes with double quotes
 * 4. Wrap in quotes if it contains commas, double quotes, or newlines
 */
export function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Formula injection neutralization (CWE-1236)
  const firstChar = str.charAt(0);
  if (firstChar && FORMULA_TRIGGERS.includes(firstChar)) {
    str = `'${str}`;
  }

  // Check if RFC 4180 quoting is required
  const needsQuotes =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.startsWith("'");

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format an array of cell values as an RFC 4180 CSV row with CRLF line ending.
 */
export function toCsvRow(cells: unknown[]): string {
  return cells.map(formatCsvCell).join(",") + "\r\n";
}

/**
 * Format headers and data rows into a full CSV document.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  let csv = toCsvRow(headers);
  for (const row of rows) {
    csv += toCsvRow(row);
  }
  return csv;
}

/**
 * Export budget categories to CSV.
 */
export function exportBudgetCsv(
  categories: BudgetCategory[],
  currency: string
): string {
  const headers = [
    "Category",
    `Allocated (${currency})`,
    `Spent (${currency})`,
    `Remaining (${currency})`,
    "Is Contingency",
    "Notes",
  ];

  const rows = categories.map((cat) => {
    const allocated = fromMinorUnits(cat.allocatedMinor, currency);
    const spent = fromMinorUnits(cat.spentMinor, currency);
    const remaining = allocated - spent;

    return [
      cat.name,
      allocated.toFixed(2),
      spent.toFixed(2),
      remaining.toFixed(2),
      cat.isContingency ? "Yes" : "No",
      cat.notes || "",
    ];
  });

  return toCsv(headers, rows);
}

/**
 * Export timeline milestones to CSV.
 */
export function exportTimelineCsv(milestones: Milestone[]): string {
  const headers = [
    "Title",
    "Due Date",
    "Category",
    "Status",
    "Critical Path",
    "Overdue",
    "Dependencies",
    "Notes",
  ];

  const rows = milestones.map((m) => [
    m.title,
    m.dueDate,
    m.category,
    m.status,
    m.isCriticalPath ? "Yes" : "No",
    m.overdue ? "Yes" : "No",
    m.dependsOn.join("; "),
    m.notes || "",
  ]);

  return toCsv(headers, rows);
}

/**
 * Export vendor items to CSV.
 */
export function exportVendorsCsv(
  vendors: VendorItem[],
  currency: string
): string {
  const headers = [
    "Category",
    "Vendor Name",
    "Status",
    `Estimated Cost (${currency})`,
    `Actual Cost (${currency})`,
    "Lead Time (Weeks)",
    "Booked Date",
    "Quote Notes",
  ];

  const rows = vendors.map((v) => [
    v.category,
    v.name,
    v.status,
    v.estimatedCostMinor !== undefined
      ? fromMinorUnits(v.estimatedCostMinor, currency).toFixed(2)
      : "",
    v.actualCostMinor !== undefined
      ? fromMinorUnits(v.actualCostMinor, currency).toFixed(2)
      : "",
    v.leadTimeWeeks ?? "",
    v.bookedDate || "",
    v.quoteNotes || "",
  ]);

  return toCsv(headers, rows);
}
