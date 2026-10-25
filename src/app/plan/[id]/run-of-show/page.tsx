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

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
            Day-of Run-of-Show
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Minute-by-minute execution schedule for coordinators, emcees, and vendor leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scheduleData && (
            <Button
              variant="secondary"
              size="sm"
              icon="download"
              onClick={handlePrint}
              title="Print printer-friendly execution schedule or save as PDF"
            >
              Print Schedule
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
              ? "Generating..."
              : scheduleData
              ? "Regenerate AI Schedule"
              : "Generate Run-of-Show"}
          </Button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-black font-display">{plan.profile.title} - Day-of Schedule</h1>
        <div className="text-sm text-gray-600 flex gap-4 mt-1">
          <span>Date: {plan.profile.eventDate}</span>
          <span>Location: {plan.profile.location || "TBD"}</span>
          <span>Guests: {plan.profile.guestCount}</span>
        </div>
      </div>

      {!scheduleData && !isLoading && (
        <Surface className="p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Icon name="clock" size="md" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
            No Day-of Schedule Generated Yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Click &quot;Generate Run-of-Show&quot; to build a chronological minute-by-minute schedule tailored to your {plan.profile.type}.
          </p>
          <Button
            variant="primary"
            size="md"
            icon="sparkles"
            onClick={handleGenerateSchedule}
          >
            Generate Run-of-Show
          </Button>
        </Surface>
      )}

      {scheduleData && (
        <>
          {/* Filters (Hidden during print) */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-md border border-neutral-200 dark:border-neutral-800 print:hidden">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Filter:</span>

            {areas.length > 0 && (
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                aria-label="Filter by location area"
                className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
              >
                <option value="all">All Areas</option>
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
                className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
              >
                <option value="all">All Owners / Roles</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}

            {(filterArea !== "all" || filterOwner !== "all") && (
              <button
                onClick={() => {
                  setFilterArea("all");
                  setFilterOwner("all");
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Schedule Table */}
          <Surface className="overflow-x-auto print:border-none print:shadow-none">
            <table className="w-full text-left text-xs print:text-xs" aria-label="Run of show schedule table">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider print:bg-gray-100 print:text-black">
                <tr>
                  <th scope="col" className="px-4 py-3 w-10 print:hidden">Done</th>
                  <th scope="col" className="px-4 py-3 w-28">Start Time</th>
                  <th scope="col" className="px-4 py-3 w-24">Duration</th>
                  <th scope="col" className="px-4 py-3">Activity &amp; Details</th>
                  <th scope="col" className="px-4 py-3 w-36">Owner / Role</th>
                  <th scope="col" className="px-4 py-3 w-36">Location Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 print:divide-gray-200">
                {filteredItems.map((item) => {
                  const isDone = !!checkedItems[item.id];

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors ${
                        isDone ? "bg-neutral-50/60 dark:bg-neutral-900/40 opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3 print:hidden">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${item.activity} completed`}
                          checked={isDone}
                          onChange={() => toggleItemDone(item.id)}
                          className="h-4 w-4 rounded-xs border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-neutral-100 print:text-black tnum">
                        {item.startTime}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500 print:text-gray-700 tnum">
                        {item.durationMinutes} min
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`font-semibold ${
                            isDone
                              ? "line-through text-neutral-400 dark:text-neutral-500"
                              : "text-neutral-900 dark:text-neutral-100 print:text-black"
                          }`}
                        >
                          {item.activity}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 print:text-gray-600 mt-0.5">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.ownerRole ? (
                          <Badge variant="neutral" size="sm">
                            {item.ownerRole}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 print:text-gray-700">
                        {item.locationArea || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Surface>
        </>
      )}
    </div>
  );
}

export default function PlanRunOfShowPage(props: RunOfShowPageProps) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-neutral-400">Loading schedule...</div>}>
      <RunOfShowPageInner {...props} />
    </React.Suspense>
  );
}
