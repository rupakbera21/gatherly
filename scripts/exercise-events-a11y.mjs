import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

async function run() {
  console.log("=== Exercising Events Dashboard & Accessibility Toolbar ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  async function takeScreenshot(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`[Screenshot Saved] -> ${filePath}`);
    return filePath;
  }

  try {
    // 1. Events Dashboard
    console.log("\n--- Testing Events Dashboard ---");
    await page.goto("http://localhost:3000/events");
    await page.waitForSelector("text='Saved event plans'", { timeout: 10000 });
    const s12 = await takeScreenshot("12_events_dashboard");

    // 2. Duplicate Event
    console.log("\n--- Testing Duplicate Event ---");
    const dupBtn = page.locator("button:has-text('Duplicate')").first();
    if (await dupBtn.isVisible()) {
      await dupBtn.click();
      await page.waitForTimeout(800);
      console.log("-> Clicked Duplicate button");
    }
    const s13 = await takeScreenshot("13_event_duplicated");

    // 3. Accessibility Toolbar
    console.log("\n--- Testing Accessibility Toolbar ---");
    const a11yToggle = page.locator("#a11y-toolbar-toggle");
    await a11yToggle.click();
    await page.waitForSelector("#a11y-toolbar-panel", { timeout: 5000 });
    const s14 = await takeScreenshot("14_accessibility_toolbar");

    // 4. Dark Theme & Reload Persistence
    console.log("\n--- Testing Dark Theme & Reload Persistence ---");
    const darkRadio = page.locator("input[name='theme'][value='dark']");
    await darkRadio.click();
    await page.waitForTimeout(400);

    // Verify data-theme attribute on html
    const themeAttrBefore = await page.getAttribute("html", "data-theme");
    console.log("-> html data-theme before reload:", themeAttrBefore);

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);
    const themeAttrAfter = await page.getAttribute("html", "data-theme");
    console.log("-> html data-theme after reload:", themeAttrAfter);

    const s15 = await takeScreenshot("15_dark_mode_persisted");

    // 5. Test High Contrast and Dyslexia Font
    console.log("\n--- Testing Dyslexia Font & High Contrast ---");
    await page.locator("#a11y-toolbar-toggle").click();
    await page.waitForSelector("#a11y-toolbar-panel", { timeout: 5000 });

    const dyslexiaCheckbox = page.locator("input[type='checkbox']").first();
    await dyslexiaCheckbox.click();
    await page.waitForTimeout(300);

    const s16 = await takeScreenshot("16_a11y_dyslexia_font");

    console.log("\nAll Events and A11y tests finished successfully!");
  } catch (err) {
    console.error("Error during events & a11y test:", err);
  } finally {
    await browser.close();
  }
}

run();
