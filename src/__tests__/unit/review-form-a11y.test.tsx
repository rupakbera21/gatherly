/**
 * @jest-environment jsdom
 * @module review-form-a11y.test
 * @purpose Component and accessibility tests for ProfileReviewForm:
 *          - Zero axe violations in populated, loading, and error states
 *          - Field validation (required title, date, positive budget)
 *          - Type-specific extras rendering (wedding, birthday, community)
 *          - onConfirm and onCancel callbacks
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ProfileReviewForm } from "@/components/intake/ProfileReviewForm";
import { EventProfile } from "@/domain/types";

expect.extend(toHaveNoViolations);

const sampleWeddingProfile: EventProfile = {
  id: "prof_wedding",
  type: "wedding",
  title: "Sophie & Liam's Wedding",
  eventDate: "2027-08-15",
  location: "Sunset Botanical Gardens",
  guestCount: 120,
  budgetMinor: 3500000,
  currency: "USD",
  language: "en",
  weddingExtras: {
    tradition: "Modern Rustic",
    accommodationsNeeded: true,
    functions: [],
  },
};

const sampleBirthdayProfile: EventProfile = {
  id: "prof_bday",
  type: "birthday",
  title: "Leo's 7th Birthday Party",
  eventDate: "2026-12-05",
  location: "Discovery Science Center",
  guestCount: 25,
  budgetMinor: 80000,
  currency: "USD",
  language: "en",
  birthdayExtras: {
    ageGroup: "7th Birthday",
    allergens: ["peanuts"],
  },
};

const sampleCommunityProfile: EventProfile = {
  id: "prof_comm",
  type: "community",
  title: "Greenwood Summer Festival",
  eventDate: "2027-07-04",
  location: "Greenwood Central Park",
  guestCount: 500,
  budgetMinor: 500000,
  currency: "USD",
  language: "en",
  communityExtras: {
    permitRequired: true,
    volunteerCount: 20,
    isFree: true,
    sponsorTargetMinor: 0,
  },
};

describe("ProfileReviewForm Accessibility and States", () => {
  it("has zero axe violations in populated wedding state", async () => {
    const { container } = render(
      <ProfileReviewForm
        initialProfile={sampleWeddingProfile}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has zero axe violations in loading state", async () => {
    const { container } = render(
      <ProfileReviewForm
        initialProfile={sampleWeddingProfile}
        onConfirm={jest.fn()}
        isLoading={true}
      />
    );
    expect(screen.getByText(/generating plan/i)).toBeDefined();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("displays validation errors and maintains zero axe violations", async () => {
    const { container } = render(
      <ProfileReviewForm
        initialProfile={{ ...sampleWeddingProfile, title: "", eventDate: "" }}
        onConfirm={jest.fn()}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /generate full plan/i });
    act(() => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText(/event title is required/i)).toBeDefined();
    expect(screen.getByText(/event date is required/i)).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("calls onConfirm with updated profile values upon valid submission", () => {
    const onConfirm = jest.fn();
    render(
      <ProfileReviewForm
        initialProfile={sampleWeddingProfile}
        onConfirm={onConfirm}
      />
    );

    const titleInput = screen.getByLabelText(/event title/i);
    act(() => {
      fireEvent.change(titleInput, { target: { value: "Updated Wedding Title" } });
    });

    const submitBtn = screen.getByRole("button", { name: /generate full plan/i });
    act(() => {
      fireEvent.click(submitBtn);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].title).toBe("Updated Wedding Title");
  });

  it("calls onCancel when back button is clicked", () => {
    const onCancel = jest.fn();
    render(
      <ProfileReviewForm
        initialProfile={sampleWeddingProfile}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    const backBtn = screen.getByRole("button", { name: /back/i });
    act(() => {
      fireEvent.click(backBtn);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders birthday extras accurately with zero axe violations", async () => {
    const { container } = render(
      <ProfileReviewForm
        initialProfile={sampleBirthdayProfile}
        onConfirm={jest.fn()}
      />
    );
    expect(screen.getByLabelText(/age group/i)).toBeDefined();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders community extras accurately with zero axe violations", async () => {
    const { container } = render(
      <ProfileReviewForm
        initialProfile={sampleCommunityProfile}
        onConfirm={jest.fn()}
      />
    );
    expect(screen.getByLabelText(/city \/ park permit required/i)).toBeDefined();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
