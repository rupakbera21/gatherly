import { chromium } from "@playwright/test";
import path from "path";

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
    { id: "venue", name: "Venue & Hospitality", percentage: 35, allocatedMinor: 175000000, actualMinor: 0 },
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/");
  await page.evaluate((seed) => {
    localStorage.setItem("gatherly_plans_v1", JSON.stringify(seed));
  }, SEED_STORE_STATE);

  await page.goto(`http://localhost:3000/plan/${SEED_EVENT_ID}/overview`);
  await page.waitForTimeout(1000);

  // Open Copilot
  const copilotBtn = page.locator("button:has-text('Copilot')").first();
  await copilotBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_copilot_drawer.png") });
  console.log("Saved fixed 10_copilot_drawer.png");

  // Also quote page
  await page.goto(`http://localhost:3000/plan/${SEED_EVENT_ID}/quote`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11_quote_analyzer.png") });
  console.log("Saved fixed 11_quote_analyzer.png");

  await browser.close();
}

run();
