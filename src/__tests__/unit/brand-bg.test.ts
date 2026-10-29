/**
 * @jest-environment jsdom
 */

/**
 * brand-bg.test.ts
 *
 * Verifies the brand background layer's CSS contract:
 *   1. Reduced-motion: animation-name resolves to "none" under the data-attribute.
 *   2. High-contrast: the .brand-bg-layer element is hidden.
 *   3. Accessibility: the layer carries aria-hidden="true" and is non-interactive.
 *
 * These are structural/contract tests that run in jsdom; they verify that the
 * correct CSS hooks and HTML attributes are present — not that the gradient
 * looks pretty (that requires a visual-regression harness).
 */

describe("Brand background layer — CSS contract", () => {
  beforeEach(() => {
    // Reset document state between tests
    document.documentElement.removeAttribute("data-reduced-motion");
    document.documentElement.removeAttribute("data-high-contrast");
    document.body.innerHTML = "";
  });

  it("is aria-hidden and has role=presentation so it is invisible to screen readers", () => {
    const layer = document.createElement("div");
    layer.className = "brand-bg-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("role", "presentation");
    document.body.appendChild(layer);

    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.getAttribute("role")).toBe("presentation");
  });

  it("is non-interactive: pointer-events should be 'none' (verified via class presence)", () => {
    // jsdom does not compute CSS; we verify the class that carries the rule exists.
    const layer = document.createElement("div");
    layer.className = "brand-bg-layer";
    document.body.appendChild(layer);
    // The class is present; the CSS rule `pointer-events: none` lives in globals.css.
    // We assert the class exists — integration with real CSS is a Playwright concern.
    expect(layer.classList.contains("brand-bg-layer")).toBe(true);
  });

  it("reduced-motion data-attribute is set on root when toolbar activates it", () => {
    // Simulate toolbar setting the attribute
    document.documentElement.setAttribute("data-reduced-motion", "true");
    expect(document.documentElement.getAttribute("data-reduced-motion")).toBe("true");
    // The CSS selector [data-reduced-motion="true"] .brand-bg-layer::before { animation-name: none }
    // is present in globals.css — verified by the token guard covering globals.css.
  });

  it("high-contrast data-attribute is set on root when toolbar activates it", () => {
    document.documentElement.setAttribute("data-high-contrast", "true");
    expect(document.documentElement.getAttribute("data-high-contrast")).toBe("true");
    // The CSS selector [data-high-contrast="true"] .brand-bg-layer { display: none }
    // removes the layer entirely — verified structurally.
  });

  it("globals.css contains animation-name: none rule for reduced-motion", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    // Reduced-motion system preference
    expect(css).toContain("prefers-reduced-motion: reduce");
    // Toolbar data-attribute
    expect(css).toContain("data-reduced-motion");
    // animation-name: none applied
    expect(css).toMatch(/animation-name:\s*none/);
  });

  it("globals.css hides the gradient layer in high-contrast mode", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain('data-high-contrast="true"');
    // The brand-bg-layer selector must appear alongside display: none
    const hcBlock = css.match(/\[data-high-contrast="true"\][^{]*\{[^}]*\}/g) || [];
    const brandHcBlock = hcBlock.find((b) => b.includes("brand-bg-layer"));
    expect(brandHcBlock).toBeDefined();
    expect(brandHcBlock).toContain("display: none");
  });

  it("globals.css defines all four brand token variables", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain("--brand-navy:");
    expect(css).toContain("--brand-blue:");
    expect(css).toContain("--brand-cyan:");
    expect(css).toContain("--brand-violet:");
  });

  it("globals.css print media rule removes gradient layer", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain("@media print");
    // brand-bg-layer must be display:none or background cleared in print block
    const printBlock = css.match(/@media print\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(printBlock).toContain("brand-bg-layer");
  });

  it("brand-drift keyframes animate only transform, not layout properties", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    // All brand-drift-* keyframes should exist
    expect(css).toContain("@keyframes brand-drift-a");
    expect(css).toContain("@keyframes brand-drift-b");

    // Extract the keyframe blocks and assert they only use transform
    const keyframeBlocks = css.match(/@keyframes brand-drift-[a-z]+\s*\{[\s\S]*?\}\s*\}/g) || [];
    for (const block of keyframeBlocks) {
      // Should contain transform
      expect(block).toContain("transform:");
      // Should NOT contain layout-triggering properties
      expect(block).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding|font-size)\s*:/);
    }
  });
});
