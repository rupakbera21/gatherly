/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { WeddingExtras } from "@/components/extras/WeddingExtras";
import { BirthdayExtras } from "@/components/extras/BirthdayExtras";
import { CommunityExtras } from "@/components/extras/CommunityExtras";
import { EventPlan } from "@/domain/types";

expect.extend(toHaveNoViolations);

const mockPlan: EventPlan = {
  id: "evt_test",
  profile: {
    id: "evt_test",
    type: "wedding",
    title: "Test Wedding Celebration",
    eventDate: "2026-10-31",
    location: "Grand Manor",
    guestCount: 120,
    budgetMinor: 2500000,
    currency: "USD",
    language: "en",
  },
  budgetCategories: [],
  milestones: [],
  vendors: [],
  ideas: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  aiProviderBadge: "gemini",
};

describe("Event-Type Specific Extras Components", () => {
  describe("WeddingExtras", () => {
    it("renders table seating, dietary tally, and photography shot list", () => {
      const { getByText } = render(<WeddingExtras plan={mockPlan} />);
      expect(getByText("Table Seating Plan")).toBeTruthy();
      expect(getByText("Dietary & Catering Breakdown")).toBeTruthy();
      expect(getByText(/Day-of Photography Shot List/)).toBeTruthy();
    });

    it("has no critical accessibility violations", async () => {
      const { container } = render(<WeddingExtras plan={mockPlan} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("BirthdayExtras", () => {
    it("renders cake sizing, playlist curve, and age-bracket entertainment", () => {
      const birthdayPlan: EventPlan = {
        ...mockPlan,
        profile: { ...mockPlan.profile, type: "birthday", guestCount: 45 },
      };
      const { getByText } = render(<BirthdayExtras plan={birthdayPlan} />);
      expect(getByText("Cake Order & Sizing Calculator")).toBeTruthy();
      expect(getByText("Party Vibe Curve & DJ Cues")).toBeTruthy();
      expect(getByText("Age-Group Activity & Entertainment Guide")).toBeTruthy();
    });

    it("has no critical accessibility violations", async () => {
      const birthdayPlan: EventPlan = {
        ...mockPlan,
        profile: { ...mockPlan.profile, type: "birthday" },
      };
      const { container } = render(<BirthdayExtras plan={birthdayPlan} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("CommunityExtras", () => {
    it("renders permits checklist, volunteer shift roster, and rain plan", () => {
      const communityPlan: EventPlan = {
        ...mockPlan,
        profile: { ...mockPlan.profile, type: "community", guestCount: 300 },
      };
      const { getByText } = render(<CommunityExtras plan={communityPlan} />);
      expect(getByText("Municipal Permits")).toBeTruthy();
      expect(getByText("Volunteer Roster")).toBeTruthy();
      expect(getByText("Weather Protocol")).toBeTruthy();
      expect(getByText("Municipal Ordinance & Regulatory Compliance")).toBeTruthy();
    });

    it("has no critical accessibility violations", async () => {
      const communityPlan: EventPlan = {
        ...mockPlan,
        profile: { ...mockPlan.profile, type: "community" },
      };
      const { container } = render(<CommunityExtras plan={communityPlan} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
