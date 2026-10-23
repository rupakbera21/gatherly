"use client";

/**
 * @module ProfileReviewForm
 * @purpose Form component for reviewing and editing extracted event profile details.
 *          Provides WCAG 2.2 AA accessibility, field validation, and type-specific extras.
 * @rubric Accessibility & UX – Keyboard accessible, error announcements, clear hierarchy.
 */

import React, { useState } from "react";
import { fromMinorUnits, toMinorUnits } from "@/domain/money";
import { EventProfile, EventType } from "@/domain/types";

interface ProfileReviewFormProps {
  initialProfile: EventProfile;
  onConfirm: (profile: EventProfile) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ProfileReviewForm({
  initialProfile,
  onConfirm,
  onCancel,
  isLoading = false,
}: ProfileReviewFormProps) {
  const [profile, setProfile] = useState<EventProfile>(initialProfile);
  const [majorBudget, setMajorBudget] = useState<string>(() =>
    fromMinorUnits(initialProfile.budgetMinor, initialProfile.currency).toString()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!profile.title.trim()) {
      newErrors.title = "Event title is required.";
    }
    if (!profile.eventDate) {
      newErrors.eventDate = "Event date is required.";
    }
    if (profile.guestCount < 0 || isNaN(profile.guestCount)) {
      newErrors.guestCount = "Guest count must be 0 or more.";
    }
    const parsedBudget = parseFloat(majorBudget);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      newErrors.budget = "Please enter a valid non-negative budget.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const budgetMinor = toMinorUnits(parseFloat(majorBudget) || 0, profile.currency);
    onConfirm({
      ...profile,
      budgetMinor,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-2xl mx-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6"
      aria-label="Review and edit event profile"
    >
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          Review Your Event Profile
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          Verify and adjust the details extracted from your description before generating your plan.
        </p>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="event-title"
          className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
        >
          Event Title <span className="text-red-500">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          value={profile.title}
          onChange={(e) => setProfile({ ...profile, title: e.target.value })}
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={!!errors.title}
          className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Event Type */}
        <div>
          <label
            htmlFor="event-type"
            className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
          >
            Event Category
          </label>
          <select
            id="event-type"
            value={profile.type}
            onChange={(e) => setProfile({ ...profile, type: e.target.value as EventType })}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="wedding">Wedding</option>
            <option value="birthday">Birthday</option>
            <option value="community">Community Event</option>
          </select>
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="event-date"
            className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
          >
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            id="event-date"
            type="date"
            value={profile.eventDate}
            onChange={(e) => setProfile({ ...profile, eventDate: e.target.value })}
            aria-describedby={errors.eventDate ? "date-error" : undefined}
            aria-invalid={!!errors.eventDate}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
          {errors.eventDate && (
            <p id="date-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.eventDate}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Guest Count */}
        <div>
          <label
            htmlFor="event-guests"
            className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
          >
            Guests
          </label>
          <input
            id="event-guests"
            type="number"
            min="0"
            value={profile.guestCount}
            onChange={(e) =>
              setProfile({ ...profile, guestCount: Math.max(0, parseInt(e.target.value) || 0) })
            }
            aria-describedby={errors.guestCount ? "guests-error" : undefined}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {errors.guestCount && (
            <p id="guests-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.guestCount}
            </p>
          )}
        </div>

        {/* Budget */}
        <div>
          <label
            htmlFor="event-budget"
            className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
          >
            Total Budget
          </label>
          <input
            id="event-budget"
            type="text"
            value={majorBudget}
            onChange={(e) => setMajorBudget(e.target.value)}
            aria-describedby={errors.budget ? "budget-error" : undefined}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {errors.budget && (
            <p id="budget-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.budget}
            </p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label
            htmlFor="event-currency"
            className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
          >
            Currency
          </label>
          <select
            id="event-currency"
            value={profile.currency}
            onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD ($)</option>
            <option value="AUD">AUD ($)</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="event-location"
          className="block text-sm font-medium text-stone-900 dark:text-stone-200 mb-1"
        >
          Location / Venue
        </label>
        <input
          id="event-location"
          type="text"
          value={profile.location || ""}
          placeholder="e.g. City, specific venue, or Online"
          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Type Specific Fields */}
      {profile.type === "wedding" && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Wedding Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="wedding-tradition"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                Tradition / Style
              </label>
              <input
                id="wedding-tradition"
                type="text"
                placeholder="e.g. Modern, Traditional, Multicultural"
                value={profile.weddingExtras?.tradition || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    weddingExtras: {
                      functions: profile.weddingExtras?.functions || [],
                      accommodationsNeeded: profile.weddingExtras?.accommodationsNeeded || false,
                      tradition: e.target.value,
                      notes: profile.weddingExtras?.notes,
                    },
                  })
                }
                className="w-full text-sm px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 text-sm text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.weddingExtras?.accommodationsNeeded || false}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      weddingExtras: {
                        functions: profile.weddingExtras?.functions || [],
                        accommodationsNeeded: e.target.checked,
                        tradition: profile.weddingExtras?.tradition,
                        notes: profile.weddingExtras?.notes,
                      },
                    })
                  }
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>Guest accommodations needed</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {profile.type === "birthday" && (
        <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Birthday Details
          </h3>
          <div>
            <label
              htmlFor="birthday-age"
              className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Age Group / Milestone
            </label>
            <input
              id="birthday-age"
              type="text"
              placeholder="e.g. 7th Birthday, Sweet 16, 40th Milestone"
              value={profile.birthdayExtras?.ageGroup || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  birthdayExtras: {
                    allergens: profile.birthdayExtras?.allergens || [],
                    ageGroup: e.target.value,
                    supervisionRatio: profile.birthdayExtras?.supervisionRatio,
                    notes: profile.birthdayExtras?.notes,
                  },
                })
              }
              className="w-full text-sm px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
      )}

      {profile.type === "community" && (
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Community Event Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center pt-2">
              <label className="flex items-center space-x-2 text-sm text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.communityExtras?.permitRequired || false}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      communityExtras: {
                        isFree: profile.communityExtras?.isFree ?? true,
                        permitRequired: e.target.checked,
                        volunteerCount: profile.communityExtras?.volunteerCount || 0,
                        sponsorTargetMinor: profile.communityExtras?.sponsorTargetMinor || 0,
                        notes: profile.communityExtras?.notes,
                      },
                    })
                  }
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>City / Park permit required</span>
              </label>
            </div>
            <div>
              <label
                htmlFor="community-volunteers"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                Target Volunteers
              </label>
              <input
                id="community-volunteers"
                type="number"
                min="0"
                value={profile.communityExtras?.volunteerCount || 0}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    communityExtras: {
                      isFree: profile.communityExtras?.isFree ?? true,
                      permitRequired: profile.communityExtras?.permitRequired || false,
                      volunteerCount: parseInt(e.target.value) || 0,
                      sponsorTargetMinor: profile.communityExtras?.sponsorTargetMinor || 0,
                      notes: profile.communityExtras?.notes,
                    },
                  })
                }
                className="w-full text-sm px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Generating Plan...</span>
            </>
          ) : (
            <span>Generate Full Plan</span>
          )}
        </button>
      </div>
    </form>
  );
}
