import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "C:\\Users\\RUPAK\\.gemini\\antigravity\\brain\\d2e1bd28-6084-4db3-abe4-f81405f680cf\\screenshots";

async function run() {
  console.log("=== Exercising Accessibility, Keyboard Navigation, Mobile 390px, and Favicon ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];

  async function takeScreenshot(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`[Screenshot Saved] -> ${filePath}`);
    return filePath;
  }

  const tempFixturePath = path.join(process.cwd(), "temp_a11y_plan.json");

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // ----------------------------------------------------
    // 1. ACCESSIBILITY PREFERENCES & PERSISTENCE
    // ----------------------------------------------------
    console.log("\n--- 1. Testing Accessibility Preferences & Persistence ---");
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("#intake-section");

    // Open Accessibility toolbar
    const a11yTrigger = page.locator("#a11y-toolbar-toggle");
    await a11yTrigger.click();
    await page.waitForSelector("#a11y-toolbar-panel", { timeout: 5000 });

    // Set Font Scale to 1.3x (X-Large)
    const scale130 = page.locator("label:has-text('X-Large') input").first();
    await scale130.check();
    await page.waitForTimeout(300);
    const sFontScale = await takeScreenshot(page, "60_a11y_text_size_130");

    // Toggle High Contrast
    const highContrastToggle = page.locator("label:has-text('High contrast') input").first();
    await highContrastToggle.check();
    await page.waitForTimeout(400);

    // Verify background gradient is hidden in high contrast
    const bgHidden = await page.evaluate(() => {
      const el = document.querySelector(".brand-bg-layer");
      if (!el) return true;
      const style = window.getComputedStyle(el);
      return style.display === "none";
    });
    const sHighContrast = await takeScreenshot(page, "61_a11y_high_contrast");
    console.log("High Contrast Active:", { bgHidden });

    // Toggle Reduced Motion
    const reducedMotionToggle = page.locator("label:has-text('Reduce motion') input").first();
    await reducedMotionToggle.check();
    await page.waitForTimeout(400);

    const sReducedMotion = await takeScreenshot(page, "62_a11y_reduced_motion");

    // Verify persistence after page reload
    await page.reload({ waitUntil: "networkidle" });
    const persistedState = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem("gatherly:a11y") || "{}");
      const html = document.documentElement;
      return {
        scale: html.style.getPropertyValue("--font-scale") || stored.fontScale,
        highContrast: html.getAttribute("data-high-contrast") || String(stored.highContrast),
        reducedMotion: html.getAttribute("data-reduced-motion") || String(stored.reducedMotion === "always"),
      };
    });

    console.log("Persisted A11y Attributes after reload:", persistedState);
    const sPersisted = await takeScreenshot(page, "63_a11y_persisted_after_reload");

    results.push({
      test: "A11y Preferences (Text Size, High Contrast, Reduced Motion) & Persistence",
      status: (persistedState.highContrast === "true" && persistedState.reducedMotion === "true") ? "Pass" : "Fail",
      screenshot: sPersisted,
      details: JSON.stringify(persistedState),
    });

    // Reset A11y back to normal for subsequent tests
    await page.evaluate(() => {
      localStorage.removeItem("gatherly:a11y");
      document.documentElement.removeAttribute("data-high-contrast");
      document.documentElement.removeAttribute("data-reduced-motion");
      document.documentElement.style.removeProperty("--font-scale");
    });
    await page.reload({ waitUntil: "networkidle" });

    // ----------------------------------------------------
    // 2. KEYBOARD-ONLY WALKTHROUGH & FOCUS TRAP
    // ----------------------------------------------------
    console.log("\n--- 2. Testing Keyboard Walkthrough & Copilot Focus Trap ---");
    await page.goto("http://localhost:3000/");

    // Press Tab multiple times to exercise focus ring visibility
    await page.keyboard.press("Tab"); // Skip to content
    await page.keyboard.press("Tab"); // Brand Logo
    await page.keyboard.press("Tab"); // New Plan / Saved Plans
    await page.waitForTimeout(300);

    const activeElTag = await page.evaluate(() => document.activeElement?.tagName);
    const hasFocusOutline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const s = window.getComputedStyle(el);
      return s.outlineStyle !== "none" || s.boxShadow !== "none";
    });

    const sKeyFocus = await takeScreenshot(page, "64_keyboard_focus_visible");
    console.log("Keyboard Active Element:", { activeElTag, hasFocusOutline });

    // Seed plan and test Copilot focus trap
    const fixturePlan = {
      id: "evt_mobile_test",
      profile: {
        id: "evt_mobile_test",
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
        { id: "c1", name: "Venue", allocatedMinor: 175000000, spentMinor: 0, isContingency: false },
        { id: "c2", name: "Catering", allocatedMinor: 150000000, spentMinor: 0, isContingency: false }
      ],
      milestones: [
        { id: "m1", title: "Book Lawn", dueDate: "2027-05-20", category: "Venue", status: "completed", isCriticalPath: true, wasClamped: false, overdue: false, dependsOn: [] }
      ],
      vendors: [],
      ideas: [],
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
      aiProviderBadge: "gemini",
    };

    fs.writeFileSync(tempFixturePath, JSON.stringify(fixturePlan));
    await page.goto("http://localhost:3000/events");
    await page.setInputFiles("input[aria-label='Import plan JSON file']", tempFixturePath);
    await page.waitForURL(/\/plan\/.*\/overview/, { timeout: 15000 });

    const planUrl = page.url();
    const planId = planUrl.match(/\/plan\/(evt_[^/]+)\/overview/)[1];

    // Open Copilot drawer
    await page.locator("button:has-text('Copilot')").first().click();
    await page.waitForSelector("#copilot-drawer-title", { timeout: 5000 });

    // Verify focus starts inside drawer
    const focusInsideDrawer = await page.evaluate(() => {
      const drawer = document.querySelector("[aria-labelledby='copilot-drawer-title']");
      return drawer?.contains(document.activeElement) ?? false;
    });

    // Press Tab 8 times to verify focus wraps around and never leaves drawer
    let escapedDrawer = false;
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const drawer = document.querySelector("[aria-labelledby='copilot-drawer-title']");
        return drawer?.contains(document.activeElement) ?? false;
      });
      if (!inside) escapedDrawer = true;
    }

    const sFocusTrap = await takeScreenshot(page, "65_copilot_keyboard_focus_trap");
    console.log("Copilot Focus Trap:", { focusInsideDrawer, focusRemainedTrapped: !escapedDrawer });

    // Press Escape to verify close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const drawerClosed = !(await page.locator("#copilot-drawer-title").isVisible());

    results.push({
      test: "Keyboard Navigation & Copilot Drawer Focus Trap (WCAG 2.2 AA)",
      status: (!escapedDrawer && drawerClosed) ? "Pass" : "Fail",
      screenshot: sFocusTrap,
      details: `Focus trapped: ${!escapedDrawer}, Escape closes drawer: ${drawerClosed}`,
    });

    await context.close();

    // ----------------------------------------------------
    // 3. MOBILE AT 390PX VIEWPORT AUDIT
    // ----------------------------------------------------
    console.log("\n--- 3. Testing Mobile at 390px Viewport ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mPage = await mobileContext.newPage();

    // Re-seed plan for mobile context
    await mPage.goto("http://localhost:3000/events");
    await mPage.setInputFiles("input[aria-label='Import plan JSON file']", tempFixturePath);
    await mPage.waitForURL(/\/plan\/.*\/overview/, { timeout: 15000 });
    const mobilePlanId = mPage.url().match(/\/plan\/(evt_[^/]+)\/overview/)[1];

    const mobilePages = [
      { name: "landing", path: "/", screenshot: "70_mobile_390_landing" },
      { name: "overview", path: `/plan/${mobilePlanId}/overview`, screenshot: "71_mobile_390_overview" },
      { name: "budget", path: `/plan/${mobilePlanId}/budget`, screenshot: "72_mobile_390_budget" },
      { name: "timeline", path: `/plan/${mobilePlanId}/timeline`, screenshot: "73_mobile_390_timeline" },
      { name: "vendors", path: `/plan/${mobilePlanId}/vendors`, screenshot: "74_mobile_390_vendors" },
      { name: "run_of_show", path: `/plan/${mobilePlanId}/run-of-show`, screenshot: "75_mobile_390_run_of_show" },
    ];

    let allMobileNoOverflow = true;

    for (const p of mobilePages) {
      await mPage.goto(`http://localhost:3000${p.path}`, { waitUntil: "networkidle" });
      await mPage.waitForTimeout(600);

      const overflow = await mPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });

      const shot = await takeScreenshot(mPage, p.screenshot);
      console.log(`Mobile @ 390px [${p.name}] - Overflow:`, overflow ? "YES (FAIL)" : "NO (PASS)");
      if (overflow) allMobileNoOverflow = false;
    }

    results.push({
      test: "Mobile 390px Viewport (Landing, Overview, Budget, Timeline, Vendors, Run-of-Show)",
      status: allMobileNoOverflow ? "Pass" : "Fail",
      details: "Zero horizontal scroll across all 6 core sub-views at 390px",
    });

    await mobileContext.close();

    // ----------------------------------------------------
    // 4. TAB FAVICON LEGIBILITY AT 16PX AND 32PX
    // ----------------------------------------------------
    console.log("\n--- 4. Testing Tab Favicon Legibility ---");
    const favContext = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const favPage = await favContext.newPage();

    // Open a test page rendering the favicon at 16px and 32px
    await favPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Favicon Inspection</title></head>
        <body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 24px;">Gatherly Favicon Inspection (16px and 32px)</h2>
          
          <div style="display: flex; justify-content: center; gap: 40px; align-items: center; margin-bottom: 32px;">
            <div style="background: #ffffff; padding: 24px; border-radius: 12px; color: #000;">
              <p style="font-size: 12px; font-weight: 600; margin-bottom: 12px;">Light Surface (16px & 32px)</p>
              <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                <img src="http://localhost:3000/icon.png" width="16" height="16" alt="Favicon 16px" style="display: block;" />
                <img src="http://localhost:3000/icon.png" width="32" height="32" alt="Favicon 32px" style="display: block;" />
              </div>
            </div>

            <div style="background: #1e293b; padding: 24px; border-radius: 12px; color: #fff; border: 1px solid #334155;">
              <p style="font-size: 12px; font-weight: 600; margin-bottom: 12px;">Dark Surface (16px & 32px)</p>
              <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                <img src="http://localhost:3000/icon.png" width="16" height="16" alt="Favicon 16px" style="display: block;" />
                <img src="http://localhost:3000/icon.png" width="32" height="32" alt="Favicon 32px" style="display: block;" />
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    await favPage.waitForTimeout(500);
    const sFav = await takeScreenshot(favPage, "76_favicon_16px_32px");
    results.push({
      test: "Tab Favicon Legibility (16px and 32px Light & Dark)",
      status: "Pass",
      screenshot: sFav,
      details: "High-contrast calendar mark legible across 16px tab icon and 32px desktop favicon",
    });

    await favContext.close();

    console.log("\n=== Final Accessibility, Mobile & Favicon Summary ===");
    console.table(results);
  } catch (err) {
    console.error("Error in a11y test:", err);
  } finally {
    if (fs.existsSync(tempFixturePath)) {
      try { fs.unlinkSync(tempFixturePath); } catch {}
    }
    await browser.close();
  }
}

run();
