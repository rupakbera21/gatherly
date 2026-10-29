/**
 * Home page – the entry point to Gatherly.
 * Single clear purpose: describe your event to generate an operational plan.
 * Cohesive layout featuring official brand identity, zero floating clutter,
 * INR currency alignment, and deterministic domain engine safeguards.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntakeSection } from "@/components/intake/IntakeSection";
import { Icon, Badge, BrandLogo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Gatherly – Turn Your Event Ideas into a Plan You Can Actually Run",
  description:
    "Budgets in rupees that add up, a timeline counted back from your date, vendor checklists, and a minute-by-minute schedule for the day.",
};

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen text-primary relative selection:bg-primary/20 selection:text-primary">
      {/* Top Application Header with Glassmorphism */}
      <header className="w-full border-b border-border-subtle bg-surface/85 backdrop-blur-xl sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border-subtle bg-surface-elevated/60 text-xs font-medium text-tertiary">
              <span className="w-2 h-2 rounded-full bg-status-success inline-block" aria-hidden />
              <span>INR (₹) Enabled</span>
            </div>
            <Link
              href="/events"
              className="text-xs font-semibold px-4 py-2 rounded-full border border-border-strong text-secondary hover:text-primary hover:border-primary hover:bg-surface-elevated transition-all no-underline flex items-center gap-2 shadow-2xs"
            >
              <Icon name="calendar" size={14} aria-hidden />
              <span>Saved plans</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Command Center & Intake */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-20 flex flex-col gap-12 sm:gap-14">
        {/* Focused Hero Section with Brand Gradient */}
        <section className="text-center flex flex-col items-center gap-4 sm:gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border-strong bg-surface/90 backdrop-blur-md text-xs font-semibold text-secondary shadow-xs">
            <Icon name="sparkles" size={14} className="text-brand" aria-hidden />
            <span>AI event planner for weddings, birthdays, and community gatherings</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-primary tracking-tight max-w-4xl leading-[1.15]">
            Turn your event ideas into a{" "}
            <span className="text-brand-gradient">plan you can actually run</span>
          </h1>

          <p className="text-secondary text-base sm:text-lg max-w-2xl leading-relaxed">
            Budgets in rupees that add up, a timeline counted back from your date, vendor checklists, and a minute-by-minute schedule for the day.
          </p>
        </section>

        {/* Unified Interactive Intake Console */}
        <div id="intake-container" className="w-full">
          <IntakeSection />
        </div>

        {/* Core Capabilities */}
        <section className="border border-border-strong rounded-surface bg-surface/90 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle mb-6 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-control bg-primary-subtle text-brand flex items-center justify-center">
                <Icon name="shield" size={16} aria-hidden />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                  Everything you need to run the day
                </span>
                <span className="text-xs text-tertiary">
                  Clear numbers • Coordinated schedules • Ready to share
                </span>
              </div>
            </div>
            <Badge variant="neutral" size="sm">
              All in one place
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-5 bg-surface-elevated/70 rounded-control border border-border-subtle flex flex-col gap-2.5 hover:border-border-strong transition-colors">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Icon name="currency" size={16} className="text-brand" aria-hidden />
                <span>Budgets that add up</span>
              </div>
              <p className="text-tertiary leading-relaxed">
                Allocations across venue, catering, decor, and vendors that always total your budget down to the exact rupee.
              </p>
              <div className="mt-auto pt-2">
                <span className="inline-flex text-2xs font-semibold uppercase tracking-wider text-secondary px-2 py-0.5 rounded-full bg-surface border border-border-subtle">
                  Zero discrepancy
                </span>
              </div>
            </div>

            <div className="p-5 bg-surface-elevated/70 rounded-control border border-border-subtle flex flex-col gap-2.5 hover:border-border-strong transition-colors">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Icon name="clock" size={16} className="text-brand" aria-hidden />
                <span>Backward timeline</span>
              </div>
              <p className="text-tertiary leading-relaxed">
                Milestones planned backward from your event date so you always know what to book and when to send invites.
              </p>
              <div className="mt-auto pt-2">
                <span className="inline-flex text-2xs font-semibold uppercase tracking-wider text-secondary px-2 py-0.5 rounded-full bg-surface border border-border-subtle">
                  Calendar sync
                </span>
              </div>
            </div>

            <div className="p-5 bg-surface-elevated/70 rounded-control border border-border-subtle flex flex-col gap-2.5 hover:border-border-strong transition-colors">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Icon name="clipboard" size={16} className="text-brand" aria-hidden />
                <span>Minute-by-minute schedule</span>
              </div>
              <p className="text-tertiary leading-relaxed">
                Day-of run sheets with coordinator role filters, cue times, and clean print-ready export.
              </p>
              <div className="mt-auto pt-2">
                <span className="inline-flex text-2xs font-semibold uppercase tracking-wider text-secondary px-2 py-0.5 rounded-full bg-surface border border-border-subtle">
                  Print ready
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Grounded Footer & Privacy Note */}
      <footer className="border-t border-border-subtle bg-surface-elevated/60 py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 text-xs text-tertiary">
          <div className="flex items-center gap-2 text-secondary font-medium">
            <Icon name="shield" size={14} className="text-brand" aria-hidden />
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
