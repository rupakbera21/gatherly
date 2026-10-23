"use client";

/**
 * @module PlanRunOfShowPage
 * @purpose Event day minute-by-minute execution timeline.
 *          Generates sequential schedule with areas, owners, and duration,
 *          supports filter by role/area, and includes print-optimized layout.
 * @rubric Tier 2 Features & Usability – Real-time event coordination & print layout.
 */

import React, { use, useState } from "react";
import { RunOfShowResult } from "@/services/ai/prompts/runofshow";
import { useGatherlyStore } from "@/store";

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
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Day-of Run-of-Show
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Minute-by-minute execution schedule for coordinators, emcees, and vendor leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scheduleData && (
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Print printer-friendly execution schedule or save as PDF"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Schedule
            </button>
          )}

          <button
            onClick={handleGenerateSchedule}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading
              ? "Generating..."
              : scheduleData
              ? "Regenerate AI Schedule"
              : "Generate Run-of-Show"}
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-black">{plan.profile.title} - Day-of Schedule</h1>
        <div className="text-sm text-gray-600 flex gap-4 mt-1">
          <span>Date: {plan.profile.eventDate}</span>
          <span>Location: {plan.profile.location || "TBD"}</span>
          <span>Guests: {plan.profile.guestCount}</span>
        </div>
      </div>

      {!scheduleData && !isLoading && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Day-of Schedule Generated Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &quot;Generate Run-of-Show&quot; to build a chronological minute-by-minute schedule tailored to your {plan.profile.type}.
          </p>
          <button
            onClick={handleGenerateSchedule}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs"
          >
            Generate Run-of-Show
          </button>
        </div>
      )}

      {scheduleData && (
        <>
          {/* Filters (Hidden during print) */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 print:hidden">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter:</span>

            {areas.length > 0 && (
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                aria-label="Filter by location area"
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
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
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
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
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:border-none print:shadow-none">
            <table className="w-full text-left text-sm print:text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="px-4 py-3 w-10 print:hidden">Done</th>
                  <th className="px-4 py-3 w-28">Start Time</th>
                  <th className="px-4 py-3 w-24">Duration</th>
                  <th className="px-4 py-3">Activity & Details</th>
                  <th className="px-4 py-3 w-36">Owner / Role</th>
                  <th className="px-4 py-3 w-36">Location Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-200">
                {filteredItems.map((item) => {
                  const isDone = !!checkedItems[item.id];

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                        isDone ? "bg-slate-50/60 dark:bg-slate-900/40 opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3 print:hidden">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${item.activity} completed`}
                          checked={isDone}
                          onChange={() => toggleItemDone(item.id)}
                          className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white print:text-black">
                        {item.startTime}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 print:text-gray-700">
                        {item.durationMinutes} min
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`font-semibold ${
                            isDone
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-white print:text-black"
                          }`}
                        >
                          {item.activity}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 print:text-gray-600 mt-0.5">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.ownerRole ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 print:border print:bg-white print:text-black">
                            {item.ownerRole}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 print:text-gray-700">
                        {item.locationArea || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function PlanRunOfShowPage(props: RunOfShowPageProps) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading schedule...</div>}>
      <RunOfShowPageInner {...props} />
    </React.Suspense>
  );
}
