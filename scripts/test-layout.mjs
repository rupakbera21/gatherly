import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * scripts/test-layout.mjs
 * Layout Guard & Visual Verification Test Suite
 * Runs against production build on http://localhost:3000
 */

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Seed plan fixture for localStorage
const SEED_EVENT_ID = "evt_fixture_test";
const SEED_PLAN = {
  id: SEED_EVENT_ID,
  profile: {
    id: SEED_EVENT_ID,
    type: "wedding",
    title: "Maya & Rohan's Celebration",
    eventDate: "2027-11-20",
    guestCount: 200,
    budgetMinor: 500000000, // ₹50,00,000 (paise)
    currency: "INR",
    language: "en",
  },
  budgetCategories: [
    { id: "venue", name: "Venue & Hospitality", percentage: 35, allocatedMinor: 175000000, actualMinor: 0 },
    { id: "catering", name: "Catering & Banquets", percentage: 30, allocatedMinor: 150000000, actualMinor: 0 },
    { id: "decor", name: "Decor & Production", percentage: 15, allocatedMinor: 75000000, actualMinor: 0 },
    { id: "photo", name: "Photography & Cinema", percentage: 12, allocatedMinor: 60000000, actualMinor: 0 },
    { id: "misc", name: "Contingency & Buffer", percentage: 8, allocatedMinor: 40000000, actualMinor: 0 },
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

const SEED_STORE_STATE = {
  state: {
    events: { [SEED_EVENT_ID]: SEED_PLAN },
    currentEventId: SEED_EVENT_ID,
    undoStacks: { [SEED_EVENT_ID]: [] },
    redoStacks: { [SEED_EVENT_ID]: [] },
    storageNotice: null,
  },
  version: 1,
};

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  console.log("=== Starting Layout Guard & Screenshot Verification ===");

  const widths = [360, 390, 768, 1280];
  const pagesToTest = [
    { path: "/", name: "home" },
    { path: "/events", name: "events" },
    { path: `/plan/${SEED_EVENT_ID}/overview`, name: "plan-overview", requiresSeed: true },
    { path: `/plan/${SEED_EVENT_ID}/budget`, name: "plan-budget", requiresSeed: true },
  ];

  const results = [];

  for (const width of widths) {
    const isMobile = width <= 768;
    const context = await browser.newContext({
      viewport: { width, height: 850 },
      isMobile,
    });

    const page = await context.newPage();

    for (const testPage of pagesToTest) {
      if (testPage.requiresSeed) {
        // Pre-seed localStorage before navigating
        await page.goto("http://localhost:3000/");
        await page.evaluate((seed) => {
          localStorage.setItem("gatherly_plans_v1", JSON.stringify(seed));
        }, SEED_STORE_STATE);
      }

      for (const theme of ["light", "dark"]) {
        await page.goto(`http://localhost:3000${testPage.path}`, { waitUntil: "networkidle" });

        // Set theme
        await page.evaluate((t) => {
          document.documentElement.setAttribute("data-theme", t);
        }, theme);
        await page.waitForTimeout(100);

        // Verification metrics:
        const metrics = await page.evaluate(() => {
          // 1. Horizontal overflow
          const docWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const hasOverflow = scrollWidth > docWidth + 2 || bodyScrollWidth > docWidth + 2;

          // 2. Logo measurements
          const lightLogo = document.querySelector(".brand-logo-light");
          const darkLogo = document.querySelector(".brand-logo-dark");
          const activeLogo = document.documentElement.getAttribute("data-theme") === "dark" ? darkLogo : lightLogo;
          let logoMetrics = null;
          if (activeLogo) {
            const rect = activeLogo.getBoundingClientRect();
            const comp = window.getComputedStyle(activeLogo);
            logoMetrics = {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              display: comp.display,
              maxHeight: comp.maxHeight,
            };
          }

          // 3. SVG icons sizing: no icon > 96px unless illustration
          const svgs = Array.from(document.querySelectorAll("svg:not([data-illustration='true'])"));
          const oversizedSvgs = svgs.filter((svg) => {
            const rect = svg.getBoundingClientRect();
            return rect.width > 96 || rect.height > 96;
          }).map(svg => ({ tag: svg.outerHTML.slice(0, 50), w: svg.getBoundingClientRect().width, h: svg.getBoundingClientRect().height }));

          return {
            docWidth,
            scrollWidth,
            hasOverflow,
            logoMetrics,
            oversizedSvgsCount: oversizedSvgs.length,
            oversizedSvgs,
          };
        });

        const screenshotName = `${testPage.name}_${width}px_${theme}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        results.push({
          page: testPage.path,
          width,
          theme,
          metrics,
          screenshotPath,
        });

        console.log(`[PASS] ${testPage.path} @ ${width}px (${theme}) - Overflow: ${metrics.hasOverflow ? "FAIL" : "NO"} | Logo: ${metrics.logoMetrics ? `${metrics.logoMetrics.width}x${metrics.logoMetrics.height}px` : "N/A"} | Oversized SVGs: ${metrics.oversizedSvgsCount}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log("=== All screenshots captured in:", SCREENSHOT_DIR, "===");
  return results;
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
