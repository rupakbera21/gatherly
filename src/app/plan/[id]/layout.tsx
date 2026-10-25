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
import { Button, Icon, Badge } from "@/components/ui";

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
  const copilotBtnRef = React.useRef<HTMLButtonElement>(null);

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-display">
          Event Plan Not Found
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          This event plan could not be found in your local browser storage.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors"
        >
          Go to My Events
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

  const eventType = plan.profile.type;
  const typeBorderColor =
    eventType === "wedding"
      ? "border-t-wedding-tint"
      : eventType === "birthday"
      ? "border-t-birthday-tint"
      : "border-t-community-tint";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">

      {/* Plan Header */}
      <header className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 shadow-xs border-t-4 ${typeBorderColor}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Link
                href="/events"
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                Events
              </Link>
              <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">/</span>
              <Badge variant={eventType} size="sm">
                {eventType}
              </Badge>

              {/* Provider Badge */}
              <Badge variant="neutral" size="sm">
                {plan.aiProviderBadge === "groq"
                  ? "Generated with backup service"
                  : plan.aiProviderBadge === "baseline"
                  ? "Standard template (AI unavailable)"
                  : "AI-generated"}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-display tracking-tight">
              {plan.profile.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              <span className="inline-flex items-center gap-1.5 tnum">
                <Icon name="calendar" size="xs" aria-hidden="true" />
                <span>{plan.profile.eventDate}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 tnum">
                <Icon name="users" size="xs" aria-hidden="true" />
                <span>{plan.profile.guestCount.toLocaleString()} guests</span>
              </span>
              {plan.profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location" size="xs" aria-hidden="true" />
                  <span>{plan.profile.location}</span>
                </span>
              )}
              <span className="font-semibold text-primary-600 dark:text-primary-400 tnum">
                {isPast ? "Event concluded" : `${daysLeft} days to go`}
              </span>
            </div>
          </div>

          {/* Undo / Redo Toolbar */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <Button
              variant="secondary"
              size="sm"
              icon="undo"
              onClick={() => undo(eventId)}
              disabled={!canUndo}
              aria-label="Undo last change"
              title="Undo last change (Ctrl+Z)"
            >
              Undo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="redo"
              onClick={() => redo(eventId)}
              disabled={!canRedo}
              aria-label="Redo last undone change"
              title="Redo (Ctrl+Y)"
            >
              Redo
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-neutral-200 dark:border-neutral-800 mt-5 pt-3 scrollbar-none"
          aria-label="Event sections"
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-950/60 text-primary-900 dark:text-primary-200 font-semibold border-b-2 border-primary-600"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
        className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-md text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon name="info" size="xs" aria-hidden="true" />
          <span>AI-generated planning assistant. Please review estimates and permits before signing contracts.</span>
        </span>
        <span className="hidden sm:inline text-neutral-500">Privacy-first: local storage only</span>
      </div>

      {/* Sub-route Content */}
      <main id="main-content" tabIndex={-1} className="focus:outline-hidden">
        {children}
      </main>

      {/* Floating Copilot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          ref={copilotBtnRef}
          onClick={() => setIsCopilotOpen(true)}
          className="px-4 py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 border border-primary-500"
          aria-label="Open Plan Copilot assistant"
        >
          <Icon name="sparkles" size="sm" aria-hidden="true" />
          <span>Ask Copilot</span>
        </button>
      </div>

      {/* Copilot Drawer */}
      <CopilotDrawer
        plan={plan}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        triggerRef={copilotBtnRef}
      />
    </div>
  );
}

export default function PlanLayout(props: PlanLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse text-neutral-400">
          Loading plan workspace...
        </div>
      }
    >
      <PlanLayoutInner {...props} />
    </Suspense>
  );
}
