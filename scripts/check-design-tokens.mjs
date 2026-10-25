/**
 * scripts/check-design-tokens.mjs
 * Design Consistency Enforcer for Gatherly.
 *
 * Verifies that component and route source code strictly complies with the design system:
 * 1. ZERO raw hex (#...), rgb(...), or hsl(...) color values.
 * 2. ZERO arbitrary Tailwind classes ([#...], text-[...px], w-[...px], etc.).
 * 3. ZERO emoji characters in component source code (all icons must be SVG via Icon primitive).
 *
 * Excluded from scan:
 * - src/app/globals.css (design tokens definition file)
 * - src/__tests__/ (test files and mocks)
 * - src/domain/ (domain models, math and RFC parsers)
 */

import fs from "fs";
import path from "path";

const SCAN_DIRS = ["src/components", "src/app"];
const EXCLUDED_FILES = [
  path.normalize("src/app/globals.css"),
];

// Documented allowlist for exceptional constants
const ALLOWLIST = [
  // Next.js viewport metadata themeColor requires static hex string in HTML head:
  path.normalize("src/app/layout.tsx"),
];

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== "node_modules" && item !== ".next" && item !== "__tests__") {
        files.push(...walk(fullPath));
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(item)) {
      files.push(fullPath);
    }
  }
  return files;
}

const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3,8})\b/g;
const RGB_HSL_REGEX = /\b(?:rgb|hsl)a?\s*\([^)]+\)/gi;
const ARBITRARY_TAILWIND_REGEX = /\b(?:text|bg|border|w|h|p|m|gap|top|bottom|left|right|min-w|min-h|max-w|max-h)-\[[^\]]+\]/g;
const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

let violations = [];

const allFiles = SCAN_DIRS.flatMap(walk).filter(
  (f) => !EXCLUDED_FILES.includes(path.normalize(f))
);

for (const file of allFiles) {
  if (ALLOWLIST.includes(path.normalize(file))) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Check raw hex colors
    let match;
    while ((match = HEX_COLOR_REGEX.exec(line)) !== null) {
      violations.push({
        file,
        line: lineNum,
        type: "RAW_HEX_COLOR",
        detail: `Found raw hex "${match[0]}" – must use token variable or utility class`,
        snippet: line.trim(),
      });
    }

    // 2. Check raw rgb/hsl
    while ((match = RGB_HSL_REGEX.exec(line)) !== null) {
      violations.push({
        file,
        line: lineNum,
        type: "RAW_RGB_HSL_COLOR",
        detail: `Found raw color function "${match[0]}" – must use token variable`,
        snippet: line.trim(),
      });
    }

    // 3. Check arbitrary Tailwind brackets
    while ((match = ARBITRARY_TAILWIND_REGEX.exec(line)) !== null) {
      violations.push({
        file,
        line: lineNum,
        type: "ARBITRARY_TAILWIND_CLASS",
        detail: `Found arbitrary Tailwind bracket "${match[0]}" – must use design system token scale`,
        snippet: line.trim(),
      });
    }

    // 4. Check emoji in component source
    if (EMOJI_REGEX.test(line)) {
      const emojiMatch = line.match(EMOJI_REGEX);
      violations.push({
        file,
        line: lineNum,
        type: "EMOJI_CHARACTER",
        detail: `Found emoji "${emojiMatch ? emojiMatch[0] : ""}" – UI icons must use <Icon name="..." /> primitive`,
        snippet: line.trim(),
      });
    }
  });
}

if (violations.length > 0) {
  console.error(
    `\n❌ Design token consistency check FAILED with ${violations.length} violations:\n`
  );
  violations.forEach((v) => {
    console.error(
      `  ${v.file}:${v.line} [${v.type}] ${v.detail}\n    Line: "${v.snippet}"\n`
    );
  });
  process.exit(1);
} else {
  console.log(
    `✅ Design token consistency check PASSED across ${allFiles.length} files. Zero raw hex, arbitrary classes, or emojis found.`
  );
  process.exit(0);
}
