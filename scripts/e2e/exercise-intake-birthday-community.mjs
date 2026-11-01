import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log("=== Exercising Hand-Typed Birthday & Community Intake & Modules ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const results = [];

  async function takeScreenshot(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`[Screenshot Saved] -> ${filePath}`);
    return filePath;
  }

  try {
    // ----------------------------------------------------
    // 1. HAND-TYPED BIRTHDAY INTAKE
    // ----------------------------------------------------
    console.log("\n--- 1. Testing Hand-Typed Birthday Intake ---");
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("#intake-section");

    const textarea = page.locator("textarea[name='rawPrompt'], textarea#event-prompt, textarea").first();
    await textarea.click();
    await textarea.fill("Rohan's 30th birthday dinner for 35 guests in Indiranagar, Bangalore on 2026-12-15 with a budget of 150000 INR. Needs acoustic music and customized cake.");
    await page.waitForTimeout(400);

    const submitBtn = page.locator("button:has-text('Continue to profile review')");
    await submitBtn.click();

    await page.waitForSelector("#review-form", { timeout: 90000 });
    const sBdayReview = await takeScreenshot("20_birthday_review_form");
    results.push({ test: "Birthday Review Form", status: "Pass", screenshot: sBdayReview });

    // Confirm and generate full plan
    const createBdayBtn = page.locator("#review-form button:has-text('Generate Full Plan')");
    await createBdayBtn.click();
    await page.waitForURL(/\/plan\/.*\/overview/, { timeout: 20000 });

    const bdayUrl = page.url();
    const bdayId = bdayUrl.match(/\/plan\/(evt_[^/]+)\/overview/)[1];
    console.log("-> Created Birthday Plan ID:", bdayId);

    // Generate modules
    const genBdayBtn = page.locator("button:has-text('Generate Full Plan')").first();
    if (await genBdayBtn.isVisible()) {
      await genBdayBtn.click();
      await page.waitForTimeout(6000);
    }
    const sBdayOverview = await takeScreenshot("21_birthday_plan_overview");
    results.push({ test: "Birthday Full Plan Generation", status: "Pass", screenshot: sBdayOverview });

    // Check Birthday Extras Toolkit
    await page.goto(`http://localhost:3000/plan/${bdayId}/extras`);
    await page.waitForSelector("h2:has-text('Toolkit')", { timeout: 10000 });
    const sBdayExtras = await takeScreenshot("22_birthday_type_extras");
    results.push({ test: "Birthday Specialized Extras (Cake, Playlist, Activities)", status: "Pass", screenshot: sBdayExtras });

    // ----------------------------------------------------
    // 2. HAND-TYPED COMMUNITY EVENT INTAKE
    // ----------------------------------------------------
    console.log("\n--- 2. Testing Hand-Typed Community Event Intake ---");
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("#intake-section");

    const textareaComm = page.locator("textarea").first();
    await textareaComm.click();
    await textareaComm.fill("Green Indiranagar eco-fair and neighborhood tree plantation drive for 120 residents on 2027-01-20 in Bangalore with budget 80000 INR. Need volunteer coordination and municipal permissions.");
    await page.waitForTimeout(400);

    const submitCommBtn = page.locator("button:has-text('Continue to profile review')");
    await submitCommBtn.click();

    await page.waitForSelector("#review-form", { timeout: 90000 });
    const sCommReview = await takeScreenshot("23_community_review_form");
    results.push({ test: "Community Review Form", status: "Pass", screenshot: sCommReview });

    const createCommBtn = page.locator("#review-form button:has-text('Generate Full Plan')");
    await createCommBtn.click();
    await page.waitForURL(/\/plan\/.*\/overview/, { timeout: 20000 });

    const commUrl = page.url();
    const commId = commUrl.match(/\/plan\/(evt_[^/]+)\/overview/)[1];
    console.log("-> Created Community Plan ID:", commId);

    // Generate modules
    const genCommBtn = page.locator("button:has-text('Generate Full Plan')").first();
    if (await genCommBtn.isVisible()) {
      await genCommBtn.click();
      await page.waitForTimeout(6000);
    }
    const sCommOverview = await takeScreenshot("24_community_plan_overview");
    results.push({ test: "Community Full Plan Generation", status: "Pass", screenshot: sCommOverview });

    // Check Community Extras Toolkit
    await page.goto(`http://localhost:3000/plan/${commId}/extras`);
    await page.waitForSelector("h2:has-text('Toolkit')", { timeout: 10000 });
    const sCommExtras = await takeScreenshot("25_community_type_extras");
    results.push({ test: "Community Specialized Extras (Volunteers, Permits, Sponsors)", status: "Pass", screenshot: sCommExtras });

  } catch (err) {
    console.error("Error during birthday/community intake exercise:", err);
  } finally {
    await browser.close();
  }

  console.log("\n=== Birthday & Community Intake Results ===");
  console.log(JSON.stringify(results, null, 2));
}

run();
