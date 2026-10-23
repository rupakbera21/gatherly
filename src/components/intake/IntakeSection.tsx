"use client";

/**
 * @module IntakeSection
 * @purpose Natural-language event intake component.
 *          Single clear action: describe your event, select example prompt chips,
 *          call /api/intake, review extracted profile, and create the event in store.
 * @rubric Problem Statement Alignment & UX – Conversational intake with example chips.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EventProfile } from "@/domain/types";
import { useGatherlyStore } from "@/store";
import { ProfileReviewForm } from "./ProfileReviewForm";

const EXAMPLE_PROMPTS = [
  {
    emoji: "💍",
    label: "120-Guest Wedding",
    text: "Planning a 120-guest multicultural wedding in Chicago next June. Two functions (Ceremony and Reception) with a $35,000 budget. Need accommodation assistance for out-of-town guests.",
  },
  {
    emoji: "🎂",
    label: "7th Birthday Party",
    text: "7th birthday superhero themed party for 25 kids at a local park pavilion next month. $800 budget. Note: peanut allergy considerations and need an entertainer.",
  },
  {
    emoji: "🌍",
    label: "Community Summer Fair",
    text: "Free neighborhood summer arts fair for 500 attendees in late July. $12,000 budget from municipal grants and local sponsors. Needs city park permit, stage sound system, and 15 volunteers.",
  },
];

export function IntakeSection() {
  const router = useRouter();
  const { createEvent } = useGatherlyStore();

  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Review step
  const [extractedProfile, setExtractedProfile] = useState<EventProfile | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || description.length < 5) {
      setErrorMsg("Please describe your event with at least a few details (e.g. type, date, or guests).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          defaultCurrency: currency,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to analyze event details.");
      }

      setExtractedProfile(data.profile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConfirmProfile(finalProfile: EventProfile) {
    const newId = createEvent(finalProfile);
    router.push(`/plan/${newId}/overview`);
  }

  if (extractedProfile) {
    return (
      <div className="w-full py-8">
        <ProfileReviewForm
          initialProfile={extractedProfile}
          onConfirm={handleConfirmProfile}
          onCancel={() => setExtractedProfile(null)}
          isLoading={false}
        />
      </div>
    );
  }

  return (
    <section
      id="intake-section"
      className="w-full max-w-3xl mx-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8 shadow-sm"
      aria-label="Event description intake"
    >
      <form onSubmit={handleAnalyze} className="space-y-6">
        <div>
          <label
            htmlFor="event-description-input"
            className="block text-lg font-bold text-stone-900 dark:text-stone-100 mb-2"
          >
            Describe your event in your own words
          </label>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Mention the event type, estimated date, location, guest count, or budget. Gatherly extracts everything automatically.
          </p>

          <textarea
            id="event-description-input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="e.g. Planning a 150-guest garden wedding in Napa Valley next October with a $40,000 budget..."
            className="w-full p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base resize-y transition-shadow"
            required
            aria-describedby={errorMsg ? "intake-error" : "char-counter"}
          />

          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-1.5 px-1">
            <span id="char-counter">{description.length} / 2,000 characters</span>
            <span>All planning data stays in your browser</span>
          </div>
        </div>

        {/* Example Prompt Chips */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
            Or try an example prompt:
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => setDescription(prompt.text)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-stone-100 hover:bg-amber-50 dark:bg-stone-800 dark:hover:bg-amber-950/40 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:border-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <span>{prompt.emoji}</span>
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options: Currency & Output Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div>
            <label
              htmlFor="intake-currency"
              className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Default Currency
            </label>
            <select
              id="intake-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
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

          <div>
            <label
              htmlFor="intake-language"
              className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Plan Output Language
            </label>
            <select
              id="intake-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
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

        {errorMsg && (
          <div
            id="intake-error"
            role="alert"
            className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
          >
            {errorMsg}
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Analyzing Event...</span>
              </>
            ) : (
              <span>Continue to Profile Review →</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
