/**
 * @module csv.test
 * @purpose Unit tests for RFC 4180 CSV export and formula injection defense.
 *          Verifies proper escaping, quotation rules, and neutralization of
 *          spreadsheet formula execution characters (=, +, -, @, \t).
 */

import {
  exportBudgetCsv,
  exportTimelineCsv,
  exportVendorsCsv,
  formatCsvCell,
  toCsvRow,
} from "../../domain/csv";

describe("CSV Engine & Security Tests", () => {
  it("neutralises formula injection (CWE-1236) with leading single quote", () => {
    // Formula payloads attempting execution or exfiltration
    expect(formatCsvCell("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
    expect(formatCsvCell("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
    expect(formatCsvCell("-1+1")).toBe("\"'-1+1\"");
    expect(formatCsvCell("@DDE(\"server\",\"app\",\"topic\")")).toBe("\"'@DDE(\"\"server\"\",\"\"app\"\",\"\"topic\"\")\"");
    expect(formatCsvCell("\tmalicious_tab")).toBe("\"'\tmalicious_tab\"");
  });

  it("applies RFC 4180 quoting for commas, double quotes, and line breaks", () => {
    // Commas
    expect(formatCsvCell("Venue, Hall A")).toBe('"Venue, Hall A"');

    // Quotes escaped by doubling
    expect(formatCsvCell('The "Grand" Ballroom')).toBe('"The ""Grand"" Ballroom"');

    // Newlines
    expect(formatCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');

    // Normal safe strings stay unquoted
    expect(formatCsvCell("Catering")).toBe("Catering");
    expect(formatCsvCell(1234)).toBe("1234");
    expect(formatCsvCell(null)).toBe("");
  });

  it("formats CSV row with CRLF line ending", () => {
    const row = toCsvRow(["Venue", 1500, "Notes: good, reliable"]);
    expect(row).toBe('Venue,1500,"Notes: good, reliable"\r\n');
  });

  it("exports budget data accurately", () => {
    const categories = [
      {
        id: "cat_1",
        name: "Catering & Bar",
        allocatedMinor: 500000, // $5,000.00
        spentMinor: 250000, // $2,500.00
        notes: "Deposit paid",
        isContingency: false,
      },
    ];

    const csv = exportBudgetCsv(categories, "USD");
    expect(csv).toContain("Category,Allocated (USD),Spent (USD),Remaining (USD),Is Contingency,Notes\r\n");
    expect(csv).toContain("Catering & Bar,5000.00,2500.00,2500.00,No,Deposit paid\r\n");
  });

  it("exports timeline and vendor datasets safely with formula-free headers and data", () => {
    const milestones = [
      {
        id: "m_1",
        title: "=Dangerous Title",
        dueDate: "2026-11-01",
        category: "Planning",
        status: "pending" as const,
        dependsOn: [],
        isCriticalPath: true,
        wasClamped: false,
        overdue: false,
      },
    ];

    const csv = exportTimelineCsv(milestones);
    // Dangerous title must be neutralized
    expect(csv).toContain("\"'=Dangerous Title\"");
    expect(csv).toContain("Yes"); // Critical path

    const vendors = [
      {
        id: "v_1",
        category: "Venue",
        name: "@Grand Ballroom",
        status: "contacted" as const,
        estimatedCostMinor: 400000,
      },
    ];
    const vendorCsv = exportVendorsCsv(vendors, "USD");
    expect(vendorCsv).toContain("\"'@Grand Ballroom\"");
    expect(vendorCsv).toContain("4000.00");
  });
});
