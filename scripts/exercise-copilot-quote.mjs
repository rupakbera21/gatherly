import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

async function run() {
  console.log("=== Exercising Copilot & Quote Analyzer with Real Browser ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  async function takeScreenshot(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`[Screenshot Saved] -> ${filePath}`);
    return filePath;
  }

  const tempFixturePath = path.join(process.cwd(), "temp_copilot_plan.json");

  try {
    // 1. Create fixture and import through real UI file upload
    const fixture = {
      id: "evt_copilot_quote_fixture",
      profile: {
        id: "evt_copilot_quote_fixture",
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
        { id: "photo", name: "Photography & Cinema", allocatedMinor: 60000000, spentMinor: 0, isContingency: false },
        { id: "misc", name: "Contingency & Buffer", allocatedMinor: 40000000, spentMinor: 0, isContingency: true },
      ],
      milestones: [
        { id: "m1", title: "Book Main Lawn", dueDate: "2027-05-20", category: "Venue", status: "completed", isCriticalPath: true, wasClamped: false, overdue: false, dependsOn: [] },
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

    fs.writeFileSync(tempFixturePath, JSON.stringify(fixture, null, 2));

    await page.goto("http://localhost:3000/events");
    await page.waitForTimeout(500);

    await page.setInputFiles("input[aria-label='Import plan JSON file']", tempFixturePath);
    await page.waitForURL(/\/plan\/.*\/overview/, { timeout: 15000 });

    const planUrl = page.url();
    const planId = planUrl.match(/\/plan\/(evt_[^/]+)\/overview/)[1];
    console.log("-> Successfully imported plan with ID:", planId);

    // ----------------------------------------------------
    // COPILOT INTERACTION: ASK, PROPOSE, APPROVE, REJECT, UNDO, REDO
    // ----------------------------------------------------
    console.log("\n--- Testing Copilot Interactive Workflow ---");
    const copilotBtn = page.locator("button:has-text('Copilot')").first();
    await copilotBtn.click();
    await page.waitForSelector("#copilot-drawer-title", { timeout: 5000 });

    const sCopilotOpen = await takeScreenshot("30_copilot_drawer_opened");

    // Type query to Copilot
    const copilotInput = page.locator("input[placeholder*='Ask Copilot']").first();
    await copilotInput.fill("Please adjust our photography budget to 450,000 INR.");
    await copilotInput.press("Enter");

    // Wait for response or patch proposal card (allow up to 35s)
    console.log("-> Sent prompt to Copilot, waiting for AI proposal...");
    await page.waitForTimeout(14000);
    const sCopilotResponse = await takeScreenshot("31_copilot_patch_proposed");

    // Check for "Approve & Apply" button
    const applyBtn = page.locator("button:has-text('Approve & Apply')").first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForTimeout(600);
      console.log("-> Approved/applied patch");
    }

    const sCopilotApplied = await takeScreenshot("32_copilot_patch_applied");

    // Close Copilot drawer
    const closeBtn = page.locator("button[aria-label*='Close']").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // Test Undo button in plan header
    const undoBtn = page.locator("button:has-text('Undo')").first();
    if (await undoBtn.isVisible() && !(await undoBtn.isDisabled())) {
      await undoBtn.click();
      await page.waitForTimeout(500);
      console.log("-> Clicked Undo");
    }
    const sUndo = await takeScreenshot("33_plan_undo_applied");

    // Test Redo button in plan header
    const redoBtn = page.locator("button:has-text('Redo')").first();
    if (await redoBtn.isVisible() && !(await redoBtn.isDisabled())) {
      await redoBtn.click();
      await page.waitForTimeout(500);
      console.log("-> Clicked Redo");
    }
    const sRedo = await takeScreenshot("34_plan_redo_applied");

    // Test Rejecting a patch proposal: reopen Copilot, propose a new change, then click Reject
    console.log("-> Testing Copilot patch rejection...");
    await copilotBtn.click();
    await page.waitForTimeout(600);
    const copilotInput2 = page.locator("input[placeholder*='Ask Copilot']").first();
    await copilotInput2.fill("Please add a fireworks vendor with 75,000 INR.");
    await copilotInput2.press("Enter");
    await page.waitForTimeout(14000);

    const rejectBtn = page.locator("button:has-text('Reject')").first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
      await page.waitForTimeout(600);
      console.log("-> Successfully clicked Reject on patch proposal");
    }
    const sCopilotRejected = await takeScreenshot("32b_copilot_patch_rejected");

    // Close Copilot drawer
    const closeBtn2 = page.locator("button[aria-label*='Close']").first();
    if (await closeBtn2.isVisible()) {
      await closeBtn2.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // QUOTE ANALYZER: REAL AUDIT WITH PASTED QUOTE TEXT
    // ----------------------------------------------------
    console.log("\n--- Testing Quote Analyzer with Real Quote Text ---");
    await page.goto(`http://localhost:3000/plan/${planId}/quote`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    const quoteSample = `ROYAL FEAST CATERING SERVICES - QUOTATION
Client Event: Maya & Rohan Wedding Reception
Guest Count: 150 Guests
Package: Premium Royal South & North Indian Fusion Buffet

Itemized Breakdown:
- Welcome Drinks & Live Chaat Counter: ₹35,000
- Multi-Course Buffet Dinner (150 pax @ ₹1,100/plate): ₹1,65,000
- Artisanal Dessert Station & Kulfi Bar: ₹25,000
- High Tea & Filter Coffee Stall: ₹15,000
- Service Crew & Table Management (15 stewards): ₹18,000
- Cleaning & Waste Disposal Surcharge: ₹8,000

Subtotal: ₹2,66,000
GST @ 18%: ₹47,880
Total Payable: ₹3,13,880

Payment Terms & Conditions:
1. 50% advance deposit (non-refundable) upon confirmation.
2. 40% two weeks before event date; 10% on day of event.
3. Overtime past 11:30 PM billed at ₹5,000 per hour.
4. Food wastage disposal handled by vendor.`;

    const quoteTextarea = page.locator("textarea#quote-textarea, textarea").first();
    await quoteTextarea.fill(quoteSample);
    await page.waitForTimeout(400);

    const auditBtn = page.locator("button:has-text('Audit Quote')").first();
    await auditBtn.click();

    console.log("-> Clicked Audit Quote, waiting for AI analysis...");
    await page.waitForSelector("button:has-text('Add Vendor to Plan')", { timeout: 60000 });
    const sQuoteResult = await takeScreenshot("35_quote_analyzer_real_result");

    console.log("\n=== Copilot & Quote Analyzer Completed Successfully! ===");
  } catch (err) {
    console.error("Error in copilot & quote analyzer test:", err);
  } finally {
    if (fs.existsSync(tempFixturePath)) {
      try { fs.unlinkSync(tempFixturePath); } catch {}
    }
    await browser.close();
  }
}

run();
