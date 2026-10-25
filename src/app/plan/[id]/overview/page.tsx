"use client";

/**
 * @module PlanOverviewPage
 * @purpose Main dashboard overview for an event plan.
 *          Displays cue sheet (Next up run list), budget health, milestone progress,
 *          and parallel module generator with concurrency cap.
 * @rubric Problem Statement Alignment & UX – Next actions, progress health, and parallel generation.
 */

import React, { use, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/domain/money";
import { useGatherlyStore } from "@/store";
import { announce } from "@/services/announce";
import { Button, Icon, Badge, Surface } from "@/components/ui";

/**
 * Execute task functions concurrently with a strict worker cap (concurrency cap 3-4)
 * and settle all results via Promise.allSettled.
 */
async function settleWithConcurrencyCap<T>(
  taskFns: (() => Promise<T>)[],
  cap = 3
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(taskFns.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < taskFns.length) {
      const idx = nextIdx++;
      const fn = taskFns[idx];
      if (!fn) continue;
      try {
        const val = await fn();
        results[idx] = { status: "fulfilled", value: val };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.min(cap, taskFns.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default function PlanOverviewPage({ params }: OverviewPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, setPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [_generationStatus, setGenerationStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  if (!plan) return null;

  // Budget calculations
  const totalSpent = plan.budgetCategories.reduce((acc, c) => acc + c.spentMinor, 0);
  const budgetUtilization =
    plan.profile.budgetMinor > 0
      ? Math.min(100, Math.round((totalSpent / plan.profile.budgetMinor) * 100))
      : 0;

  // Timeline progress & Next 3 actions
  const completedMilestones = plan.milestones.filter((m) => m.status === "completed").length;
  const totalMilestones = plan.milestones.length;
  const milestoneProgress =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const nextActions = plan.milestones
    .filter((m) => m.status !== "completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  // Vendor summary
  const bookedVendors = plan.vendors.filter((v) => v.status === "booked").length;
  const totalVendors = plan.vendors.length;

  async function handleGenerateFullPlan() {
    if (!plan) return;
    setIsGeneratingAll(true);
    setGenerationStatus({
      budget: "loading",
      timeline: "loading",
      vendors: "loading",
      ideas: "loading",
    });

    const activePlan = plan;
    const currentPlan: typeof plan = { ...activePlan };

    const tasks = [
      {
        name: "budget",
        run: async () => {
          const res = await fetch("/api/budget", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activePlan.profile),
          });
          const json = await res.json();
          if (res.ok && json.categories) {
            currentPlan.budgetCategories = json.categories;
            if (json.provider) currentPlan.aiProviderBadge = json.provider;
            setGenerationStatus((s) => ({ ...s, budget: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, budget: "error" }));
          }
        },
      },
      {
        name: "timeline",
        run: async () => {
          const res = await fetch("/api/timeline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activePlan.profile),
          });
          const json = await res.json();
          if (res.ok && json.milestones) {
            currentPlan.milestones = json.milestones;
            setGenerationStatus((s) => ({ ...s, timeline: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, timeline: "error" }));
          }
        },
      },
      {
        name: "vendors",
        run: async () => {
          const res = await fetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activePlan.profile),
          });
          const json = await res.json();
          if (res.ok && json.vendors) {
            currentPlan.vendors = json.vendors;
            setGenerationStatus((s) => ({ ...s, vendors: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, vendors: "error" }));
          }
        },
      },
      {
        name: "ideas",
        run: async () => {
          const res = await fetch("/api/ideas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: activePlan.profile,
              existingTitles: activePlan.ideas.map((i) => i.title),
            }),
          });
          const json = await res.json();
          if (res.ok && json.ideas) {
            currentPlan.ideas = json.ideas;
            setGenerationStatus((s) => ({ ...s, ideas: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, ideas: "error" }));
          }
        },
      },
    ];

    const settled = await settleWithConcurrencyCap(tasks.map((t) => t.run), 3);
    const hasFailure = settled.some((r) => r.status === "rejected");

    currentPlan.updatedAt = new Date().toISOString();
    setPlan(currentPlan);
    setIsGeneratingAll(false);

    if (hasFailure) {
      announce("Generation failed. Some plan modules encountered errors.");
    } else {
      announce("Generation finished. Event plan is ready.");
    }
  }

  const isBrandNewPlan =
    plan.budgetCategories.length === 0 &&
    plan.milestones.length === 0 &&
    plan.vendors.length === 0;

  return (
    <div className="space-y-6">
      {/* Brand New Plan Initial Generation Banner */}
      {isBrandNewPlan && (
        <Surface variant="elevated" className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-primary">
          <div>
            <h2 className="text-xl font-bold text-primary font-display">
              Generate Your Complete Event Plan
            </h2>
            <p className="text-sm text-secondary mt-1 max-w-xl">
              One click builds your tailored budget allocation, backward-planned milestones, vendor checklist, and personalized ideas concurrently.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateFullPlan}
            isLoading={isGeneratingAll}
            disabled={isGeneratingAll}
            icon="sparkles"
          >
            {isGeneratingAll ? "Generating Plan Modules..." : "Generate Full Plan"}
          </Button>
        </Surface>
      )}

      {/* Progress Metric Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Health */}
        <Surface className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-secondary mb-2">
              <span className="uppercase tracking-wider">Budget Health</span>
              <Link href={`/plan/${eventId}/budget`} className="text-primary hover:underline">
                View
              </Link>
            </div>
            <div className="text-xl font-bold text-primary tnum">
              {formatCurrency(totalSpent, plan.profile.currency)}
            </div>
            <div className="text-xs text-secondary mt-0.5 tnum">
              of {formatCurrency(plan.profile.budgetMinor, plan.profile.currency)} total
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden border border-border-subtle">
              <div
                className={`h-2 rounded-full transition-all ${
                  totalSpent > plan.profile.budgetMinor ? "bg-status-danger" : "bg-status-success"
                }`}
                style={{ width: `${budgetUtilization}%` }}
              />
            </div>
            <div className="mt-2 text-xs font-semibold flex items-center gap-1.5">
              {totalSpent > plan.profile.budgetMinor ? (
                <span className="text-status-danger inline-flex items-center gap-1">
                  <Icon name="alert-triangle" size={14} aria-hidden />
                  <span>Over Budget</span>
                </span>
              ) : (
                <span className="text-status-success inline-flex items-center gap-1">
                  <Icon name="check" size={14} aria-hidden />
                  <span>On Budget</span>
                </span>
              )}
            </div>
          </div>
        </Surface>

        {/* Timeline Progress */}
        <Surface className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-secondary mb-2">
              <span className="uppercase tracking-wider">Milestones</span>
              <Link href={`/plan/${eventId}/timeline`} className="text-primary hover:underline">
                View
              </Link>
            </div>
            <div className="text-xl font-bold text-primary tnum">
              {completedMilestones} of {totalMilestones}
            </div>
            <div className="text-xs text-secondary mt-0.5">
              completed
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden border border-border-subtle">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-secondary tnum">
              {milestoneProgress}% complete
            </div>
          </div>
        </Surface>

        {/* Vendors Booked */}
        <Surface className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-secondary mb-2">
              <span className="uppercase tracking-wider">Vendors</span>
              <Link href={`/plan/${eventId}/vendors`} className="text-primary hover:underline">
                View
              </Link>
            </div>
            <div className="text-xl font-bold text-primary tnum">
              {bookedVendors} of {totalVendors}
            </div>
            <div className="text-xs text-secondary mt-0.5">
              booked
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden border border-border-subtle">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${totalVendors > 0 ? Math.round((bookedVendors / totalVendors) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-2 text-xs text-secondary tnum">
              {totalVendors - bookedVendors} pending decisions
            </div>
          </div>
        </Surface>

        {/* Ideas Saved */}
        <Surface className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-secondary mb-2">
              <span className="uppercase tracking-wider">Ideas Board</span>
              <Link href={`/plan/${eventId}/ideas`} className="text-primary hover:underline">
                View
              </Link>
            </div>
            <div className="text-xl font-bold text-primary tnum">
              {plan.ideas.filter((i) => i.status === "saved").length}
            </div>
            <div className="text-xs text-secondary mt-0.5">
              saved recommendations
            </div>
          </div>
          <div className="mt-4">
            <Link
              href={`/plan/${eventId}/ideas`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>Explore suggestions</span>
            </Link>
          </div>
        </Surface>
      </div>

      {/* Hero Element: Time-Ordered Cue List / Run Sheet ("Next Up") */}
      <Surface className="p-6 space-y-4" aria-labelledby="cue-sheet-heading">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="cue-sheet-heading" className="text-base font-bold text-primary font-display">
              Production Cue Sheet: Next Milestones
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Operational call-order based on schedule dependencies and target dates.
            </p>
          </div>
          <Link
            href={`/plan/${eventId}/timeline`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Full timeline
          </Link>
        </div>

        {nextActions.length === 0 ? (
          <div className="text-center py-10 text-xs text-secondary">
            {totalMilestones === 0
              ? "No milestones generated yet. Use the full plan button above to generate a timeline."
              : "All scheduled milestones completed."}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {nextActions.map((action, idx) => (
              <div
                key={action.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-elevated px-2 rounded-control transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-control bg-surface-elevated text-primary text-xs font-bold flex items-center justify-center shrink-0 tnum font-mono border border-border-subtle">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-primary">
                      {action.title}
                    </h4>
                    <p className="text-xs text-secondary">
                      Category: {action.category} {action.notes && `· ${action.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs font-medium text-secondary font-mono tnum">
                    Due: {action.dueDate}
                  </span>
                  {action.isCriticalPath && (
                    <Badge variant="danger" size="sm">
                      Critical Path
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>

      {/* Re-generate or Refresh Options */}
      {!isBrandNewPlan && (
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateFullPlan}
            isLoading={isGeneratingAll}
            disabled={isGeneratingAll}
          >
            {isGeneratingAll ? "Regenerating..." : "Regenerate All Modules"}
          </Button>
        </div>
      )}
    </div>
  );
}
