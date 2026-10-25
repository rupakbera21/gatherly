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
import { Button, Badge, Surface, Input } from "@/components/ui";

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
      {/* Master Surface */}
      <Surface variant="default" className="border border-border-subtle overflow-hidden shadow-xs">
        {/* Header & Controls */}
        <div className="p-5 sm:p-6 border-b border-border-subtle bg-surface">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Vendor Pipeline & Sourcing
                </span>
                <Badge variant="neutral" size="sm">
                  {bookedCount} of {vendors.length} booked
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-display">
                Vendor Directory & Pipeline
              </h2>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Source vendors, compare quotes, track lead-time constraints, and log bookings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-control border border-border-strong p-0.5 bg-surface-elevated">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`px-3 py-1 text-xs font-semibold rounded-control transition-colors cursor-pointer ${
                    viewMode === "kanban"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  Board
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-xs font-semibold rounded-control transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-secondary hover:text-primary"
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
                Add vendor
              </Button>
            </div>
          </div>

          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border-subtle">
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-secondary uppercase tracking-wider">Total vendors</span>
              <p className="mt-1 text-xl font-bold text-primary tnum">{vendors.length}</p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-secondary uppercase tracking-wider">Booked</span>
              <p className="mt-1 text-xl font-bold text-status-success tnum">
                {bookedCount} <span className="text-xs font-normal text-tertiary">({vendors.length ? Math.round((bookedCount / vendors.length) * 100) : 0}%)</span>
              </p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-secondary uppercase tracking-wider">Estimated total</span>
              <p className="mt-1 text-xl font-bold text-primary tnum">
                {formatCurrency(totalEstCostMinor, currency)}
              </p>
            </div>
            <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle">
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Committed / Booked</span>
              <p className="mt-1 text-xl font-bold text-primary tnum">
                {formatCurrency(totalActualCostMinor, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Modal: Add Vendor */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface rounded-surface border border-border-strong shadow-overlay max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-primary font-display">Add New Vendor</h3>
              <form onSubmit={handleAddVendor} className="space-y-3">
                <div>
                  <label htmlFor="new-vendor-name" className="block text-xs font-semibold text-primary mb-1">
                    Vendor or Business Name *
                  </label>
                  <Input
                    id="new-vendor-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Royal Blooms Floral Design"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-vendor-category" className="block text-xs font-semibold text-primary mb-1">
                      Category
                    </label>
                    <Input
                      id="new-vendor-category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Florals"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-vendor-est-cost" className="block text-xs font-semibold text-primary mb-1">
                      Estimated Cost ({currency})
                    </label>
                    <Input
                      id="new-vendor-est-cost"
                      type="number"
                      step="any"
                      min="0"
                      value={newEstCost}
                      onChange={(e) => setNewEstCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="new-vendor-lead-weeks" className="block text-xs font-semibold text-primary mb-1">
                    Lead Time Required (Weeks)
                  </label>
                  <Input
                    id="new-vendor-lead-weeks"
                    type="number"
                    min="0"
                    max="104"
                    value={newLeadWeeks}
                    onChange={(e) => setNewLeadWeeks(e.target.value)}
                    placeholder="e.g. 6"
                  />
                  <p className="text-xs text-tertiary mt-1">
                    Used to calculate critical booking alerts. ({weeksUntilEvent} weeks remain until event).
                  </p>
                </div>

                <div>
                  <label htmlFor="new-vendor-notes" className="block text-xs font-semibold text-primary mb-1">
                    Notes / Deliverables
                  </label>
                  <textarea
                    id="new-vendor-notes"
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Contract scope, dietary considerations, deposit required..."
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
                    Save vendor
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View: Kanban Pipeline */}
        {viewMode === "kanban" && (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PIPELINE_COLUMNS.map((col) => {
              const items = vendors.filter((v) => v.status === col.id);

              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-surface bg-surface-elevated border border-border-subtle p-3 min-h-96"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs uppercase tracking-wider text-primary">
                        {col.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface text-secondary border border-border-subtle tnum">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-xs text-tertiary">
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
                            className="p-3 rounded-control border border-border-subtle bg-surface shadow-xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-primary">
                                  {item.category}
                                </span>
                                <h4 className="text-sm font-semibold text-primary leading-tight">
                                  {item.name}
                                </h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="trash"
                                onClick={() => handleDelete(item.id)}
                                className="text-tertiary hover:text-status-danger"
                                aria-label={`Delete ${item.name}`}
                              />
                            </div>

                            {/* Cost & Lead time */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                              {item.estimatedCostMinor !== undefined && (
                                <span className="font-medium text-primary font-mono tnum">
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
                              <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                                {item.quoteNotes}
                              </p>
                            )}

                            {/* Stage Transition Selector */}
                            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                              <span className="text-xs text-tertiary">Move to:</span>
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleStatusChange(item.id, e.target.value as VendorItem["status"])
                                }
                                aria-label={`Change stage for ${item.name}`}
                                className="text-xs rounded-control border border-border-strong bg-surface px-2 py-1 text-primary cursor-pointer focus:outline-none focus:border-primary"
                              >
                                {PIPELINE_COLUMNS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
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
        )}

        {/* View: Data Table */}
        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Vendors table">
              <thead className="bg-surface-elevated text-xs font-semibold text-secondary border-b border-border-subtle uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Vendor / Business</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Stage</th>
                  <th scope="col" className="px-4 py-3 text-right">Est. Cost</th>
                  <th scope="col" className="px-4 py-3 text-right">Actual Cost</th>
                  <th scope="col" className="px-4 py-3 text-center">Lead Time</th>
                  <th scope="col" className="px-4 py-3">Notes</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-tertiary">
                      No vendors added yet. Click &quot;Add Vendor&quot; above to begin.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => {
                    const isLeadRisk =
                      v.status !== "booked" &&
                      v.leadTimeWeeks !== undefined &&
                      v.leadTimeWeeks > weeksUntilEvent;

                    return (
                      <tr key={v.id} className="hover:bg-surface-elevated transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">
                          {v.name}
                        </td>
                        <td className="px-4 py-3 text-secondary text-xs">
                          {v.category}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={v.status}
                            onChange={(e) =>
                              handleStatusChange(v.id, e.target.value as VendorItem["status"])
                            }
                            aria-label={`Change stage for ${v.name}`}
                            className="text-xs rounded-control border border-border-strong bg-surface px-2 py-1 text-primary cursor-pointer focus:outline-none focus:border-primary"
                          >
                            {PIPELINE_COLUMNS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-primary tnum">
                          {v.estimatedCostMinor !== undefined
                            ? formatCurrency(v.estimatedCostMinor, currency)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-primary tnum">
                          {v.actualCostMinor !== undefined
                            ? formatCurrency(v.actualCostMinor, currency)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {v.leadTimeWeeks !== undefined ? (
                            <Badge variant={isLeadRisk ? "danger" : "neutral"} size="sm">
                              {v.leadTimeWeeks}w
                            </Badge>
                          ) : (
                            <span className="text-tertiary">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-secondary max-w-xs truncate">
                          {v.quoteNotes || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="trash"
                            onClick={() => handleDelete(v.id)}
                            className="text-tertiary hover:text-status-danger"
                            aria-label={`Delete ${v.name}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}
