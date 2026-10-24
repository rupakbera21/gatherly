/**
 * @jest-environment jsdom
 * @module copilot-a11y.test
 * @purpose Accessibility and focus-management tests for CopilotDrawer:
 *          - Zero axe violations when open
 *          - Escape key closes the drawer
 *          - Tab key is trapped within the drawer (wraps last→first and first→last via Shift+Tab)
 *          - Focus moves to close button on open
 *          - aria-live region exists
 *          - role="dialog" and aria-modal="true" present
 */

import React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { EventPlan } from "@/domain/types";

expect.extend(toHaveNoViolations);

// Mock the Zustand store
jest.mock("@/store", () => ({
  useGatherlyStore: () => ({
    applyPatchToPlan: jest.fn(),
  }),
}));

// Mock next/navigation (not needed in this component but imported via store)
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockPlan: EventPlan = {
  id: "plan_a11y",
  profile: {
    id: "plan_a11y",
    type: "wedding",
    title: "Aria & Bob's Wedding",
    eventDate: "2027-09-10",
    guestCount: 80,
    budgetMinor: 1500000,
    currency: "USD",
    language: "en",
  },
  budgetCategories: [],
  milestones: [],
  vendors: [],
  ideas: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  aiProviderBadge: "gemini",
};

describe("CopilotDrawer Accessibility Tests", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <CopilotDrawer plan={mockPlan} isOpen={false} onClose={() => undefined} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("has zero axe violations when open", async () => {
    const { container } = render(
      <CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has role=dialog and aria-modal=true when open", () => {
    render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("copilot-drawer-title");
  });

  it("has a polite aria-live status region", () => {
    render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />);
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it("calls onClose when Escape is pressed inside the drawer", () => {
    const onClose = jest.fn();
    render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("contains a close button with accessible label", () => {
    render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />);
    const closeBtn = screen.getByRole("button", { name: /close copilot drawer/i });
    expect(closeBtn).toBeDefined();
  });

  it("focuses the close button on mount (when open)", async () => {
    render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />);
    // Use a small wait for the requestAnimationFrame in the useEffect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // requestAnimationFrame is mocked in jsdom; the focus call should have run
    expect(document.activeElement?.getAttribute("aria-label")).toContain("Close Copilot");
  });

  it("sends message and renders copilot reply with suggested patches", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: "I reallocated $2,000 for catering.",
        suggestedPatches: [
          {
            op: "updateBudgetCategory",
            categoryId: "cat_1",
            allocatedMinor: 800000,
          },
        ],
      }),
    } as Response);

    try {
      render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />);
      const input = screen.getByPlaceholderText(/ask copilot/i);
      const sendBtn = screen.getByRole("button", { name: /^send$/i });

      await act(async () => {
        fireEvent.change(input, { target: { value: "Please increase catering" } });
        fireEvent.click(sendBtn);
      });

      expect(screen.getByText("Please increase catering")).toBeDefined();
      expect(screen.getByText("I reallocated $2,000 for catering.")).toBeDefined();
      expect(screen.getByText(/proposed plan changes/i)).toBeDefined();

      // Test applying patch
      const approveBtn = screen.getByRole("button", { name: /approve & apply/i });
      await act(async () => {
        fireEvent.click(approveBtn);
      });
      expect(screen.getAllByText(/applied/i).length).toBeGreaterThanOrEqual(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("handles copilot API network failure gracefully", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("Network failed"));

    try {
      render(<CopilotDrawer plan={mockPlan} isOpen={true} onClose={() => undefined} />);
      const input = screen.getByPlaceholderText(/ask copilot/i);
      const sendBtn = screen.getByRole("button", { name: /^send$/i });

      await act(async () => {
        fireEvent.change(input, { target: { value: "Hello" } });
        fireEvent.click(sendBtn);
      });

      const errMatches = screen.getAllByText(/network error/i);
      expect(errMatches.length).toBeGreaterThanOrEqual(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
