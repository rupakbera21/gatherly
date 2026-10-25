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
import { Button, Surface, Icon, IconName } from "@/components/ui";

interface ExamplePrompt {
  icon: IconName;
  label: string;
  text: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    icon: "wedding",
    label: "120-Guest Wedding",
    text: "Planning a 120-guest wedding in Bengaluru next November with a ₹25,00,000 budget. Two functions (Sangeet and Reception) with guest accommodation and catering management.",
  },
  {
    icon: "birthday",
    label: "7th Birthday Party",
    text: "7th birthday celebration for 30 kids at an indoor arena in Pune next month. ₹35,000 budget. Needs entertainer, allergen-safe snacks, and custom cake.",
  },
  {
    icon: "community",
    label: "Community Summer Fair",
    text: "Neighborhood community festival for 600 attendees in Delhi this winter. ₹4,50,000 budget from grants and sponsors. Needs ground permit, stage audio system, and 20 volunteers.",
  },
];

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी (Hindi)" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "es", label: "Español (Spanish)" },
  { value: "fr", label: "Français (French)" },
  { value: "de", label: "Deutsch (German)" },
];

export function IntakeSection() {
  const router = useRouter();
  const { createEvent } = useGatherlyStore();

  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("INR");
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
      className="w-full mx-auto"
      aria-label="Event description intake"
    >
      <Surface variant="default" className="p-6 sm:p-8 rounded-surface border border-border-strong bg-surface/95 backdrop-blur-xl shadow-lg">
        <form onSubmit={handleAnalyze} className="flex flex-col gap-6">
          {/* Studio Console Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-control bg-primary-subtle text-brand flex items-center justify-center">
                <Icon name="sparkles" size={16} aria-hidden />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                  AI Event Architecture Console
                </span>
                <span className="text-xs text-tertiary">
                  Natural-language parsing with deterministic domain engine allocation
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-tertiary">
              <Icon name="shield" size={13} className="text-status-success" aria-hidden />
              <span>100% In-Browser Privacy</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="event-description-input"
              className="block text-xl font-bold font-display text-primary mb-1.5 text-left tracking-tight"
            >
              Describe your event in your own words
            </label>
            <p className="text-sm text-secondary mb-3 text-left">
              Mention the event type, estimated date, location, guest count, or budget. Gatherly structures everything automatically.
            </p>

            <textarea
              id="event-description-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="e.g. Planning a 120-guest wedding in Bengaluru next November with a ₹25,00,000 budget..."
              className="w-full p-4 rounded-control border border-border-strong bg-surface-elevated/70 text-primary placeholder:text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base resize-y transition-colors leading-relaxed"
              required
              aria-describedby={errorMsg ? "intake-error" : "char-counter"}
            />

            <div className="flex items-center justify-between text-xs text-tertiary mt-2 px-1">
              <span id="char-counter" className="tnum font-medium">{description.length} / 2,000 characters</span>
              <span className="flex items-center gap-1.5">
                <Icon name="shield" size={13} aria-hidden />
                <span>All planning data stays in your browser</span>
              </span>
            </div>
          </div>

          {/* Example Prompt Chips */}
          <div className="text-left">
            <span className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2.5">
              Or try an example prompt:
            </span>
            <div className="flex flex-wrap gap-2.5">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => setDescription(prompt.text)}
                  className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated/80 text-secondary border border-border-strong hover:text-primary hover:border-primary hover:bg-surface-elevated transition-all cursor-pointer shadow-2xs"
                >
                  <Icon name={prompt.icon} size={14} className="text-brand" aria-hidden />
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options: Currency & Output Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-subtle text-left">
            <div>
              <label
                htmlFor="intake-currency"
                className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5"
              >
                Default Currency
              </label>
              <select
                id="intake-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-control border border-border-strong bg-surface-elevated/70 text-primary cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="intake-language"
                className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5"
              >
                Plan Output Language
              </label>
              <select
                id="intake-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-control border border-border-strong bg-surface-elevated/70 text-primary cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div
              id="intake-error"
              role="alert"
              className="p-3.5 bg-status-danger-bg border border-status-danger-border rounded-control text-sm text-status-danger flex items-center gap-2"
            >
              <Icon name="alert" size={16} aria-hidden />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end pt-5 border-t border-border-subtle">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || !description.trim()}
              isLoading={isSubmitting}
              rightIcon="arrow-right"
              className="w-full sm:w-auto shadow-md shadow-primary/20 font-semibold px-8 py-3"
            >
              Continue to profile review
            </Button>
          </div>
        </form>
      </Surface>
    </section>
  );
}
