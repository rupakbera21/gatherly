/**
 * Home page – the entry point to Gatherly.
 * Single clear purpose: describe your event to generate an operational plan.
 * Cohesive layout featuring official brand identity, zero floating clutter,
 * INR currency alignment, and deterministic domain engine safeguards.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntakeSection } from "@/components/intake/IntakeSection";
import { Icon, Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Gatherly – Turn Event Ideas Into Clear Operational Plans",
  description:
    "Describe your event in plain language and receive audited budget ledgers, backward milestone timelines, vendor checklists, and day-of run sheets.",
};

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-primary">
      {/* Top Application Header */}
      <header className="w-full border-b border-border-subtle bg-surface sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
            aria-label="Gatherly Home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Gatherly Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="text-xs font-semibold px-3.5 py-2 rounded-control border border-border-strong text-secondary hover:text-primary hover:bg-surface-elevated transition-colors no-underline flex items-center gap-2"
            >
              <Icon name="calendar" size={14} aria-hidden />
              <span>Saved plans</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Command Center & Intake */}
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-16 space-y-10">
        {/* Focused Hero Section */}
        <section className="text-center flex flex-col items-center space-y-3">
          <Badge variant="neutral" icon="clipboard">
            Audited celebration planner
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-primary tracking-tight max-w-2xl leading-tight">
            Turn messy celebration ideas into an audited operational plan
          </h1>
          <p className="text-secondary text-base sm:text-lg max-w-2xl leading-relaxed">
            Penny-accurate Rupee (₹) budgets, backwards milestone timelines, and day-of call sheets—governed by deterministic domain engines.
          </p>
        </section>

        {/* Unified Interactive Intake Console */}
        <div id="intake-container">
          <IntakeSection />
        </div>

        {/* Architectural Engine Safeguards */}
        <section className="border border-border-subtle rounded-surface bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-2">
              <Icon name="clipboard" size={16} aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Deterministic System Architecture (Illustration)
              </span>
            </div>
            <Badge variant="neutral" size="sm">
              Single source of truth
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-surface-elevated rounded-control border border-border-subtle flex flex-col gap-1.5">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Icon name="currency" size={14} aria-hidden />
                Exact Rupee Ledger
              </span>
              <p className="text-tertiary leading-relaxed">
                Hare-Niemeyer largest-remainder allocation guarantees zero discrepancy down to the exact rupee across all categories.
              </p>
            </div>

            <div className="p-3.5 bg-surface-elevated rounded-control border border-border-subtle flex flex-col gap-1.5">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Icon name="clock" size={14} aria-hidden />
                Backward DAG Timeline
              </span>
              <p className="text-tertiary leading-relaxed">
                Phased milestones planned backward from your event date with cycle detection and standard calendar export.
              </p>
            </div>

            <div className="p-3.5 bg-surface-elevated rounded-control border border-border-subtle flex flex-col gap-1.5">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Icon name="clipboard" size={14} aria-hidden />
                Minute-by-Minute Run Sheet
              </span>
              <p className="text-tertiary leading-relaxed">
                Execution call sheet with coordinator role filters, stage cues, and clean print-ready layout.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Grounded Footer & Privacy Note */}
      <footer className="border-t border-border-subtle bg-surface-elevated py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 text-xs text-tertiary">
          <div className="flex items-center gap-2 text-secondary font-medium">
            <Icon name="shield" size={14} aria-hidden />
            <span>Local privacy guarantee: All event details and plans remain strictly in your browser storage.</span>
          </div>
          <p className="leading-relaxed">
            Gatherly provides structural and operational guidance. Budgets are planning estimates; confirm contracts with your vendors.
          </p>
        </div>
      </footer>
    </main>
  );
}
