/**
 * @jest-environment jsdom
 * @module intake-a11y.test
 * @purpose Accessibility tests for IntakeSection:
 *          - Zero axe violations on initial render
 *          - Form has a properly labelled textarea
 *          - Submit button is present and labelled
 *          - Example prompt chips are accessible buttons
 *          - Error state (with role=alert) has zero axe violations
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { IntakeSection } from "@/components/intake/IntakeSection";

expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock("@/store", () => ({
  useGatherlyStore: () => ({
    createEvent: jest.fn().mockReturnValue("new-event-id"),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("IntakeSection Accessibility", () => {
  it("has zero axe violations on initial render", async () => {
    const { container } = render(<IntakeSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has a labelled textarea for event description", () => {
    render(<IntakeSection />);
    const textarea = screen.getByRole("textbox", { name: /describe your event in your own words/i });
    expect(textarea).toBeDefined();
    expect(textarea.getAttribute("id")).toBe("event-description-input");
  });

  it("has a submit button with accessible label", () => {
    render(<IntakeSection />);
    const submitBtn = screen.getByRole("button", { name: /continue to profile review/i });
    expect(submitBtn).toBeDefined();
  });

  it("renders example prompt chips as accessible buttons", () => {
    render(<IntakeSection />);
    // Should find 3 example prompt chips
    const weddingChip = screen.getByRole("button", { name: /120-Guest Wedding/i });
    const birthdayChip = screen.getByRole("button", { name: /7th Birthday Party/i });
    const fairChip = screen.getByRole("button", { name: /Community Summer Fair/i });
    expect(weddingChip).toBeDefined();
    expect(birthdayChip).toBeDefined();
    expect(fairChip).toBeDefined();
  });

  it("has labelled currency and language select inputs", () => {
    render(<IntakeSection />);
    const currencySelect = screen.getByRole("combobox", { name: /default currency/i });
    const languageSelect = screen.getByRole("combobox", { name: /plan output language/i });
    expect(currencySelect).toBeDefined();
    expect(languageSelect).toBeDefined();
  });

  it("populates textarea when clicking example chip", () => {
    render(<IntakeSection />);
    const weddingChip = screen.getByRole("button", { name: /120-Guest Wedding/i });
    fireEvent.click(weddingChip);
    const textarea = screen.getByRole("textbox", { name: /describe your event/i }) as HTMLTextAreaElement;
    expect(textarea.value).toContain("wedding");
  });

  it("shows error alert with zero axe violations if submitted with too short text", async () => {
    const { container } = render(<IntakeSection />);
    const textarea = screen.getByRole("textbox", { name: /describe your event/i });
    fireEvent.change(textarea, { target: { value: "abc" } });

    const submitBtn = screen.getByRole("button", { name: /continue to profile review/i });
    fireEvent.click(submitBtn);

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain("describe your event");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("submits description and transitions to profile review upon success", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          id: "extracted_1",
          type: "wedding",
          title: "My Extracted Wedding",
          eventDate: "2027-06-20",
          location: "Garden Pavilion",
          guestCount: 100,
          budgetMinor: 2500000,
          currency: "USD",
          language: "en",
        },
      }),
    } as Response);

    try {
      const { container } = render(<IntakeSection />);
      const weddingChip = screen.getByRole("button", { name: /120-Guest Wedding/i });
      fireEvent.click(weddingChip);

      const submitBtn = screen.getByRole("button", { name: /continue to profile review/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByText("Review Your Event Profile")).toBeDefined();
      expect(screen.getByDisplayValue("My Extracted Wedding")).toBeDefined();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("handles intake API failure with error alert and zero axe violations", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Rate limit exceeded" }),
    } as Response);

    try {
      const { container } = render(<IntakeSection />);
      const textarea = screen.getByRole("textbox", { name: /describe your event/i });
      fireEvent.change(textarea, { target: { value: "A big community event on Saturday with music." } });

      const submitBtn = screen.getByRole("button", { name: /continue to profile review/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("Rate limit exceeded");

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
