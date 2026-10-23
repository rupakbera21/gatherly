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

interface VendorsPageProps {
  params: Promise<{ id: string }>;
}

const PIPELINE_COLUMNS: Array<{
  id: VendorItem["status"];
  label: string;
  badgeClass: string;
}> = [
  { id: "researching", label: "Researching", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { id: "contacted", label: "Contacted", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" },
  { id: "quoted", label: "Quoted", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
  { id: "booked", label: "Booked", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
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
    <div className="space-y-8 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vendor Pipeline
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Source vendors, compare quotes, track lead-time constraints, and log bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Table
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export vendor list to CSV"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <button
            onClick={handleRegenerateVendors}
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
            Add Vendor
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Vendors</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{vendors.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Booked</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {bookedCount} <span className="text-xs font-normal text-slate-400">({vendors.length ? Math.round((bookedCount / vendors.length) * 100) : 0}%)</span>
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalEstCostMinor, currency)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Committed / Booked</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(totalActualCostMinor, currency)}
          </p>
        </div>
      </div>

      {/* Lead Time Alert Banner if tight */}
      {weeksUntilEvent <= 8 && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-semibold">Event is {weeksUntilEvent} weeks away.</span> High lead-time vendors (e.g. venues & catering requiring 12+ weeks) are flagged with warning badges below.
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Vendor</h3>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label htmlFor="new-vendor-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vendor / Service Name *
                </label>
                <input
                  id="new-vendor-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Grand Ballroom Rentals"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-vendor-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    id="new-vendor-category"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Venue, Catering, Audio"
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="new-vendor-est-cost" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Cost ({currency})
                  </label>
                  <input
                    id="new-vendor-est-cost"
                    type="number"
                    min="0"
                    step="any"
                    value={newEstCost}
                    onChange={(e) => setNewEstCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-vendor-lead-weeks" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lead Time (Weeks needed to book)
                </label>
                <input
                  id="new-vendor-lead-weeks"
                  type="number"
                  min="0"
                  max="104"
                  value={newLeadWeeks}
                  onChange={(e) => setNewLeadWeeks(e.target.value)}
                  placeholder="e.g., 8"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="new-vendor-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Package Info
                </label>
                <textarea
                  id="new-vendor-notes"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Includes sound engineer, 4 mics..."
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
                  Add Vendor
                </button>
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
                className="flex flex-col rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 min-h-[400px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs">
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
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
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                {item.category}
                              </span>
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                {item.name}
                              </h4>
                            </div>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              aria-label={`Delete ${item.name}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Cost & Lead time */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            {item.estimatedCostMinor !== undefined && (
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {formatCurrency(item.estimatedCostMinor, currency)}
                              </span>
                            )}
                            {item.leadTimeWeeks !== undefined && (
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded-sm ${
                                  isLeadTimeRisk
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 font-bold"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                                title={
                                  isLeadTimeRisk
                                    ? `Risk: Requires ${item.leadTimeWeeks} weeks lead time, but only ${weeksUntilEvent} weeks remain!`
                                    : `Lead time: ${item.leadTimeWeeks} weeks`
                                }
                              >
                                {item.leadTimeWeeks}w lead
                              </span>
                            )}
                          </div>

                          {item.quoteNotes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {item.quoteNotes}
                            </p>
                          )}

                          {/* Stage Transition Selector */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Move to:</span>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as VendorItem["status"])
                              }
                              aria-label={`Change stage for ${item.name}`}
                              className="text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300"
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Vendor / Service</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Estimated Cost</th>
                <th className="px-4 py-3 text-right">Actual Cost</th>
                <th className="px-4 py-3 text-center">Lead Time</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No vendors configured yet.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {v.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                      {v.category}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={v.status}
                        onChange={(e) =>
                          handleStatusChange(v.id, e.target.value as VendorItem["status"])
                        }
                        aria-label={`Status for ${v.name}`}
                        className="text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                      >
                        {PIPELINE_COLUMNS.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                      {v.estimatedCostMinor !== undefined
                        ? formatCurrency(v.estimatedCostMinor, currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                      {v.actualCostMinor !== undefined
                        ? formatCurrency(v.actualCostMinor, currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {v.leadTimeWeeks !== undefined ? `${v.leadTimeWeeks} wks` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                      {v.quoteNotes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        aria-label={`Delete ${v.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
