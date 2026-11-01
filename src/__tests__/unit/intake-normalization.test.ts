/**
 * @module intake-normalization.test
 * @purpose Unit tests for EventProfile and intake schema normalization:
 *          - Strings coerced to numbers (e.g. "150" -> 150)
 *          - Wrong enum casing (e.g. "WEDDING" -> "wedding")
 *          - Nulls and blanks mapped to undefined
 *          - Missing optionals default safely
 *          - Loose LLM keys mapped (eventType -> type)
 *          - Unrepairable inputs (invalid date format, negative counts) cleanly rejected
 */

import { IntakeResultSchema, normalizeEventProfileOutput } from "@/services/ai/prompts/intake";

describe("Intake Normalization & Schema Repair Unit Tests", () => {
  it("normalizes loose model output with strings for numbers, uppercase enum, and nulls", () => {
    const looseOutput = {
      type: "WEDDING",
      title: "Priya & Rahul Wedding",
      eventDate: "2027-11-20",
      location: null,
      guestCount: "250",
      budgetMinor: "50000000",
      currency: "inr",
      weddingExtras: {
        functions: ["Sangeet", "Mehendi", "Reception"],
        tradition: null,
        accommodationsNeeded: "true",
        notes: null,
      },
    };

    const parsed = IntakeResultSchema.safeParse(looseOutput);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.type).toBe("wedding");
    expect(parsed.data.guestCount).toBe(250);
    expect(parsed.data.budgetMinor).toBe(50000000);
    expect(parsed.data.currency).toBe("INR");
    expect(parsed.data.location).toBeUndefined();
    expect(parsed.data.weddingExtras?.accommodationsNeeded).toBe(true);
    expect(parsed.data.weddingExtras?.tradition).toBeUndefined();
  });

  it("normalizes birthday event with loose numbers and string representations", () => {
    const looseBirthday = {
      type: "Birthday Party",
      title: "Rohan 10th Birthday",
      eventDate: "2027-05-15",
      guestCount: "35",
      budgetMinor: "45,000",
      birthdayExtras: {
        ageGroup: "10 years",
        allergens: ["peanuts"],
        notes: null,
      },
    };

    const parsed = IntakeResultSchema.safeParse(looseBirthday);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.type).toBe("birthday");
    expect(parsed.data.guestCount).toBe(35);
    expect(parsed.data.budgetMinor).toBe(45000);
  });

  it("normalizes community event with string volunteers, null notes, and booleans", () => {
    const looseCommunity = {
      type: "community",
      title: "Eco Fair & Park Clean",
      eventDate: "2027-06-01",
      guestCount: 200,
      budgetMinor: 100000,
      communityExtras: {
        isFree: "true",
        permitRequired: "false",
        volunteerCount: "40",
        sponsorTargetMinor: "50000",
        notes: null,
      },
    };

    const parsed = IntakeResultSchema.safeParse(looseCommunity);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.communityExtras?.volunteerCount).toBe(40);
    expect(parsed.data.communityExtras?.sponsorTargetMinor).toBe(50000);
    expect(parsed.data.communityExtras?.isFree).toBe(true);
    expect(parsed.data.communityExtras?.permitRequired).toBe(false);
  });

  it("maps eventType alias to type", () => {
    const raw = {
      eventType: "Wedding Celebration",
      title: "Sam & Jordan",
      eventDate: "2027-09-10",
      guestCount: 100,
      budgetMinor: 1500000,
    };

    const normalized = normalizeEventProfileOutput(raw) as Record<string, unknown>;
    expect(normalized.type).toBe("wedding");

    const parsed = IntakeResultSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("rejects unrepairable invalid date formats", () => {
    const invalidDate = {
      type: "wedding",
      title: "Test Wedding",
      eventDate: "invalid-date-string",
      guestCount: 100,
      budgetMinor: 100000,
    };

    const parsed = IntakeResultSchema.safeParse(invalidDate);
    expect(parsed.success).toBe(false);
  });

  it("rejects unrepairable negative guest counts", () => {
    const negativeGuests = {
      type: "wedding",
      title: "Test Wedding",
      eventDate: "2027-10-10",
      guestCount: -5,
      budgetMinor: 100000,
    };

    const parsed = IntakeResultSchema.safeParse(negativeGuests);
    expect(parsed.success).toBe(false);
  });

  it("rejects missing title or empty string", () => {
    const missingTitle = {
      type: "wedding",
      title: "",
      eventDate: "2027-10-10",
      guestCount: 50,
      budgetMinor: 100000,
    };

    const parsed = IntakeResultSchema.safeParse(missingTitle);
    expect(parsed.success).toBe(false);
  });
});
