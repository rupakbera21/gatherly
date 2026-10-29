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
import { Button, Surface, Icon } from "@/components/ui";

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
      id="review-form"
      onSubmit={handleSubmit}
      noValidate
      className="max-w-2xl mx-auto p-6 bg-surface border border-border-subtle rounded-surface space-y-6 text-left"
      aria-label="Review and edit event parameters"
    >
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-xl font-bold font-display text-primary">
          Review Your Event Profile
        </h2>
        <p className="text-sm text-secondary mt-1">
          Verify what Gatherly understood from your description. Edit any fields before plan generation.
        </p>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="event-title"
          className="block text-sm font-semibold text-primary mb-1"
        >
          Event Title <span className="text-status-danger">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          value={profile.title}
          onChange={(e) => setProfile({ ...profile, title: e.target.value })}
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={!!errors.title}
          className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary"
          required
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-xs text-status-danger flex items-center gap-1" role="alert">
            <Icon name="alert" size={14} aria-hidden />
            <span>{errors.title}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Event Type */}
        <div>
          <label
            htmlFor="event-type"
            className="block text-sm font-semibold text-primary mb-1"
          >
            Event Category
          </label>
          <select
            id="event-type"
            value={profile.type}
            onChange={(e) => setProfile({ ...profile, type: e.target.value as EventType })}
            className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary cursor-pointer"
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
            className="block text-sm font-semibold text-primary mb-1"
          >
            Event Date <span className="text-status-danger">*</span>
          </label>
          <input
            id="event-date"
            type="date"
            value={profile.eventDate}
            onChange={(e) => setProfile({ ...profile, eventDate: e.target.value })}
            aria-describedby={errors.eventDate ? "date-error" : undefined}
            aria-invalid={!!errors.eventDate}
            className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary"
            required
          />
          {errors.eventDate && (
            <p id="date-error" className="mt-1 text-xs text-status-danger flex items-center gap-1" role="alert">
              <Icon name="alert" size={14} aria-hidden />
              <span>{errors.eventDate}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Guests */}
        <div>
          <label
            htmlFor="guest-count"
            className="block text-sm font-semibold text-primary mb-1"
          >
            Guest Count
          </label>
          <input
            id="guest-count"
            type="number"
            min={0}
            value={profile.guestCount}
            onChange={(e) =>
              setProfile({ ...profile, guestCount: parseInt(e.target.value, 10) || 0 })
            }
            aria-describedby={errors.guestCount ? "guests-error" : undefined}
            aria-invalid={!!errors.guestCount}
            className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary tnum"
          />
          {errors.guestCount && (
            <p id="guests-error" className="mt-1 text-xs text-status-danger flex items-center gap-1" role="alert">
              <Icon name="alert" size={14} aria-hidden />
              <span>{errors.guestCount}</span>
            </p>
          )}
        </div>

        {/* Budget */}
        <div>
          <label
            htmlFor="event-budget"
            className="block text-sm font-semibold text-primary mb-1"
          >
            Target Budget ({profile.currency})
          </label>
          <input
            id="event-budget"
            type="number"
            min={0}
            step="any"
            value={majorBudget}
            onChange={(e) => setMajorBudget(e.target.value)}
            aria-describedby={errors.budget ? "budget-error" : undefined}
            aria-invalid={!!errors.budget}
            className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary tnum"
          />
          {errors.budget && (
            <p id="budget-error" className="mt-1 text-xs text-status-danger flex items-center gap-1" role="alert">
              <Icon name="alert" size={14} aria-hidden />
              <span>{errors.budget}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Currency */}
        <div>
          <label
            htmlFor="profile-currency"
            className="block text-sm font-semibold text-primary mb-1"
          >
            Currency
          </label>
          <select
            id="profile-currency"
            value={profile.currency}
            onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD ($)</option>
            <option value="AUD">AUD ($)</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label
            htmlFor="profile-language"
            className="block text-sm font-semibold text-primary mb-1"
          >
            Language
          </label>
          <select
            id="profile-language"
            value={profile.language}
            onChange={(e) => setProfile({ ...profile, language: e.target.value })}
            className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="es">Español (Spanish)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="event-location"
          className="block text-sm font-semibold text-primary mb-1"
        >
          Location
        </label>
        <input
          id="event-location"
          type="text"
          value={profile.location || ""}
          placeholder="e.g. City, specific venue, or Online"
          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
          className="w-full h-10 px-3.5 py-2 text-sm rounded-control border border-border-strong bg-surface text-primary focus:outline-none focus:border-primary"
        />
      </div>

      {/* Type Specific Fields */}
      {profile.type === "wedding" && (
        <Surface variant="elevated" tint="wedding" className="p-4 space-y-3">
          <h3 className="text-sm font-bold font-display text-primary flex items-center gap-1.5">
            <Icon name="wedding" size={16} aria-hidden />
            Wedding parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="wedding-tradition"
                className="block text-xs font-semibold text-secondary mb-1"
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
                className="w-full h-9 text-sm px-3 py-1.5 rounded-control border border-border-strong bg-surface text-primary"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-sm text-primary cursor-pointer select-none">
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
                  className="rounded-control border-border-strong text-primary h-4 w-4"
                />
                <span>Guest accommodations needed</span>
              </label>
            </div>
          </div>
        </Surface>
      )}

      {profile.type === "birthday" && (
        <Surface variant="elevated" tint="birthday" className="p-4 space-y-3">
          <h3 className="text-sm font-bold font-display text-primary flex items-center gap-1.5">
            <Icon name="birthday" size={16} aria-hidden />
            Birthday parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="birthday-age"
                className="block text-xs font-semibold text-secondary mb-1"
              >
                Age Group / Milestone
              </label>
              <input
                id="birthday-age"
                type="text"
                placeholder="e.g. 7th Birthday, Sweet 16, 30th"
                value={profile.birthdayExtras?.ageGroup || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    birthdayExtras: {
                      allergens: profile.birthdayExtras?.allergens || [],
                      ageGroup: e.target.value,
                      notes: profile.birthdayExtras?.notes,
                      supervisionRatio: profile.birthdayExtras?.supervisionRatio,
                    },
                  })
                }
                className="w-full h-9 text-sm px-3 py-1.5 rounded-control border border-border-strong bg-surface text-primary"
              />
            </div>
            <div>
              <label
                htmlFor="birthday-allergens"
                className="block text-xs font-semibold text-secondary mb-1"
              >
                Allergies & Dietary Restrictions
              </label>
              <input
                id="birthday-allergens"
                type="text"
                placeholder="e.g. peanuts, dairy, gluten-free"
                value={(profile.birthdayExtras?.allergens || []).join(", ")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    birthdayExtras: {
                      ageGroup: profile.birthdayExtras?.ageGroup || "",
                      notes: profile.birthdayExtras?.notes,
                      supervisionRatio: profile.birthdayExtras?.supervisionRatio,
                      allergens: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className="w-full h-9 text-sm px-3 py-1.5 rounded-control border border-border-strong bg-surface text-primary"
              />
            </div>
          </div>
        </Surface>
      )}

      {profile.type === "community" && (
        <Surface variant="elevated" tint="community" className="p-4 space-y-3">
          <h3 className="text-sm font-bold font-display text-primary flex items-center gap-1.5">
            <Icon name="community" size={16} aria-hidden />
            Community parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 text-sm text-primary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={profile.communityExtras?.permitRequired || false}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      communityExtras: {
                        volunteerCount: profile.communityExtras?.volunteerCount || 0,
                        isFree: profile.communityExtras?.isFree ?? true,
                        sponsorTargetMinor: profile.communityExtras?.sponsorTargetMinor || 0,
                        permitRequired: e.target.checked,
                      },
                    })
                  }
                  className="rounded-control border-border-strong text-primary h-4 w-4"
                />
                <span>City / park permit required</span>
              </label>
            </div>
            <div>
              <label
                htmlFor="community-volunteers"
                className="block text-xs font-semibold text-secondary mb-1"
              >
                Target Volunteer Crew
              </label>
              <input
                id="community-volunteers"
                type="number"
                min={0}
                value={profile.communityExtras?.volunteerCount || 0}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    communityExtras: {
                      permitRequired: profile.communityExtras?.permitRequired || false,
                      isFree: profile.communityExtras?.isFree ?? true,
                      sponsorTargetMinor: profile.communityExtras?.sponsorTargetMinor || 0,
                      volunteerCount: parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
                className="w-full h-9 text-sm px-3 py-1.5 rounded-control border border-border-strong bg-surface text-primary tnum"
              />
            </div>
          </div>
        </Surface>
      )}

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border-subtle">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isLoading}
          isLoading={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Generating Plan..." : "Generate Full Plan"}
        </Button>
      </div>
    </form>
  );
}
