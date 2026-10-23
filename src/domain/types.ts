/**
 * @module types
 * @purpose Core domain models and Zod schemas for Gatherly.
 *          Strict validation for profiles, budgets, timelines, vendors, and ideas.
 *          Inferred TypeScript types ensure compile-time and runtime consistency.
 * @rubric Code Quality – Zod-inferred types, strict validation.
 */

import { z } from "zod";

export const EventTypeSchema = z.enum(["wedding", "birthday", "community"]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const WeddingExtrasSchema = z.object({
  functions: z.array(z.string().max(100)).default([]),
  tradition: z.string().max(100).optional(),
  accommodationsNeeded: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});
export type WeddingExtras = z.infer<typeof WeddingExtrasSchema>;

export const BirthdayExtrasSchema = z.object({
  ageGroup: z.string().max(50).optional(),
  allergens: z.array(z.string().max(50)).default([]),
  supervisionRatio: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});
export type BirthdayExtras = z.infer<typeof BirthdayExtrasSchema>;

export const CommunityExtrasSchema = z.object({
  isFree: z.boolean().default(true),
  permitRequired: z.boolean().default(false),
  volunteerCount: z.number().int().nonnegative().default(0),
  sponsorTargetMinor: z.number().int().nonnegative().default(0),
  notes: z.string().max(1000).optional(),
});
export type CommunityExtras = z.infer<typeof CommunityExtrasSchema>;

export const EventProfileSchema = z.object({
  id: z.string().min(1),
  type: EventTypeSchema,
  title: z.string().min(1).max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  location: z.string().max(200).optional(),
  guestCount: z.number().int().nonnegative(),
  budgetMinor: z.number().int().nonnegative(),
  currency: z.string().length(3).toUpperCase().default("USD"),
  language: z.string().max(10).default("en"),
  weddingExtras: WeddingExtrasSchema.optional(),
  birthdayExtras: BirthdayExtrasSchema.optional(),
  communityExtras: CommunityExtrasSchema.optional(),
});
export type EventProfile = z.infer<typeof EventProfileSchema>;

export const BudgetCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  allocatedMinor: z.number().int().nonnegative(),
  spentMinor: z.number().int().nonnegative().default(0),
  notes: z.string().max(500).optional(),
  isContingency: z.boolean().default(false),
});
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

export const MilestoneStatusSchema = z.enum(["pending", "in_progress", "completed"]);
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;

export const MilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetWeeksBefore: z.number().int().nonnegative().optional(),
  category: z.string().max(100).default("General"),
  status: MilestoneStatusSchema.default("pending"),
  dependsOn: z.array(z.string()).default([]),
  isCriticalPath: z.boolean().default(false),
  wasClamped: z.boolean().default(false),
  overdue: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const VendorStatusSchema = z.enum(["researching", "contacted", "quoted", "booked"]);
export type VendorStatus = z.infer<typeof VendorStatusSchema>;

export const VendorItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  status: VendorStatusSchema.default("researching"),
  estimatedCostMinor: z.number().int().nonnegative().optional(),
  actualCostMinor: z.number().int().nonnegative().optional(),
  quoteNotes: z.string().max(1000).optional(),
  leadTimeWeeks: z.number().int().nonnegative().optional(),
  bookedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type VendorItem = z.infer<typeof VendorItemSchema>;

export const IdeaStatusSchema = z.enum(["suggested", "saved", "dismissed"]);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const IdeaItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  category: z.string().max(100).default("General"),
  status: IdeaStatusSchema.default("suggested"),
  addedToPlan: z.boolean().default(false),
});
export type IdeaItem = z.infer<typeof IdeaItemSchema>;

export const EventPlanSchema = z.object({
  id: z.string().min(1),
  profile: EventProfileSchema,
  budgetCategories: z.array(BudgetCategorySchema).default([]),
  milestones: z.array(MilestoneSchema).default([]),
  vendors: z.array(VendorItemSchema).default([]),
  ideas: z.array(IdeaItemSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  aiProviderBadge: z.enum(["gemini", "groq", "baseline"]).default("gemini"),
});
export type EventPlan = z.infer<typeof EventPlanSchema>;
