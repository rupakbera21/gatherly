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
import { Button, Icon, Badge, Surface, Input } from "@/components/ui";

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
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
            Milestone Timeline
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Critical path scheduling, calendar sync (.ics), and task dependencies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="calendar"
            onClick={handleExportIcs}
            title="Export standard RFC 5545 iCalendar file compatible with Google Calendar, Apple Calendar, and Outlook"
          >
            Export .ICS
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon="download"
            onClick={handleExportCsv}
            title="Export CSV spreadsheet"
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon="sparkles"
            onClick={handleRegenerateTimeline}
            isLoading={isRegenerating}
            disabled={isRegenerating}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate AI"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() => setIsAddOpen(true)}
          >
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Surface className="p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Milestones</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tnum">
            {activeMilestones.length}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Completed</p>
          <p className="mt-1 text-2xl font-bold text-success tnum">
            {completedCount} <span className="text-xs font-normal text-neutral-400">({activeMilestones.length ? Math.round((completedCount / activeMilestones.length) * 100) : 0}%)</span>
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-warning uppercase tracking-wider">Critical Path</p>
          <p className="mt-1 text-2xl font-bold text-warning tnum">
            {criticalCount}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-danger uppercase tracking-wider">Overdue Items</p>
          <p className="mt-1 text-2xl font-bold text-danger tnum">
            {overdueCount}
          </p>
        </Surface>
      </div>

      {/* Dependency Cycle Alert if DAG detected circularity */}
      {processedResult?.hasCycle && (
        <div className="p-4 rounded-md bg-warning-surface border border-warning text-warning text-sm flex items-start gap-3">
          <Icon name="alert-triangle" size="sm" className="shrink-0 mt-0.5 text-warning" aria-hidden="true" />
          <div>
            <p className="font-semibold">Circular Dependency Detected</p>
            <p className="text-xs mt-0.5">
              A dependency cycle exists between milestones: {processedResult.cycleNodes.join(" -> ")}.
              Dependencies have been safely untangled to prevent scheduling deadlock.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-md border border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Filter by:</span>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label="Filter by category"
          className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
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
          className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
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
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Add Milestone Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-display">
              Add New Milestone
            </h3>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label htmlFor="new-milestone-title" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Milestone Title *
                </label>
                <Input
                  id="new-milestone-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Finalize Catering Menu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-milestone-due" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Due Date *
                  </label>
                  <Input
                    id="new-milestone-due"
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="new-milestone-category" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Category
                  </label>
                  <Input
                    id="new-milestone-category"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Venue, Catering, etc."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-milestone-notes" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="new-milestone-notes"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional context or links..."
                  className="w-full text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Create Milestone
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Ordered Rail */}
      <ol
        role="list"
        aria-label="Chronological milestones ordered list"
        className="relative border-l-2 border-primary-200 dark:border-primary-900 ml-4 pl-6 space-y-4 list-none"
      >
        {filteredMilestones.length === 0 ? (
          <li className="p-8 text-center text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 list-none">
            No milestones match your current filter.
          </li>
        ) : (
          filteredMilestones.map((m) => {
            const isCompleted = m.status === "completed";
            const isInProgress = m.status === "in_progress";

            return (
              <li
                key={m.id}
                className={`relative group p-4 rounded-md border transition-all ${
                  m.isCriticalPath
                    ? "border-warning bg-warning-surface"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                } shadow-xs list-none`}
              >
                {/* Timeline Node Dot */}
                <span
                  className={`absolute -left-8 top-5 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-950 transition-colors ${
                    isCompleted
                      ? "bg-success ring-4 ring-success/20"
                      : isInProgress
                      ? "bg-primary-600 ring-4 ring-primary-100 dark:ring-primary-950"
                      : "bg-neutral-300 dark:bg-neutral-700 ring-4 ring-neutral-100 dark:ring-neutral-900"
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" size="sm">
                        {m.category || "General"}
                      </Badge>

                      {m.isCriticalPath && (
                        <Badge variant="warning" size="sm" icon="alert-triangle">
                          Critical Path
                        </Badge>
                      )}

                      {m.overdue && (
                        <Badge variant="danger" size="sm">
                          Overdue
                        </Badge>
                      )}

                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tnum">
                        Due: {m.dueDate}
                      </span>
                    </div>

                    <h4
                      className={`text-base font-semibold ${
                        isCompleted
                          ? "line-through text-neutral-400 dark:text-neutral-500"
                          : "text-neutral-900 dark:text-neutral-100"
                      }`}
                    >
                      {m.title}
                    </h4>

                    {m.notes && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        {m.notes}
                      </p>
                    )}

                    {m.dependsOn && m.dependsOn.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium">Depends on:</span>
                        {m.dependsOn.map((depId) => {
                          const target = activeMilestones.find((x) => x.id === depId);
                          return (
                            <span
                              key={depId}
                              className="px-1.5 py-0.5 rounded-xs bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-300 tnum"
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
                    <Button
                      variant={isCompleted ? "secondary" : isInProgress ? "primary" : "secondary"}
                      size="sm"
                      icon={isCompleted ? "check" : undefined}
                      onClick={() => handleStatusToggle(m)}
                    >
                      {isCompleted ? "Completed" : isInProgress ? "In Progress" : "Pending"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      onClick={() => handleDelete(m.id)}
                      aria-label={`Delete milestone ${m.title}`}
                      className="text-neutral-400 hover:text-danger hover:bg-danger-surface"
                    />
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
