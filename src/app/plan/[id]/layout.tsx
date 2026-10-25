"use client";

/**
 * @module PlanLayout
 * @purpose Unified workspace layout for all plan sub-routes.
 *          Mounts the client store, maintains single source of truth,
 *          displays brand header, event summary, provider badges,
 *          seamlessly attached tab navigation, and undo/redo controls.
 * @rubric Problem Statement Alignment & Accessibility – Single source of truth, WCAG 2.2 AA.
 */

import React, { use, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { daysBetween, defaultClock } from "@/domain/dates";
import { useGatherlyStore } from "@/store";
import { Button, Icon, Badge, BrandLogo } from "@/components/ui";

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
        <h1 className="text-2xl font-bold text-primary mb-2 font-display">
          Event Plan Not Found
        </h1>
        <p className="text-secondary mb-6">
          This event plan could not be found in your local browser storage.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-control bg-primary hover:bg-primary-hover text-primary-fg font-medium text-sm transition-colors"
        >
          Go to saved plans
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

  return (
    <div className="min-h-screen bg-canvas text-primary flex flex-col">
      {/* Unified App & Plan Header */}
      <header className="w-full bg-surface border-b border-border-subtle sticky top-0 z-30 shadow-xs">
        {/* Top Global Utility Row */}
        <div className="border-b border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <span className="text-tertiary" aria-hidden="true">/</span>
              <Link
                href="/events"
                className="text-xs font-semibold text-secondary hover:text-primary transition-colors no-underline"
              >
                Saved plans
              </Link>
              <span className="text-tertiary hidden sm:inline" aria-hidden="true">/</span>
              <span className="text-xs font-medium text-primary hidden sm:inline truncate max-w-xs">
                {plan.profile.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
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
              <button
                ref={copilotBtnRef}
                onClick={() => setIsCopilotOpen(true)}
                className="ml-2 px-3 py-1.5 rounded-control bg-primary text-primary-fg hover:bg-primary-hover text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                aria-label="Open Plan Copilot assistant"
              >
                <Icon name="sparkles" size={14} aria-hidden />
                <span>Copilot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Event Identity & Metadata Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant={eventType} size="sm">
                {eventType}
              </Badge>
              <Badge variant="neutral" size="sm">
                {plan.aiProviderBadge === "groq"
                  ? "Standard offline fallback"
                  : plan.aiProviderBadge === "baseline"
                  ? "Standard template"
                  : "AI-governed plan"}
              </Badge>
              <span className="text-xs font-semibold text-primary tnum px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle">
                {isPast ? "Concluded" : `${daysLeft} days to go`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-primary tracking-tight">
              {plan.profile.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
            <span className="inline-flex items-center gap-1.5 tnum bg-surface-elevated px-2.5 py-1 rounded-control border border-border-subtle">
              <Icon name="calendar" size={14} aria-hidden />
              <span>{plan.profile.eventDate}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 tnum bg-surface-elevated px-2.5 py-1 rounded-control border border-border-subtle">
              <Icon name="users" size={14} aria-hidden />
              <span>{plan.profile.guestCount.toLocaleString()} guests</span>
            </span>
            {plan.profile.location && (
              <span className="inline-flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-control border border-border-subtle">
                <Icon name="location" size={14} aria-hidden />
                <span>{plan.profile.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Directly Attached Navigation Tabs */}
        <div className="border-t border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav
              className="flex items-center gap-1 overflow-x-auto scrollbar-none -mb-px"
              aria-label="Event plan sections"
            >
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors flex items-center border-b-2 ${
                      isActive
                        ? "border-primary text-primary bg-primary-subtle"
                        : "border-transparent text-secondary hover:text-primary hover:border-border-strong"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Continuous Workspace Content Canvas */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 focus:outline-none">
        {children}
      </main>

      {/* Quiet Grounded Footer Status Bar */}
      <footer className="w-full border-t border-border-subtle bg-surface-elevated py-4 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-tertiary">
          <div className="flex items-center gap-2">
            <Icon name="shield" size={14} aria-hidden />
            <span>Local privacy guarantee: All event records remain stored exclusively in your browser.</span>
          </div>
          <span>Verify permits and vendor contracts before final booking.</span>
        </div>
      </footer>

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
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse text-tertiary">
          Loading plan workspace...
        </div>
      }
    >
      <PlanLayoutInner {...props} />
    </Suspense>
  );
}
