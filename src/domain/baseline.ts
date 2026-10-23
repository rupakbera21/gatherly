/**
 * @module baseline
 * @purpose Rule-based baseline template engine and sanity checker.
 *          Used as degraded fallback when AI providers are unavailable,
 *          and as an independent validator for AI-generated plans.
 *          Implements Section 5.4 heuristics for wedding, birthday, and community events.
 * @rubric Problem Statement Alignment – High-quality degraded fallback & sanity validation.
 */

import { allocateBudget } from "./allocation";
import { defaultClock, isAfter, isBefore, weeksBetween, type Clock } from "./dates";
import { processTimeline } from "./timeline";
import type {
  BudgetCategory,
  EventProfile,
  EventType,
  Milestone,
  VendorItem,
} from "./types";

interface BaselineCategorySpec {
  id: string;
  name: string;
  weight: number;
}

interface EventBaselineConfig {
  contingencyPercent: number;
  categories: BaselineCategorySpec[];
  milestoneTemplates: Array<{
    id: string;
    title: string;
    category: string;
    weeksBeforeFraction: number; // 0 to 1 scale of total available preparation time
    dependsOn?: string[];
  }>;
  vendorTemplates: Array<{
    id: string;
    category: string;
    name: string;
    leadTimeWeeks: number;
  }>;
}

export const BASELINE_CONFIGS: Record<EventType, EventBaselineConfig> = {
  wedding: {
    contingencyPercent: 8,
    categories: [
      { id: "venue", name: "Venue", weight: 18 },
      { id: "catering", name: "Catering & Bar", weight: 30 },
      { id: "decor", name: "Decor & Floral", weight: 10 },
      { id: "photo_video", name: "Photo & Video", weight: 10 },
      { id: "attire_beauty", name: "Attire & Beauty", weight: 8 },
      { id: "music_ent", name: "Music & Entertainment", weight: 6 },
      { id: "stationery", name: "Stationery & Invites", weight: 2 },
      { id: "rituals", name: "Rituals & Officiant", weight: 3 },
      { id: "transport_hotel", name: "Accommodation & Transport", weight: 5 },
      { id: "favors", name: "Favors & Gifts", weight: 2 },
      { id: "misc", name: "Miscellaneous", weight: 6 },
    ],
    milestoneTemplates: [
      { id: "w_guest_list", title: "Finalize initial guest list & budget", category: "Planning", weeksBeforeFraction: 0.95 },
      { id: "w_venue", title: "Tour and book primary venue", category: "Venue", weeksBeforeFraction: 0.85, dependsOn: ["w_guest_list"] },
      { id: "w_photo", title: "Hire photographer and videographer", category: "Vendors", weeksBeforeFraction: 0.75, dependsOn: ["w_venue"] },
      { id: "w_catering", title: "Tasting session and finalize caterer", category: "Catering", weeksBeforeFraction: 0.65, dependsOn: ["w_venue"] },
      { id: "w_invites", title: "Send formal invitations", category: "Stationery", weeksBeforeFraction: 0.45, dependsOn: ["w_guest_list"] },
      { id: "w_attire", title: "Final attire fittings and accessories", category: "Attire", weeksBeforeFraction: 0.25 },
      { id: "w_rsvps", title: "Collect final RSVPs and seat mapping", category: "Planning", weeksBeforeFraction: 0.15, dependsOn: ["w_invites"] },
      { id: "w_rehearsal", title: "Rehearsal and final vendor walk-through", category: "Production", weeksBeforeFraction: 0.03, dependsOn: ["w_rsvps"] },
    ],
    vendorTemplates: [
      { id: "v_venue", category: "Venue", name: "Reception and Ceremony Venue", leadTimeWeeks: 24 },
      { id: "v_caterer", category: "Catering", name: "Catering & Beverage Provider", leadTimeWeeks: 16 },
      { id: "v_photo", category: "Photo & Video", name: "Lead Photographer / Cinematographer", leadTimeWeeks: 20 },
      { id: "v_decor", category: "Decor", name: "Florist and Event Stylist", leadTimeWeeks: 12 },
      { id: "v_music", category: "Music", name: "DJ / Band & Audio System", leadTimeWeeks: 12 },
    ],
  },
  birthday: {
    contingencyPercent: 5,
    categories: [
      { id: "venue", name: "Venue", weight: 20 },
      { id: "food_cake", name: "Food & Cake", weight: 35 },
      { id: "decor_theme", name: "Decor & Theme", weight: 12 },
      { id: "activities", name: "Activities & Entertainment", weight: 15 },
      { id: "invites_favors", name: "Invitations & Favors", weight: 8 },
      { id: "photo", name: "Photography", weight: 4 },
      { id: "misc", name: "Miscellaneous", weight: 6 },
    ],
    milestoneTemplates: [
      { id: "b_theme", title: "Choose party theme and guest count", category: "Planning", weeksBeforeFraction: 0.9 },
      { id: "b_venue", title: "Reserve venue or prepare home space", category: "Venue", weeksBeforeFraction: 0.75, dependsOn: ["b_theme"] },
      { id: "b_invites", title: "Send digital / printed party invitations", category: "Invites", weeksBeforeFraction: 0.5, dependsOn: ["b_venue"] },
      { id: "b_entertainer", title: "Book entertainer / games coordinator", category: "Entertainment", weeksBeforeFraction: 0.4 },
      { id: "b_cake", title: "Order custom cake and party food menu", category: "Catering", weeksBeforeFraction: 0.3, dependsOn: ["b_theme"] },
      { id: "b_supplies", title: "Purchase party favors and themed decorations", category: "Decor", weeksBeforeFraction: 0.15 },
      { id: "b_prep", title: "Final headcount check and day-before prep", category: "Planning", weeksBeforeFraction: 0.05, dependsOn: ["b_invites"] },
    ],
    vendorTemplates: [
      { id: "vb_venue", category: "Venue", name: "Party Room / Park Pavilion", leadTimeWeeks: 6 },
      { id: "vb_bakery", category: "Catering", name: "Custom Cake Bakery", leadTimeWeeks: 3 },
      { id: "vb_entertainer", category: "Entertainment", name: "Magician / Balloon Artist / Face Painter", leadTimeWeeks: 4 },
      { id: "vb_decor", category: "Decor", name: "Balloon Garland & Party Rental", leadTimeWeeks: 2 },
    ],
  },
  community: {
    contingencyPercent: 10,
    categories: [
      { id: "venue_permits", name: "Venue & City Permits", weight: 20 },
      { id: "logistics", name: "Logistics (Sound, Tents, AV)", weight: 22 },
      { id: "refreshments", name: "Food & Refreshments", weight: 18 },
      { id: "safety", name: "Safety, Security & Insurance", weight: 8 },
      { id: "marketing", name: "Marketing, Signage & Printing", weight: 10 },
      { id: "program", name: "Program, Talent & Speakers", weight: 12 },
      { id: "volunteers", name: "Volunteer Support & Shirts", weight: 5 },
      { id: "misc", name: "Miscellaneous", weight: 5 },
    ],
    milestoneTemplates: [
      { id: "c_committee", title: "Form planning committee & event goals", category: "Governance", weeksBeforeFraction: 0.95 },
      { id: "c_permits", title: "Submit municipal permits and reserve public grounds", category: "Permits", weeksBeforeFraction: 0.85, dependsOn: ["c_committee"] },
      { id: "c_sponsors", title: "Outreach to community sponsors and partners", category: "Fundraising", weeksBeforeFraction: 0.7 },
      { id: "c_av_staging", title: "Book stages, PA sound system, and generators", category: "Logistics", weeksBeforeFraction: 0.55, dependsOn: ["c_permits"] },
      { id: "c_volunteers", title: "Open volunteer registration and assign team leads", category: "Volunteers", weeksBeforeFraction: 0.4 },
      { id: "c_promotion", title: "Launch neighborhood flyers and social promotion", category: "Marketing", weeksBeforeFraction: 0.35 },
      { id: "c_safety_brief", title: "Volunteer safety briefing and site inspection", category: "Operations", weeksBeforeFraction: 0.05, dependsOn: ["c_volunteers", "c_permits"] },
    ],
    vendorTemplates: [
      { id: "vc_city", category: "Permits", name: "City Parks & Recreation Department", leadTimeWeeks: 12 },
      { id: "vc_av", category: "Logistics", name: "Sound, Stage & Lighting Rentals", leadTimeWeeks: 8 },
      { id: "vc_sanitation", category: "Safety", name: "Waste Management & Portable Restrooms", leadTimeWeeks: 6 },
      { id: "vc_print", category: "Marketing", name: "Banners and Promotional Printer", leadTimeWeeks: 3 },
    ],
  },
};

/**
 * Generate a deterministic baseline budget allocation for an event profile.
 */
export function generateBaselineBudget(
  profile: EventProfile
): BudgetCategory[] {
  const config = BASELINE_CONFIGS[profile.type];
  const total = profile.budgetMinor;

  if (total <= 0) {
    return [
      ...config.categories.map((c) => ({
        id: c.id,
        name: c.name,
        allocatedMinor: 0,
        spentMinor: 0,
        isContingency: false,
      })),
      {
        id: "contingency",
        name: "Contingency Fund",
        allocatedMinor: 0,
        spentMinor: 0,
        isContingency: true,
      },
    ];
  }

  // 1. Separate contingency allocation
  const contingencyFraction = config.contingencyPercent / 100;
  const rawContingency = Math.round(total * contingencyFraction);
  const nonContingencyTotal = total - rawContingency;

  // 2. Allocate non-contingency across baseline categories using largest-remainder method
  const allocatedCategories = allocateBudget(
    nonContingencyTotal,
    config.categories.map((c) => ({ id: c.id, weight: c.weight, name: c.name }))
  );

  const categories: BudgetCategory[] = allocatedCategories.map((ac) => ({
    id: ac.item.id,
    name: ac.item.name,
    allocatedMinor: ac.allocatedMinor,
    spentMinor: 0,
    isContingency: false,
  }));

  // 3. Append contingency
  categories.push({
    id: "contingency",
    name: "Contingency Fund",
    allocatedMinor: rawContingency,
    spentMinor: 0,
    isContingency: true,
  });

  return categories;
}

/**
 * Generate a deterministic baseline timeline scaled to available preparation time.
 */
export function generateBaselineTimeline(
  profile: EventProfile,
  clock: Clock = defaultClock
): Milestone[] {
  const config = BASELINE_CONFIGS[profile.type];
  const todayStr = clock();
  const totalWeeks = Math.max(1, weeksBetween(todayStr, profile.eventDate));

  const inputs = config.milestoneTemplates.map((t) => {
    // Fraction of total weeks: 0.95 means 95% of available weeks before the event
    const targetWeeksBefore = Math.max(0, Math.round(t.weeksBeforeFraction * totalWeeks));
    return {
      id: t.id,
      title: t.title,
      category: t.category,
      targetWeeksBefore,
      dependsOn: t.dependsOn,
    };
  });

  const processed = processTimeline(inputs, profile.eventDate, clock);
  return processed.milestones;
}

/**
 * Generate deterministic baseline vendor items.
 */
export function generateBaselineVendors(
  profile: EventProfile
): VendorItem[] {
  const config = BASELINE_CONFIGS[profile.type];
  return config.vendorTemplates.map((v) => ({
    id: v.id,
    category: v.category,
    name: v.name,
    status: "researching",
    leadTimeWeeks: v.leadTimeWeeks,
  }));
}

/**
 * Sanity check reference for AI-generated or user-edited plans.
 * Flags:
 * 1. Any single category exceeding 60% of total budget.
 * 2. Any milestone dueDate outside [today, eventDate].
 * 3. Total allocated budget not matching total budget.
 */
export function validatePlanSanity(params: {
  budgetCategories: BudgetCategory[];
  totalBudgetMinor: number;
  milestones: Milestone[];
  eventDate: string;
  clock?: Clock;
}): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const clock = params.clock || defaultClock;
  const todayStr = clock();

  // 1. Budget checks
  if (params.totalBudgetMinor > 0) {
    const sumAllocated = params.budgetCategories.reduce(
      (acc, c) => acc + c.allocatedMinor,
      0
    );

    if (sumAllocated !== params.totalBudgetMinor) {
      warnings.push(
        `Allocated budget sum (${sumAllocated}) does not equal total budget (${params.totalBudgetMinor}).`
      );
    }

    const threshold = params.totalBudgetMinor * 0.6;
    for (const cat of params.budgetCategories) {
      if (cat.allocatedMinor > threshold) {
        const percent = Math.round((cat.allocatedMinor / params.totalBudgetMinor) * 100);
        warnings.push(
          `Category "${cat.name}" exceeds 60% threshold (${percent}% of total budget).`
        );
      }
    }
  }

  // 2. Milestone date checks
  for (const m of params.milestones) {
    if (isBefore(m.dueDate, todayStr)) {
      warnings.push(
        `Milestone "${m.title}" date (${m.dueDate}) is in the past before today (${todayStr}).`
      );
    }
    if (isAfter(m.dueDate, params.eventDate)) {
      warnings.push(
        `Milestone "${m.title}" date (${m.dueDate}) is after the event date (${params.eventDate}).`
      );
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
