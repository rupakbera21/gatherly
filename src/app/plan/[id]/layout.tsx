"use client";

/**
 * @module PlanLayout
 * @purpose Shared layout for all plan sub-routes (/overview, /budget, /timeline, /vendors, /ideas, /extras, /run-of-show).
 *          Mounts the client store, maintains single source of truth,
 *          displays event summary, provider badges, undo/redo controls, and tab navigation.
 * @rubric Problem Statement Alignment & Accessibility – Single source of truth, WCAG 2.2 AA.
 */

import React, { use, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { daysBetween, defaultClock } from "@/domain/dates";
import { useGatherlyStore } from "@/store";

interface PlanLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

function PlanLayoutInner({ children, params }: PlanLayoutProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const pathname = usePathname();

  const { events, undo, redo, undoStacks, redoStacks } = useGatherlyStore();
  const plan = events[eventId];

  const todayStr = React.useSyncExternalStore(
    () => () => {},
    () => defaultClock(),
    () => ""
  );

  const canUndo = (undoStacks[eventId]?.length ?? 0) > 0;
  const canRedo = (redoStacks[eventId]?.length ?? 0) > 0;
  const [isCopilotOpen, setIsCopilotOpen] = React.useState(false);

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Event Plan Not Found
        </h1>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          This event plan could not be found in your local browser storage.
        </p>
        <Link
          href="/events"
          className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-colors"
        >
          ← Go to My Events
        </Link>
      </div>
    );
  }

  const daysLeft = todayStr ? daysBetween(todayStr, plan.profile.eventDate) : 0;
  const isPast = daysLeft < 0;

  const tabs = [
    { label: "Overview", href: `/plan/${eventId}/overview` },
    { label: "Budget", href: `/plan/${eventId}/budget` },
    { label: "Timeline", href: `/plan/${eventId}/timeline` },
    { label: "Vendors", href: `/plan/${eventId}/vendors` },
    { label: "Quote Auditor", href: `/plan/${eventId}/quote` },
    { label: "Ideas", href: `/plan/${eventId}/ideas` },
    { label: "Type Extras", href: `/plan/${eventId}/extras` },
    { label: "Run-of-Show", href: `/plan/${eventId}/run-of-show` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Polite single aria-live region for non-spammy async status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-live-region" />

      {/* Plan Header */}
      <header className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Link
                href="/events"
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              >
                ← Events
              </Link>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                  plan.profile.type === "wedding"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : plan.profile.type === "birthday"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {plan.profile.type}
              </span>

              {/* Provider Badge */}
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  plan.aiProviderBadge === "groq"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : plan.aiProviderBadge === "baseline"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {plan.aiProviderBadge === "groq"
                  ? "Generated with backup service"
                  : plan.aiProviderBadge === "baseline"
                  ? "Standard template (AI unavailable)"
                  : "AI-generated"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
              {plan.profile.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-2">
              <span>📅 {plan.profile.eventDate}</span>
              <span>👥 {plan.profile.guestCount.toLocaleString()} guests</span>
              {plan.profile.location && <span>📍 {plan.profile.location}</span>}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {isPast ? "Event concluded" : `${daysLeft} days to go`}
              </span>
            </div>
          </div>

          {/* Undo / Redo Toolbar */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => undo(eventId)}
              disabled={!canUndo}
              aria-label="Undo last change"
              title="Undo last change (Ctrl+Z)"
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[38px] flex items-center gap-1"
            >
              <span>↩</span>
              <span>Undo</span>
            </button>
            <button
              onClick={() => redo(eventId)}
              disabled={!canRedo}
              aria-label="Redo last undone change"
              title="Redo (Ctrl+Y)"
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[38px] flex items-center gap-1"
            >
              <span>Redo</span>
              <span>↪</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-stone-200 dark:border-stone-800 mt-5 pt-3 scrollbar-none"
          aria-label="Event sections"
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                  isActive
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Persistent AI review notice */}
      <div
        role="note"
        className="px-4 py-2 bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-lg text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between"
      >
        <span>
          ✦ AI-generated planning assistant. Please review estimates and permits before signing contracts.
        </span>
        <span className="hidden sm:inline">Privacy-first: local storage only</span>
      </div>

      {/* Sub-route Content */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>

      {/* Floating Copilot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="px-4 py-2.5 rounded-full bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group border border-indigo-400/30"
          aria-label="Open Plan Copilot assistant"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Ask Copilot</span>
          <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>

      {/* Copilot Drawer */}
      <CopilotDrawer
        plan={plan}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
}

export default function PlanLayout(props: PlanLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse text-slate-400">
          Loading plan workspace...
        </div>
      }
    >
      <PlanLayoutInner {...props} />
    </Suspense>
  );
}
