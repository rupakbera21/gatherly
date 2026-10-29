import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function runAudit(url, preset, outputPath) {
  const flags = [
    `--chrome-flags="--headless=new --no-sandbox"`,
    `--output=json`,
    `--output-path="${outputPath}"`,
    `--only-categories=performance,accessibility,best-practices,seo`,
    preset === "desktop" ? `--preset=desktop` : `--form-factor=mobile --screenEmulation.mobile=true`,
  ].join(" ");

  const cmd = `npx lighthouse ${url} ${flags}`;
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", timeout: 120000 });
    const raw = fs.readFileSync(outputPath, "utf-8");
    const report = JSON.parse(raw);
    const perf = Math.round((report.categories.performance?.score || 0) * 100);
    const a11y = Math.round((report.categories.accessibility?.score || 0) * 100);
    const bp = Math.round((report.categories["best-practices"]?.score || 0) * 100);
    const seo = Math.round((report.categories.seo?.score || 0) * 100);
    const cls = report.audits["cumulative-layout-shift"]?.numericValue ?? 0;
    
    // Find logo network transfer size
    const networkItems = report.audits["network-requests"]?.details?.items || [];
    const logoRequest = networkItems.find(item => item.url.includes("logo") || item.url.includes("icon"));
    const logoSize = logoRequest ? `${Math.round(logoRequest.transferSize / 1024)} KB` : "N/A";

    return {
      url,
      preset,
      performance: perf,
      accessibility: a11y,
      bestPractices: bp,
      seo,
      cls: Math.round(cls * 1000) / 1000,
      logoTransferSize: logoSize,
    };
  } catch (err) {
    console.error(`Audit failed for ${url} (${preset}):`, err.message);
    return null;
  }
}

async function main() {
  const results = [];
  const report1 = await runAudit("http://localhost:3000/", "mobile", "temp_lh_landing_mobile.json");
  if (report1) results.push(report1);

  const report2 = await runAudit("http://localhost:3000/", "desktop", "temp_lh_landing_desktop.json");
  if (report2) results.push(report2);

  const report3 = await runAudit("http://localhost:3000/events", "mobile", "temp_lh_events_mobile.json");
  if (report3) results.push(report3);

  const report4 = await runAudit("http://localhost:3000/events", "desktop", "temp_lh_events_desktop.json");
  if (report4) results.push(report4);

  console.log("\n=== Lighthouse Performance & Quality Audit Summary ===");
  console.table(results);

  // Clean temp json files
  ["temp_lh_landing_mobile.json", "temp_lh_landing_desktop.json", "temp_lh_events_mobile.json", "temp_lh_events_desktop.json"].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}

main();
