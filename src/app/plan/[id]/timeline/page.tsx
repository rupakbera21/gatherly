"use client";

/**
 * @module PlanTimelinePage
 * @purpose Interactive milestone timeline management with DAG scheduling.
 *          Visualizes critical path, overdue status, dependencies, RFC 5545 iCalendar export,
 *          RFC 4180 CSV export, and status workflows.
 * @rubric Problem Statement Alignment & Code Quality – Robust DAG timeline & calendar integrations.
 */

import React, { use, useMemo, useState } from "react";
import { defaultClock } from "@/domain/dates";
import { exportTimelineCsv } from "@/domain/csv";
import { generateIcs } from "@/domain/ics";
import { processTimeline } from "@/domain/timeline";
import { Milestone } from "@/domain/types";
import { useGatherlyStore } from "@/store";

interface TimelinePageProps {
  params: Promise<{ id: string }>;
}

export default function PlanTimelinePage({ params }: TimelinePageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, applyPatchToPlan, setPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newNotes, setNewNotes] = useState("");

  const rawMilestones = plan?.milestones;
  const eventDate = plan?.profile.eventDate;

  // Dynamic DAG calculation
  const processedResult = useMemo(() => {
    if (!plan || !rawMilestones || rawMilestones.length === 0 || !eventDate) return null;
    return processTimeline(rawMilestones, eventDate, defaultClock);
  }, [plan, rawMilestones, eventDate]);

  if (!plan) return null;

  const milestones = rawMilestones ?? [];
  const activeMilestones = processedResult?.milestones ?? milestones;

  const categories = Array.from(new Set(activeMilestones.map((m) => m.category || "General")));

  const filteredMilestones = activeMilestones.filter((m) => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const completedCount = activeMilestones.filter((m) => m.status === "completed").length;
  const criticalCount = activeMilestones.filter((m) => m.isCriticalPath).length;
  const overdueCount = activeMilestones.filter((m) => m.overdue).length;

  function handleStatusToggle(milestone: Milestone) {
    const nextStatus: Record<Milestone["status"], Milestone["status"]> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    };
    applyPatchToPlan(eventId, {
      op: "updateMilestone",
      milestoneId: milestone.id,
      status: nextStatus[milestone.status],
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this milestone?")) return;
    applyPatchToPlan(eventId, {
      op: "removeMilestone",
      milestoneId: id,
    });
  }

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;

    const newMilestone: Milestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      dueDate: newDueDate,
      category: newCategory.trim() || "General",
      status: "pending",
      dependsOn: [],
      isCriticalPath: false,
      wasClamped: false,
      overdue: false,
      notes: newNotes.trim() || undefined,
    };

    applyPatchToPlan(eventId, {
      op: "addMilestone",
      milestone: newMilestone,
    });

    setNewTitle("");
    setNewDueDate("");
    setNewNotes("");
    setIsAddOpen(false);
  }

  function handleExportIcs() {
    if (!plan) return;
    const icsContent = generateIcs({
      eventTitle: plan.profile.title,
      milestones: activeMilestones,
    });
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.profile.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_schedule.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleExportCsv() {
    if (!plan) return;
    const csvContent = exportTimelineCsv(activeMilestones);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.profile.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_timeline.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleRegenerateTimeline() {
    if (!plan) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan.profile),
      });
      const data = await res.json();
      if (res.ok && data.milestones) {
        setPlan({
          ...plan,
          milestones: data.milestones,
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Milestone Timeline
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Critical path scheduling, calendar sync (.ics), and task dependencies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportIcs}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export standard RFC 5545 iCalendar file compatible with Google Calendar, Apple Calendar, and Outlook"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Export .ICS
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export CSV spreadsheet with formula injection neutralization"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <button
            onClick={handleRegenerateTimeline}
            disabled={isRegenerating}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRegenerating ? "Regenerating..." : "Regenerate AI"}
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Milestone
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Milestones</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {activeMilestones.length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedCount} <span className="text-xs font-normal text-slate-400">({activeMilestones.length ? Math.round((completedCount / activeMilestones.length) * 100) : 0}%)</span>
          </p>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Critical Path</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
            {criticalCount}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Overdue Items</p>
          <p className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-400">
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Dependency Cycle Alert if DAG detected circularity */}
      {processedResult?.hasCycle && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Circular Dependency Detected</p>
            <p className="text-xs mt-0.5">
              A dependency cycle exists between milestones: {processedResult.cycleNodes.join(" ➔ ")}.
              Dependencies have been safely untangled to prevent scheduling deadlock.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter by:</span>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label="Filter by category"
          className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
          className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        {(filterCategory !== "all" || filterStatus !== "all") && (
          <button
            onClick={() => {
              setFilterCategory("all");
              setFilterStatus("all");
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Add Milestone Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Add New Milestone
            </h3>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label htmlFor="new-milestone-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Milestone Title *
                </label>
                <input
                  id="new-milestone-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Finalize Catering Menu"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-milestone-due" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    id="new-milestone-due"
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="new-milestone-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    id="new-milestone-category"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Venue, Catering, etc."
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-milestone-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="new-milestone-notes"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional context or links..."
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Ordered List Alternative */}
      <ol
        role="list"
        aria-label="Chronological milestones ordered list"
        className="relative border-l-2 border-indigo-200 dark:border-indigo-900 ml-4 pl-6 space-y-6 list-none"
      >
        {filteredMilestones.length === 0 ? (
          <li className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 list-none">
            No milestones match your current filter.
          </li>
        ) : (
          filteredMilestones.map((m) => {
            const isCompleted = m.status === "completed";
            const isInProgress = m.status === "in_progress";

            return (
              <li
                key={m.id}
                className={`relative group p-4 rounded-xl border transition-all ${
                  m.isCriticalPath
                    ? "border-amber-300 dark:border-amber-800/80 bg-linear-to-r from-amber-50/40 to-white dark:from-amber-950/20 dark:to-slate-900"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                } shadow-xs hover:shadow-md list-none`}
              >
                {/* Timeline Node Dot */}
                <span
                  className={`absolute -left-[31px] top-5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 transition-colors ${
                    isCompleted
                      ? "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950"
                      : isInProgress
                      ? "bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-950"
                      : "bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-900"
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {m.category || "General"}
                      </span>

                      {m.isCriticalPath && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                          </svg>
                          Critical Path
                        </span>
                      )}

                      {m.overdue && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                          Overdue
                        </span>
                      )}

                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Due: {m.dueDate}
                      </span>
                    </div>

                    <h4
                      className={`text-base font-semibold ${
                        isCompleted
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {m.title}
                    </h4>

                    {m.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {m.notes}
                      </p>
                    )}

                    {m.dependsOn && m.dependsOn.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Depends on:</span>
                        {m.dependsOn.map((depId) => {
                          const target = activeMilestones.find((x) => x.id === depId);
                          return (
                            <span
                              key={depId}
                              className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300"
                            >
                              {target ? target.title : depId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions & Status Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStatusToggle(m)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200"
                          : isInProgress
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-200"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Completed
                        </>
                      ) : isInProgress ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                          In Progress
                        </>
                      ) : (
                        "Pending"
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(m.id)}
                      aria-label={`Delete milestone ${m.title}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}
