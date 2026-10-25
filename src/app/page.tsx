/**
 * Home page – the entry point to Gatherly.
 * Single clear purpose: describe your event to generate an operational plan.
 * Pure presentation with zero emoji, token-backed layout, and honest structural cues.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntakeSection } from "@/components/intake/IntakeSection";
import { Icon, Surface, Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Gatherly – Turn Event Ideas Into Clear Operational Plans",
  description:
    "Describe your event in plain language and receive audited budget ledgers, backward milestone timelines, vendor checklists, and day-of run sheets.",
};

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-primary">
      {/* Top Utility Bar */}
      <header className="w-full border-b border-border-subtle bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold font-display text-primary no-underline tracking-tight"
          >
            <div className="w-7 h-7 rounded-control bg-primary text-white flex items-center justify-center font-bold text-xs">
              G
            </div>
            <span>Gatherly</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="text-xs font-semibold px-3 py-1.5 rounded-control border border-border-strong text-secondary hover:text-primary hover:bg-surface-elevated transition-colors no-underline"
            >
              Saved events
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="max-w-4xl mx-auto px-4 pt-12 pb-6 text-center flex flex-col items-center">
        <Badge variant="neutral" icon="clipboard" className="mb-4">
          Audited event planner
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-primary tracking-tight max-w-3xl leading-tight">
          Turn messy event ideas into a clear, reliable operational plan
        </h1>
        <p className="mt-3 text-secondary text-base sm:text-lg max-w-2xl leading-relaxed">
          Penny-accurate budget allocations, backward milestone timelines, and day-of run sheets. Governed by deterministic domain engines.
        </p>

        {/* Supported Event Scopes */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mt-8 text-left"
          role="list"
          aria-label="Supported event types"
        >
          <Surface variant="elevated" tint="wedding" className="p-4" role="listitem">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tint-wedding">
              <Icon name="wedding" size={14} aria-hidden />
              <span>Weddings</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Multi-function schedules, traditions, guest dietary needs, and shot lists.
            </p>
          </Surface>

          <Surface variant="elevated" tint="birthday" className="p-4" role="listitem">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tint-birthday">
              <Icon name="birthday" size={14} aria-hidden />
              <span>Birthdays</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Age-adaptive milestones, cake portioning, allergen management, and entertainment.
            </p>
          </Surface>

          <Surface variant="elevated" tint="community" className="p-4" role="listitem">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tint-community">
              <Icon name="community" size={14} aria-hidden />
              <span>Community Events</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Municipal permit checkpoints, volunteer rosters, safety contingencies, and sponsor ledgers.
            </p>
          </Surface>
        </div>
      </section>

      {/* Interactive Natural Language Intake Section */}
      <div id="intake-container" className="max-w-4xl mx-auto px-4 pb-12">
        <IntakeSection />
      </div>

      {/* Architectural Structure Diagram (Labelled Illustration) */}
      <section className="max-w-4xl mx-auto px-4 pb-12 text-left">
        <div className="border border-border-subtle rounded-surface bg-surface p-6">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Plan structure (Illustration)
            </span>
            <Badge variant="neutral" size="sm">
              Single source of truth
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle flex flex-col gap-1">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Icon name="currency" size={14} aria-hidden />
                Deterministic Ledger
              </span>
              <p className="text-tertiary">
                Hare-Niemeyer largest-remainder allocation guarantees penny-exact balance across all categories.
              </p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle flex flex-col gap-1">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Icon name="clock" size={14} aria-hidden />
                Backward DAG Timeline
              </span>
              <p className="text-tertiary">
                Milestones planned backward from event date with 3-color DFS cycle detection and RFC 5545 export.
              </p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle flex flex-col gap-1">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Icon name="clipboard" size={14} aria-hidden />
                Day-of Run Sheet
              </span>
              <p className="text-tertiary">
                Minute-by-minute operational cue list with owner filtering and print-ready production layout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer & Local Privacy Guarantee */}
      <footer className="border-t border-border-subtle bg-surface-elevated py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 text-xs text-tertiary">
          <div className="flex items-center gap-2 text-secondary font-medium">
            <Icon name="shield" size={14} aria-hidden />
            <span>Privacy guarantee: All plan data stays strictly on your device in local storage.</span>
          </div>
          <p>
            AI-generated content provides structural guidance. Budget costs are estimates; verify with local vendors. Legal and permit notes constitute general guidance, not professional advice.
          </p>
        </div>
      </footer>
    </main>
  );
}
