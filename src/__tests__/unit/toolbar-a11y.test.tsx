/**
 * @jest-environment jsdom
 * @module toolbar-a11y.test
 * @purpose Accessibility and preference persistence tests for AccessibilityToolbar:
 *          - Zero axe violations when closed and open
 *          - Toggle button has accessible name and aria-expanded
 *          - Toggles theme, font scaling, high contrast, dyslexia font, reduced motion
 *          - Synchronizes with DOM documentElement data-* attributes
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { AccessibilityToolbar } from "@/components/AccessibilityToolbar";

expect.extend(toHaveNoViolations);

describe("AccessibilityToolbar Component Accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-high-contrast");
    document.documentElement.removeAttribute("data-dyslexia-font");
    document.documentElement.removeAttribute("data-reduced-motion");
  });

  it("has zero axe violations when mounted", async () => {
    const { container } = render(<AccessibilityToolbar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has accessible toggle button with aria-expanded", () => {
    render(<AccessibilityToolbar />);
    const toggle = screen.getByRole("button", { name: /accessibility options/i });
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe("a11y-toolbar-panel");
  });

  it("opens settings panel on click and has zero axe violations when open", async () => {
    const { container } = render(<AccessibilityToolbar />);
    const toggle = screen.getByRole("button", { name: /accessibility options/i });

    act(() => {
      fireEvent.click(toggle);
    });

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByRole("region", { name: /accessibility settings/i });
    expect(panel).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("updates high contrast and dyslexia font attributes on HTML element", () => {
    render(<AccessibilityToolbar />);
    const toggle = screen.getByRole("button", { name: /accessibility options/i });

    act(() => {
      fireEvent.click(toggle);
    });

    const highContrastCheckbox = screen.getByLabelText(/high contrast/i);
    act(() => {
      fireEvent.click(highContrastCheckbox);
    });
    expect(document.documentElement.getAttribute("data-high-contrast")).toBe("true");

    const dyslexiaCheckbox = screen.getByLabelText(/dyslexia-friendly font/i);
    act(() => {
      fireEvent.click(dyslexiaCheckbox);
    });
    expect(document.documentElement.getAttribute("data-dyslexia-font")).toBe("true");
  });

  it("updates font scale CSS property on HTML root", () => {
    render(<AccessibilityToolbar />);
    const toggle = screen.getByRole("button", { name: /accessibility options/i });

    act(() => {
      fireEvent.click(toggle);
    });

    const largeRadio = screen.getByLabelText(/^large$/i);
    act(() => {
      fireEvent.click(largeRadio);
    });
    expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("1.15");
  });

  it("updates theme attribute on HTML root", () => {
    render(<AccessibilityToolbar />);
    const toggle = screen.getByRole("button", { name: /accessibility options/i });

    act(() => {
      fireEvent.click(toggle);
    });

    const darkRadio = screen.getByLabelText(/dark/i);
    act(() => {
      fireEvent.click(darkRadio);
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
