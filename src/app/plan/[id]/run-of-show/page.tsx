"use client";

/**
 * @module PlanRunOfShowPage
 * @purpose Event day minute-by-minute execution timeline and cue list.
 *          Generates sequential schedule with areas, owners, and duration,
 *          supports filter by role/area, and includes print-optimized layout.
 * @rubric Tier 2 Features & Usability – Real-time event coordination & print layout.
 */

import React, { use, useState } from "react";
import { RunOfShowResult } from "@/services/ai/prompts/runofshow";
import { useGatherlyStore } from "@/store";
import { Button, Icon, Badge, Surface } from "@/components/ui";

interface RunOfShowPageProps {
  params: Promise<{ id: string }>;
}

function RunOfShowPageInner({ params }: RunOfShowPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events } = useGatherlyStore();
  const plan = events[eventId];

  const [isLoading, setIsLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState<RunOfShowResult | null>(null);
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  if (!plan) return null;

  async function handleGenerateSchedule() {
    if (!plan) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/run-of-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: plan.profile,
        }),
      });
      const data = await res.json();
      if (res.ok && data.scheduleItems) {
        setScheduleData(data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function toggleItemDone(id: string) {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handlePrint() {
    window.print();
  }

  const items = scheduleData?.scheduleItems ?? [];
  const areas = Array.from(new Set(items.map((i) => i.locationArea).filter(Boolean)));
  const owners = Array.from(new Set(items.map((i) => i.ownerRole).filter(Boolean)));

  const filteredItems = items.filter((item) => {
    if (filterArea !== "all" && item.locationArea !== filterArea) return false;
    if (filterOwner !== "all" && item.ownerRole !== filterOwner) return false;
    return true;
  });

  const completedCount = items.filter((i) => !!checkedItems[i.id]).length;

  return (
    <div className="space-y-6">
      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block border-b border-border-strong pb-4 mb-4">
        <h1 className="text-2xl font-bold text-primary font-display">{plan.profile.title} - Day-of Call Sheet</h1>
        <div className="text-sm text-secondary flex gap-4 mt-1">
          <span>Date: {plan.profile.eventDate}</span>
          <span>Location: {plan.profile.location || "TBD"}</span>
          <span>Guests: {plan.profile.guestCount}</span>
        </div>
      </div>

      {/* Unified Master Execution Surface */}
      <Surface variant="default" className="overflow-hidden border border-border-subtle shadow-xs">
        {/* Call Sheet Header & Global Actions */}
        <div className="p-5 sm:p-6 border-b border-border-subtle bg-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Execution Call Sheet
                </span>
                {items.length > 0 && (
                  <Badge variant="neutral" size="sm">
                    {completedCount} of {items.length} completed
                  </Badge>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-display">
                Day-of Run-of-Show
              </h2>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Minute-by-minute execution schedule for coordinators, emcees, and vendor leads.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {scheduleData && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="download"
                  onClick={handlePrint}
                  title="Print execution schedule or save as PDF"
                >
                  Print schedule
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                icon="sparkles"
                onClick={handleGenerateSchedule}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading
                  ? "Generating schedule..."
                  : scheduleData
                  ? "Regenerate schedule"
                  : "Generate run-of-show"}
              </Button>
            </div>
          </div>

          {/* Integrated Filter Toolbar (Inside the same continuous surface) */}
          {scheduleData && (
            <div className="mt-5 pt-4 border-t border-border-subtle flex flex-wrap items-center gap-3 print:hidden">
              <span className="text-xs font-semibold text-secondary">Filters:</span>

              {areas.length > 0 && (
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  aria-label="Filter by location area"
                  className="text-xs rounded-control border border-border-strong bg-surface px-3 py-1.5 text-primary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All Areas ({areas.length})</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}

              {owners.length > 0 && (
                <select
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  aria-label="Filter by owner or role"
                  className="text-xs rounded-control border border-border-strong bg-surface px-3 py-1.5 text-primary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All Roles ({owners.length})</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}

              {(filterArea !== "all" || filterOwner !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterArea("all");
                    setFilterOwner("all");
                  }}
                  className="text-xs text-primary hover:underline ml-auto font-medium cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Empty State */}
        {!scheduleData && !isLoading && (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary-subtle flex items-center justify-center text-primary">
              <Icon name="clock" size={20} aria-hidden />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-primary font-display">
                No Day-of Schedule Generated Yet
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Build a chronological minute-by-minute execution schedule with stage cues and role owners tailored to your {plan.profile.type}.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon="sparkles"
              onClick={handleGenerateSchedule}
            >
              Generate run-of-show
            </Button>
          </div>
        )}

        {/* Live Integrated Table */}
        {scheduleData && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Run of show schedule table">
              <thead className="bg-surface-elevated text-xs font-semibold text-secondary border-b border-border-subtle uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3 w-12 print:hidden text-center">Done</th>
                  <th scope="col" className="px-4 py-3 w-28">Start time</th>
                  <th scope="col" className="px-4 py-3 w-24">Duration</th>
                  <th scope="col" className="px-4 py-3">Activity &amp; Cue Details</th>
                  <th scope="col" className="px-4 py-3 w-40">Role owner</th>
                  <th scope="col" className="px-4 py-3 w-40">Location area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredItems.map((item) => {
                  const isDone = !!checkedItems[item.id];

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface-elevated transition-colors ${
                        isDone ? "bg-surface-elevated/60 opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 print:hidden text-center">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${item.activity} completed`}
                          checked={isDone}
                          onChange={() => toggleItemDone(item.id)}
                          className="h-4 w-4 rounded-control border-border-strong text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-primary tnum whitespace-nowrap">
                        {item.startTime}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-tertiary tnum whitespace-nowrap">
                        {item.durationMinutes} min
                      </td>
                      <td className="px-4 py-3.5">
                        <div
                          className={`font-semibold text-sm ${
                            isDone
                              ? "line-through text-tertiary"
                              : "text-primary"
                          }`}
                        >
                          {item.activity}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-secondary mt-1 leading-relaxed">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.ownerRole ? (
                          <Badge variant="neutral" size="sm">
                            {item.ownerRole}
                          </Badge>
                        ) : (
                          <span className="text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-secondary whitespace-nowrap">
                        {item.locationArea || <span className="text-tertiary">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

export default function PlanRunOfShowPage(props: RunOfShowPageProps) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-tertiary">Loading schedule...</div>}>
      <RunOfShowPageInner {...props} />
    </React.Suspense>
  );
}
