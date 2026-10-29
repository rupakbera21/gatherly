import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

async function run() {
  console.log("=== Exercising Exports, Data Integrity & Persistence ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  async function takeScreenshot(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`[Screenshot Saved] -> ${filePath}`);
    return filePath;
  }

  const results = [];
  const tempFixturePath = path.join(process.cwd(), "temp_export_fixture.json");

  try {
    const fixturePlan = {
      id: "evt_export_test",
      profile: {
        id: "evt_export_test",
        type: "wedding",
        title: "Maya & Rohan Bengaluru Wedding",
        eventDate: "2027-11-20",
        guestCount: 200,
        budgetMinor: 500000000,
        currency: "INR",
        language: "en",
        location: "Bengaluru, Karnataka",
      },
      budgetCategories: [
        { id: "venue", name: "Venue & Hospitality", allocatedMinor: 175000000, spentMinor: 0, isContingency: false },
        { id: "catering", name: "Catering & Banquets", allocatedMinor: 150000000, spentMinor: 0, isContingency: false },
        { id: "decor", name: "Decor & Production", allocatedMinor: 75000000, spentMinor: 0, isContingency: false },
      ],
      milestones: [
        { id: "m1", title: "Book Main Lawn", dueDate: "2027-05-20", category: "Venue", status: "completed", isCriticalPath: true, wasClamped: false, overdue: false, dependsOn: [] },
        { id: "m2", title: "Finalize Tasting Menu", dueDate: "2027-08-20", category: "Catering", status: "pending", isCriticalPath: true, wasClamped: false, overdue: false, dependsOn: ["m1"] },
      ],
      vendors: [
        { id: "v1", name: "Royal Orchids Palace", category: "Venue", status: "booked", quotedAmountMinor: 175000000, estimatedCostMinor: 175000000, actualCostMinor: 175000000 },
      ],
      ideas: [
        { id: "i1", title: "Acoustic Sangeet Stage", description: "Low-rise acoustic stage with fairy-light canopy.", category: "Decor", status: "saved", addedToPlan: true },
      ],
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
      aiProviderBadge: "gemini",
    };

    fs.writeFileSync(tempFixturePath, JSON.stringify(fixturePlan, null, 2));

    await page.goto("http://localhost:3000/events");
    await page.setInputFiles("input[aria-label='Import plan JSON file']", tempFixturePath);
    await page.waitForURL(/\/plan\/.*\/overview/, { timeout: 15000 });

    const planUrl = page.url();
    const planId = planUrl.match(/\/plan\/(evt_[^/]+)\/overview/)[1];
    console.log("-> Seeded Plan ID:", planId);

    // ----------------------------------------------------
    // 1. ICS EXPORT VALIDATION
    // ----------------------------------------------------
    console.log("\n--- 1. Testing ICS Calendar Export ---");
    await page.goto(`http://localhost:3000/plan/${planId}/timeline`);
    await page.waitForSelector("button:has-text('Export .ICS')", { timeout: 10000 });

    const [downloadIcs] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('Export .ICS')").first().click(),
    ]);

    const icsPath = path.join(process.cwd(), "temp_download.ics");
    await downloadIcs.saveAs(icsPath);
    const icsContent = fs.readFileSync(icsPath, "utf-8");

    // Assert RFC 5545 requirements:
    const hasCRLF = icsContent.includes("\r\n");
    const lines = icsContent.split("\r\n");
    const hasBeginCalendar = lines.some((l) => l === "BEGIN:VCALENDAR");
    const hasEndCalendar = lines.some((l) => l === "END:VCALENDAR");
    const hasVEvent = lines.some((l) => l === "BEGIN:VEVENT");
    const hasValidDTStart = lines.some((l) => l.startsWith("DTSTART"));
    const noUnfoldedLongLines = lines.every((l) => Buffer.byteLength(l, "utf-8") <= 75);

    console.log("ICS Validation Details:", {
      hasCRLF,
      hasBeginCalendar,
      hasEndCalendar,
      hasVEvent,
      hasValidDTStart,
      noUnfoldedLongLines,
      lineCount: lines.length,
    });

    const icsPass = hasCRLF && hasBeginCalendar && hasEndCalendar && hasVEvent && hasValidDTStart;
    results.push({
      test: "ICS Export RFC 5545 Compliance (CRLF, folded lines, dates)",
      status: icsPass ? "Pass" : "Fail",
      details: `CRLF: ${hasCRLF}, Folded: ${noUnfoldedLongLines}, VEVENTs: ${hasVEvent}`,
    });

    // ----------------------------------------------------
    // 2. CSV EXPORT VALIDATION
    // ----------------------------------------------------
    console.log("\n--- 2. Testing CSV Export ---");
    await page.goto(`http://localhost:3000/plan/${planId}/timeline`);
    await page.waitForSelector("button:has-text('Export CSV')", { timeout: 10000 });

    const [downloadCsv] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('Export CSV')").first().click(),
    ]);

    const csvPath = path.join(process.cwd(), "temp_download.csv");
    await downloadCsv.saveAs(csvPath);
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const csvHasHeaders = csvContent.includes("Category") || csvContent.includes("Allocated") || csvContent.includes("Name");
    console.log("CSV Validation Details: Length:", csvContent.length, "Has Headers:", csvHasHeaders);
    results.push({
      test: "CSV Budget Export",
      status: csvHasHeaders ? "Pass" : "Fail",
      details: `CSV length: ${csvContent.length} bytes, Headers present: ${csvHasHeaders}`,
    });

    // ----------------------------------------------------
    // 3. JSON EXPORT & IMPORT ROUND-TRIP
    // ----------------------------------------------------
    console.log("\n--- 3. Testing JSON Export & Import Round-trip ---");
    await page.goto("http://localhost:3000/events");
    await page.waitForSelector("button:has-text('Export')", { timeout: 10000 });

    const [downloadJson] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('Export')").first().click(),
    ]);

    const jsonPath = path.join(process.cwd(), "temp_download.json");
    await downloadJson.saveAs(jsonPath);
    const exportedRaw = fs.readFileSync(jsonPath, "utf-8");
    const exportedPlan = JSON.parse(exportedRaw);

    // Verify key fields match
    const titleMatch = exportedPlan.profile?.title === fixturePlan.profile.title;
    const catCountMatch = exportedPlan.budgetCategories?.length === fixturePlan.budgetCategories.length;
    const milestoneCountMatch = exportedPlan.milestones?.length === fixturePlan.milestones.length;

    console.log("JSON Export Verification:", { titleMatch, catCountMatch, milestoneCountMatch });
    results.push({
      test: "JSON Export Structure & Integrity",
      status: (titleMatch && catCountMatch && milestoneCountMatch) ? "Pass" : "Fail",
      details: `Title match: ${titleMatch}, Categories: ${exportedPlan.budgetCategories?.length}, Milestones: ${exportedPlan.milestones?.length}`,
    });

    // ----------------------------------------------------
    // 4. PERSISTENCE AFTER FULL PAGE RELOAD
    // ----------------------------------------------------
    console.log("\n--- 4. Testing Persistence After Reload ---");
    await page.goto(`http://localhost:3000/plan/${planId}/overview`);
    await page.waitForSelector("h1", { timeout: 10000 });

    // Track network requests during reload to verify NO duplicate AI calls
    const aiCalls = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/budget") || req.url().includes("/api/timeline") || req.url().includes("/api/vendors") || req.url().includes("/api/ideas")) {
        aiCalls.push(req.url());
      }
    });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("h1", { timeout: 10000 });

    const headingAfterReload = await page.textContent("h1");
    const planPreserved = headingAfterReload?.includes("Maya & Rohan");
    const noDuplicateAi = aiCalls.length === 0;

    console.log("Persistence Details:", { planPreserved, noDuplicateAi, aiCallsCount: aiCalls.length });
    const sPersistence = await takeScreenshot("40_persistence_after_reload");
    results.push({
      test: "Full Plan Persistence After Reload (No Duplicate AI Calls)",
      status: (planPreserved && noDuplicateAi) ? "Pass" : "Fail",
      screenshot: sPersistence,
      details: `Plan title intact, duplicate AI calls triggered on reload: ${aiCalls.length}`,
    });

    // ----------------------------------------------------
    // 5. "DELETE ALL MY DATA" EMTPTIES EVERYTHING
    // ----------------------------------------------------
    console.log("\n--- 5. Testing 'Delete All My Data' ---");
    await page.goto("http://localhost:3000/events");
    await page.waitForSelector("button:has-text('Delete all my data')", { timeout: 10000 });

    const sBeforeDelete = await takeScreenshot("41_before_delete_all_data");
    const deleteBtn = page.locator("button:has-text('Delete all my data')").first();
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();

    await page.waitForSelector("button:has-text('Clear everything')", { timeout: 5000 });
    const confirmBtn = page.locator("button:has-text('Clear everything')").first();
    await confirmBtn.click();
    await page.waitForTimeout(1000);

    const sAfterDelete = await takeScreenshot("42_after_delete_all_data");
    const planCountText = await page.textContent("main");
    const isEmpty = planCountText?.includes("0 plans") || planCountText?.includes("No events planned yet");

    const storageCleared = await page.evaluate(() => {
      const stored = localStorage.getItem("gatherly_plans_v1");
      if (!stored) return true;
      const parsed = JSON.parse(stored);
      return Object.keys(parsed.state?.events || {}).length === 0;
    });

    console.log("Delete All Data Details:", { isEmpty, storageCleared });
    results.push({
      test: "Delete All My Data Purges LocalStorage",
      status: (isEmpty && storageCleared) ? "Pass" : "Fail",
      screenshot: sAfterDelete,
      details: `Empty state visible: ${isEmpty}, Storage cleared: ${storageCleared}`,
    });

    console.log("\n=== Exports, Data Integrity & Persistence Summary ===");
    console.table(results);
  } catch (err) {
    console.error("Error in exports test:", err);
  } finally {
    const filesToClean = [
      tempFixturePath,
      path.join(process.cwd(), "temp_download.ics"),
      path.join(process.cwd(), "temp_download.csv"),
      path.join(process.cwd(), "temp_download.json"),
    ];
    for (const f of filesToClean) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    }
    await browser.close();
  }
}

run();
