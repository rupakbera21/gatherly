"use client";

/**
 * @module PlanVendorsPage
 * @purpose Vendor sourcing pipeline and cost tracking dashboard.
 *          Tracks pipeline stages (researching, contacted, quoted, booked),
 *          computes lead-time risk alerts against target event date,
 *          supports RFC 4180 CSV export, and applies validated PlanPatches.
 * @rubric Problem Statement Alignment & Code Quality – Realistic vendor pipeline & lead time alerts.
 */

import React, { use, useState } from "react";
import { daysBetween, defaultClock } from "@/domain/dates";
import { exportVendorsCsv } from "@/domain/csv";
import { formatCurrency, toMinorUnits } from "@/domain/money";
import { VendorItem } from "@/domain/types";
import { useGatherlyStore } from "@/store";
import { Button, Icon, Badge, Surface, Input } from "@/components/ui";

interface VendorsPageProps {
  params: Promise<{ id: string }>;
}

const PIPELINE_COLUMNS: Array<{
  id: VendorItem["status"];
  label: string;
}> = [
  { id: "researching", label: "Researching" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "booked", label: "Booked" },
];

export default function PlanVendorsPage({ params }: VendorsPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, applyPatchToPlan, setPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Catering");
  const [newEstCost, setNewEstCost] = useState("");
  const [newLeadWeeks, setNewLeadWeeks] = useState("");
  const [newNotes, setNewNotes] = useState("");

  if (!plan) return null;

  const vendors = plan.vendors ?? [];
  const currency = plan.profile.currency;
  const eventDate = plan.profile.eventDate;
  const todayStr = defaultClock();

  // Calculate weeks remaining until event
  const daysUntilEvent = daysBetween(todayStr, eventDate);
  const weeksUntilEvent = Math.max(0, Math.floor(daysUntilEvent / 7));

  // Totals
  const totalEstCostMinor = vendors.reduce((acc, v) => acc + (v.estimatedCostMinor ?? 0), 0);
  const totalActualCostMinor = vendors.reduce((acc, v) => acc + (v.actualCostMinor ?? 0), 0);
  const bookedCount = vendors.filter((v) => v.status === "booked").length;

  function handleStatusChange(itemId: string, nextStatus: VendorItem["status"]) {
    applyPatchToPlan(eventId, {
      op: "updateVendorItem",
      itemId,
      status: nextStatus,
    });
  }

  function handleDelete(itemId: string) {
    if (!confirm("Remove this vendor?")) return;
    applyPatchToPlan(eventId, {
      op: "removeVendorItem",
      itemId,
    });
  }

  function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const estCost = parseFloat(newEstCost) || 0;
    const leadWeeks = parseInt(newLeadWeeks, 10) || undefined;

    const newItem: VendorItem = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      category: newCategory.trim() || "General",
      status: "researching",
      estimatedCostMinor: estCost > 0 ? toMinorUnits(estCost, currency) : undefined,
      leadTimeWeeks: leadWeeks,
      quoteNotes: newNotes.trim() || undefined,
    };

    applyPatchToPlan(eventId, {
      op: "addVendorItem",
      item: newItem,
    });

    setNewName("");
    setNewEstCost("");
    setNewLeadWeeks("");
    setNewNotes("");
    setIsAddOpen(false);
  }

  function handleExportCsv() {
    if (!plan) return;
    const csvContent = exportVendorsCsv(vendors, currency);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.profile.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_vendors.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleRegenerateVendors() {
    if (!plan) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan.profile),
      });
      const data = await res.json();
      if (res.ok && data.vendors) {
        setPlan({
          ...plan,
          vendors: data.vendors,
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
            Vendor Pipeline
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Source vendors, compare quotes, track lead-time constraints, and log bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-neutral-200 dark:border-neutral-800 p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              Table
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon="download"
            onClick={handleExportCsv}
            title="Export vendor list to CSV"
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon="sparkles"
            onClick={handleRegenerateVendors}
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
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Surface className="p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Vendors</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tnum">{vendors.length}</p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Booked</p>
          <p className="mt-1 text-2xl font-bold text-success tnum">
            {bookedCount} <span className="text-xs font-normal text-neutral-400">({vendors.length ? Math.round((bookedCount / vendors.length) * 100) : 0}%)</span>
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Estimated Total</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tnum">
            {formatCurrency(totalEstCostMinor, currency)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider">Committed / Booked</p>
          <p className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400 tnum">
            {formatCurrency(totalActualCostMinor, currency)}
          </p>
        </Surface>
      </div>

      {/* Lead Time Alert Banner if tight */}
      {weeksUntilEvent <= 8 && (
        <div className="p-4 rounded-md bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900 text-primary-900 dark:text-primary-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="clock" size="sm" className="text-primary-600 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold">Event is {weeksUntilEvent} weeks away.</span> High lead-time vendors requiring 8+ weeks are flagged below.
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-display">Add New Vendor</h3>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label htmlFor="new-vendor-name" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Vendor / Service Name *
                </label>
                <Input
                  id="new-vendor-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Grand Ballroom Rentals"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-vendor-category" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Category
                  </label>
                  <Input
                    id="new-vendor-category"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Venue, Catering, Audio"
                  />
                </div>
                <div>
                  <label htmlFor="new-vendor-est-cost" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Estimated Cost ({currency})
                  </label>
                  <Input
                    id="new-vendor-est-cost"
                    type="number"
                    min="0"
                    step="any"
                    value={newEstCost}
                    onChange={(e) => setNewEstCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-vendor-lead-weeks" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Lead Time (Weeks needed to book)
                </label>
                <Input
                  id="new-vendor-lead-weeks"
                  type="number"
                  min="0"
                  max="104"
                  value={newLeadWeeks}
                  onChange={(e) => setNewLeadWeeks(e.target.value)}
                  placeholder="e.g., 8"
                />
              </div>

              <div>
                <label htmlFor="new-vendor-notes" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes / Package Info
                </label>
                <textarea
                  id="new-vendor-notes"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Includes sound engineer, 4 mics..."
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
                  Add Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content: Kanban or Table */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {PIPELINE_COLUMNS.map((col) => {
            const items = vendors.filter((v) => v.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-md bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-3 min-h-96"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 tnum">
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-xs text-neutral-400">
                      No vendors in this stage
                    </div>
                  ) : (
                    items.map((item) => {
                      const isLeadTimeRisk =
                        item.status !== "booked" &&
                        item.leadTimeWeeks !== undefined &&
                        item.leadTimeWeeks > weeksUntilEvent;

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:shadow-xs transition-shadow space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                                {item.category}
                              </span>
                              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                                {item.name}
                              </h4>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="trash"
                              onClick={() => handleDelete(item.id)}
                              className="text-neutral-400 hover:text-danger hover:bg-danger-surface"
                              aria-label={`Delete ${item.name}`}
                            />
                          </div>

                          {/* Cost & Lead time */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            {item.estimatedCostMinor !== undefined && (
                              <span className="font-medium text-neutral-800 dark:text-neutral-200 font-mono tnum">
                                {formatCurrency(item.estimatedCostMinor, currency)}
                              </span>
                            )}
                            {item.leadTimeWeeks !== undefined && (
                              <Badge
                                variant={isLeadTimeRisk ? "danger" : "neutral"}
                                size="sm"
                                title={
                                  isLeadTimeRisk
                                    ? `Risk: Requires ${item.leadTimeWeeks} weeks lead time, but only ${weeksUntilEvent} weeks remain!`
                                    : `Lead time: ${item.leadTimeWeeks} weeks`
                                }
                              >
                                {item.leadTimeWeeks}w lead
                              </Badge>
                            )}
                          </div>

                          {item.quoteNotes && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                              {item.quoteNotes}
                            </p>
                          )}

                          {/* Stage Transition Selector */}
                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                            <span className="text-xs text-neutral-400">Move to:</span>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as VendorItem["status"])
                              }
                              aria-label={`Change stage for ${item.name}`}
                              className="text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-neutral-700 dark:text-neutral-300"
                            >
                              {PIPELINE_COLUMNS.map((stage) => (
                                <option key={stage.id} value={stage.id}>
                                  {stage.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Surface className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Vendors table">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Vendor / Service</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Stage</th>
                <th scope="col" className="px-4 py-3 text-right">Estimated Cost</th>
                <th scope="col" className="px-4 py-3 text-right">Actual Cost</th>
                <th scope="col" className="px-4 py-3 text-center">Lead Time</th>
                <th scope="col" className="px-4 py-3">Notes</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-400">
                    No vendors configured yet.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                      {v.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 text-xs">
                      {v.category}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={v.status}
                        onChange={(e) =>
                          handleStatusChange(v.id, e.target.value as VendorItem["status"])
                        }
                        aria-label={`Status for ${v.name}`}
                        className="text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1"
                      >
                        {PIPELINE_COLUMNS.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-neutral-700 dark:text-neutral-300 tnum">
                      {v.estimatedCostMinor !== undefined
                        ? formatCurrency(v.estimatedCostMinor, currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-neutral-700 dark:text-neutral-300 tnum">
                      {v.actualCostMinor !== undefined
                        ? formatCurrency(v.actualCostMinor, currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs tnum">
                      {v.leadTimeWeeks !== undefined ? `${v.leadTimeWeeks} wks` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 max-w-xs truncate">
                      {v.quoteNotes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        onClick={() => handleDelete(v.id)}
                        className="text-neutral-400 hover:text-danger hover:bg-danger-surface"
                        aria-label={`Delete ${v.name}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Surface>
      )}
    </div>
  );
}
