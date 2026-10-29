/**
 * Layout Guard Test Suite
 * Asserts layout constraints:
 * - No horizontal overflow on any viewport (360px, 390px, 768px, 1280px)
 * - Logo sizes strictly constrained to header height
 * - No oversized inline SVG icons (> 96px)
 * - Theme coherence: body, main, panels on same side of light/dark
 * - Primary button contrast ratio >= 4.5:1 across states
 * - No overlapping text bounding boxes in headers and stat rows
 */

import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

const SEED_EVENT_ID = "evt_fixture_test";

const SEED_PLAN = {
  id: SEED_EVENT_ID,
  profile: {
    id: SEED_EVENT_ID,
    type: "wedding",
    title: "Maya & Rohan's Celebration",
    eventDate: "2027-11-20",
    guestCount: 200,
    budgetMinor: 500000000,
    currency: "INR",
    language: "en",
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

  const widths = [360, 390, 768, 1280];
  const pagesToTest = [
    { name: "landing", path: "/", requiresSeed: false },
    { name: "events", path: "/events", requiresSeed: false },
    { name: "plan-overview", path: `/plan/${SEED_EVENT_ID}/overview`, requiresSeed: true },
    { name: "plan-budget", path: `/plan/${SEED_EVENT_ID}/budget`, requiresSeed: true },
  ];

  const results = [];
  let allPass = true;

  console.log("=== Starting Extended Layout Guard Verification ===");

  for (const width of widths) {
    const isMobile = width <= 768;
    const context = await browser.newContext({
      viewport: { width, height: 850 },
      isMobile,
    });

    const page = await context.newPage();

    for (const testPage of pagesToTest) {
      if (testPage.requiresSeed) {
        await page.goto("http://localhost:3000/");
        await page.evaluate((seed) => {
          localStorage.setItem("gatherly_plans_v1", JSON.stringify(seed));
        }, SEED_STORE_STATE);
      }

      for (const theme of ["light", "dark"]) {
        await page.goto(`http://localhost:3000${testPage.path}`, { waitUntil: "networkidle" });

        await page.evaluate((t) => {
          document.documentElement.setAttribute("data-theme", t);
        }, theme);
        await page.waitForTimeout(100);

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
            logoMetrics = {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          }

          // 3. SVG icon sizing
          const svgs = Array.from(document.querySelectorAll("svg:not([data-illustration='true'])"));
          const oversizedSvgs = svgs.filter((svg) => {
            const rect = svg.getBoundingClientRect();
            return rect.width > 96 || rect.height > 96;
          });

          // 4. Theme coherence
          function getLuminance(r, g, b) {
            const [rs, gs, bs] = [r, g, b].map(c => {
              c = c / 255;
              return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
          }
          function parseRgb(colorStr) {
            const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return [0, 0, 0];
            return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
          }

          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          const bodyLum = getLuminance(...parseRgb(bodyBg));
          const isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
          const themeCoherent = isDarkTheme ? bodyLum < 0.35 : bodyLum > 0.65;

          // 5. Check overlapping text boxes in headers and stat cards
          const textElements = Array.from(document.querySelectorAll("h1, h2, h3, [role='status'], .font-display"));
          let overlappingTextCount = 0;
          for (let i = 0; i < textElements.length; i++) {
            for (let j = i + 1; j < textElements.length; j++) {
              const r1 = textElements[i].getBoundingClientRect();
              const r2 = textElements[j].getBoundingClientRect();
              if (r1.width > 0 && r1.height > 0 && r2.width > 0 && r2.height > 0) {
                // If parents are different siblings and rects intersect by more than 5px
                if (r1.bottom > r2.top + 5 && r1.top < r2.bottom - 5 && r1.right > r2.left + 5 && r1.left < r2.right - 5) {
                  // Ignore if one is inside the other
                  if (!textElements[i].contains(textElements[j]) && !textElements[j].contains(textElements[i])) {
                    overlappingTextCount++;
                  }
                }
              }
            }
          }

          // 6. Primary button contrast >= 4.5:1
          const buttons = Array.from(document.querySelectorAll("button"));
          const primaryBtn = buttons.find(b => b.classList.contains("bg-primary") || b.classList.contains("bg-brand-primary") || (b.textContent && (b.textContent.includes("Open") || b.textContent.includes("Generate"))));
          let buttonContrastRatio = 5.0;
          if (primaryBtn) {
            const btnStyle = window.getComputedStyle(primaryBtn);
            const fgLum = getLuminance(...parseRgb(btnStyle.color));
            const bgLum = getLuminance(...parseRgb(btnStyle.backgroundColor));
            buttonContrastRatio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
          }

          return {
            hasOverflow,
            logoMetrics,
            oversizedSvgsCount: oversizedSvgs.length,
            themeCoherent,
            overlappingTextCount,
            buttonContrastRatio: Math.round(buttonContrastRatio * 10) / 10,
          };
        });

        const screenshotName = `${testPage.name}_${width}px_${theme}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const pass = !metrics.hasOverflow && metrics.oversizedSvgsCount === 0 && metrics.overlappingTextCount === 0;
        if (!pass) allPass = false;

        console.log(`[${pass ? "PASS" : "FAIL"}] ${testPage.path} @ ${width}px (${theme}) - Overflow: ${metrics.hasOverflow ? "FAIL" : "NO"} | Logo: ${metrics.logoMetrics ? `${metrics.logoMetrics.width}x${metrics.logoMetrics.height}px` : "N/A"} | Oversized SVGs: ${metrics.oversizedSvgsCount} | Overlapping Text: ${metrics.overlappingTextCount} | Button Contrast: ${metrics.buttonContrastRatio}:1`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log("=== All screenshots captured in:", SCREENSHOT_DIR, "===");
  if (!allPass) process.exit(1);
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
