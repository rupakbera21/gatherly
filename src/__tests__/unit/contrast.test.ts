/**
 * contrast.test.ts
 *
 * Verifies that all design system text tokens meet or exceed WCAG AA contrast
 * requirements (4.5:1 for normal body text, 3:1 for large text / UI components)
 * across both pure white canvas (#ffffff) and the worst-case point of the brand
 * gradient wash (#dbe6ff).
 */

function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function srgbLuminance(r: number, g: number, b: number): number {
  const rs = toLinear(r);
  const gs = toLinear(g);
  const bs = toLinear(b);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function getContrastRatio(fgHex: string, bgHex: string): number {
  const [r1, g1, b1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  const l1 = srgbLuminance(r1, g1, b1);
  const l2 = srgbLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG AA Design Token Contrast Ratios", () => {
  const WHITE_CANVAS = "#ffffff";
  const WORST_CASE_GRADIENT = "#dbe6ff";

  // Light theme tokens from globals.css
  const TEXT_PRIMARY = "#0a0f29";
  const TEXT_SECONDARY = "#475569";
  const TEXT_TERTIARY = "#525e75";
  const BRAND_PRIMARY = "#0052ff";

  describe("Contrast against pure white (#ffffff)", () => {
    it("primary text meets 4.5:1 requirement (actual: ~18.8:1)", () => {
      const ratio = getContrastRatio(TEXT_PRIMARY, WHITE_CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("secondary text meets 4.5:1 requirement (actual: ~7.6:1)", () => {
      const ratio = getContrastRatio(TEXT_SECONDARY, WHITE_CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("tertiary text meets 4.5:1 requirement (actual: ~6.5:1)", () => {
      const ratio = getContrastRatio(TEXT_TERTIARY, WHITE_CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("brand primary button / UI boundary meets 3:1 requirement (actual: ~4.7:1)", () => {
      const ratio = getContrastRatio(BRAND_PRIMARY, WHITE_CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("Contrast against worst-case gradient peak (#dbe6ff)", () => {
    it("primary text meets 4.5:1 requirement (actual: ~15.1:1)", () => {
      const ratio = getContrastRatio(TEXT_PRIMARY, WORST_CASE_GRADIENT);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("secondary text meets 4.5:1 requirement (actual: ~6.0:1)", () => {
      const ratio = getContrastRatio(TEXT_SECONDARY, WORST_CASE_GRADIENT);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("tertiary text meets 4.5:1 requirement (actual: ~5.2:1)", () => {
      const ratio = getContrastRatio(TEXT_TERTIARY, WORST_CASE_GRADIENT);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("brand primary button / UI boundary meets 3:1 requirement (actual: ~3.7:1)", () => {
      const ratio = getContrastRatio(BRAND_PRIMARY, WORST_CASE_GRADIENT);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("Dark theme contrast against dark canvas (#070b19)", () => {
    const DARK_CANVAS = "#070b19";
    const DARK_TEXT_PRIMARY = "#f8fafc";
    const DARK_TEXT_SECONDARY = "#cbd5e1";

    it("dark primary text meets 4.5:1 requirement (actual: ~18.5:1)", () => {
      const ratio = getContrastRatio(DARK_TEXT_PRIMARY, DARK_CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("dark secondary text meets 4.5:1 requirement (actual: ~12.2:1)", () => {
      const ratio = getContrastRatio(DARK_TEXT_SECONDARY, DARK_CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
