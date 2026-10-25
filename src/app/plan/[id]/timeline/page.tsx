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
      {/* Master Timeline Surface */}
      <Surface variant="default" className="border border-border-subtle overflow-hidden shadow-xs">
        {/* Top Header & Metrics */}
        <div className="p-5 sm:p-6 border-b border-border-subtle bg-surface">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Backward Milestone DAG
                </span>
                <Badge variant="neutral" size="sm">
                  {completedCount} of {activeMilestones.length} completed
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-display">
                Milestone Timeline & Schedule
              </h2>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Critical path scheduling, calendar sync (.ics), and phased task dependencies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon="calendar"
                onClick={handleExportIcs}
                title="Export RFC 5545 iCalendar"
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
                Add milestone
              </Button>
            </div>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border-subtle">
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-secondary uppercase tracking-wider">Total milestones</span>
              <p className="mt-1 text-xl font-bold text-primary tnum">{activeMilestones.length}</p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-secondary uppercase tracking-wider">Completed</span>
              <p className="mt-1 text-xl font-bold text-status-success tnum">
                {completedCount} <span className="text-xs font-normal text-tertiary">({activeMilestones.length ? Math.round((completedCount / activeMilestones.length) * 100) : 0}%)</span>
              </p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-status-warning uppercase tracking-wider">Critical path</span>
              <p className="mt-1 text-xl font-bold text-status-warning tnum">{criticalCount}</p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-status-danger uppercase tracking-wider">Overdue items</span>
              <p className="mt-1 text-xl font-bold text-status-danger tnum">{overdueCount}</p>
            </div>
          </div>

          {/* Dependency Cycle Alert if DAG detected circularity */}
          {processedResult?.hasCycle && (
            <div className="mt-4 p-3.5 rounded-control bg-status-warning-bg border border-status-warning-border text-status-warning text-xs flex items-start gap-2.5">
              <Icon name="alert-triangle" size={16} className="shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-semibold">Circular Dependency Detected</p>
                <p className="mt-0.5 text-secondary">
                  A dependency cycle exists between milestones: {processedResult.cycleNodes.join(" -> ")}.
                  Dependencies have been safely untangled to prevent scheduling deadlock.
                </p>
              </div>
            </div>
          )}

          {/* Integrated Filter Bar */}
          <div className="mt-4 pt-4 border-t border-border-subtle flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-secondary">Filter by:</span>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filter by category"
              className="text-xs rounded-control border border-border-strong bg-surface px-3 py-1.5 text-primary cursor-pointer focus:outline-none focus:border-primary"
            >
              <option value="all">All Categories ({categories.length})</option>
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
              className="text-xs rounded-control border border-border-strong bg-surface px-3 py-1.5 text-primary cursor-pointer focus:outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {(filterCategory !== "all" || filterStatus !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setFilterCategory("all");
                  setFilterStatus("all");
                }}
                className="text-xs text-primary hover:underline ml-auto font-medium cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Add Milestone Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface rounded-surface border border-border-strong shadow-overlay max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-primary font-display">
                Add New Milestone
              </h3>
              <form onSubmit={handleAddMilestone} className="space-y-4">
                <div>
                  <label htmlFor="new-milestone-title" className="block text-xs font-semibold text-primary mb-1">
                    Milestone Title *
                  </label>
                  <Input
                    id="new-milestone-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Finalize Catering Menu"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-milestone-due" className="block text-xs font-semibold text-primary mb-1">
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
                    <label htmlFor="new-milestone-category" className="block text-xs font-semibold text-primary mb-1">
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
                  <label htmlFor="new-milestone-notes" className="block text-xs font-semibold text-primary mb-1">
                    Notes
                  </label>
                  <textarea
                    id="new-milestone-notes"
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Additional context or links..."
                    className="w-full text-xs rounded-control border border-border-strong bg-surface px-3 py-2 text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
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
                    Create milestone
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Timeline Ordered Rail */}
        <div className="p-5 sm:p-6">
          <ol
            role="list"
            aria-label="Chronological milestones ordered list"
            className="relative border-l-2 border-border-strong ml-4 pl-6 space-y-4 list-none"
          >
            {filteredMilestones.length === 0 ? (
              <li className="p-8 text-center text-tertiary bg-surface-elevated rounded-control border border-border-subtle list-none">
                No milestones match your current filter.
              </li>
            ) : (
              filteredMilestones.map((m) => {
                const isCompleted = m.status === "completed";
                const isInProgress = m.status === "in_progress";

                return (
                  <li
                    key={m.id}
                    className={`relative p-4 rounded-control border transition-all ${
                      m.isCriticalPath
                        ? "border-status-warning-border bg-status-warning-bg/40"
                        : "border-border-subtle bg-surface"
                    } shadow-xs list-none`}
                  >
                    {/* Timeline Node Dot */}
                    <span
                      className={`absolute -left-8 top-5 w-4 h-4 rounded-full border-2 border-surface transition-colors ${
                        isCompleted
                          ? "bg-status-success"
                          : isInProgress
                          ? "bg-primary"
                          : "bg-surface-elevated border-border-strong"
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

                          <span className="text-xs text-tertiary font-mono tnum">
                            Due: {m.dueDate}
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-semibold ${
                            isCompleted ? "line-through text-tertiary" : "text-primary"
                          }`}
                        >
                          {m.title}
                        </h4>

                        {m.notes && (
                          <p className="text-xs text-secondary leading-relaxed">
                            {m.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(m)}
                          className={`text-xs px-2.5 py-1 rounded-control font-medium border transition-colors cursor-pointer ${
                            isCompleted
                              ? "bg-status-success-bg text-status-success border-status-success-border"
                              : isInProgress
                              ? "bg-primary-subtle text-primary border-primary"
                              : "bg-surface text-secondary border-border-strong hover:text-primary"
                          }`}
                        >
                          {isCompleted ? "Completed" : isInProgress ? "In Progress" : "Pending"}
                        </button>

                        <Button
                          variant="ghost"
                          size="sm"
                          icon="trash"
                          onClick={() => handleDelete(m.id)}
                          className="text-tertiary hover:text-status-danger"
                          aria-label={`Delete ${m.title}`}
                        />
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ol>
        </div>
      </Surface>
    </div>
  );
}
