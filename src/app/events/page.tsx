"use client";

/**
 * @module EventsPage
 * @purpose Events management dashboard.
 *          Browse, open, duplicate, export, import, or delete plans.
 *          Privacy-first: All data stored in browser localStorage.
 * @rubric Problem Statement Alignment & Security – Multi-event support & Data Privacy.
 */

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { daysBetween, defaultClock } from "@/domain/dates";
import { formatCurrency } from "@/domain/money";
import { useGatherlyStore } from "@/store";

export default function EventsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    events,
    duplicateEvent,
    deleteEvent,
    deleteAllData,
    exportPlanJson,
    importPlanJson,
    storageNotice,
    clearStorageNotice,
  } = useGatherlyStore();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // useSyncExternalStore avoids SSR prerender Date access and satisfies React Hooks linter
  const todayStr = React.useSyncExternalStore(
    () => () => {},
    () => defaultClock(),
    () => ""
  );

  const eventList = Object.values(events).sort((a, b) =>
    a.profile.eventDate.localeCompare(b.profile.eventDate)
  );

  function handleExport(id: string, title: string) {
    const json = exportPlanJson(id);
    if (!json) return;

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_plan.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      setImportError("Selected file exceeds the maximum 512 KB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importPlanJson(content);
      if (res.success && res.eventId) {
        router.push(`/plan/${res.eventId}/overview`);
      } else {
        setImportError(res.error || "Failed to import plan.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Storage notice banner if any */}
      {storageNotice && (
        <div
          role="status"
          className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between text-amber-900 dark:text-amber-200 text-sm"
        >
          <span>{storageNotice}</span>
          <button
            onClick={clearStorageNotice}
            className="text-amber-700 dark:text-amber-300 hover:underline font-medium text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
            My Events
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
            Privacy-first event plans stored locally on your device.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
            aria-label="Upload JSON plan backup"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
          >
            Import JSON
          </button>

          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px] flex items-center gap-1.5"
          >
            <span>+ Plan New Event</span>
          </Link>
        </div>
      </div>

      {importError && (
        <div
          role="alert"
          className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
        >
          {importError}
        </div>
      )}

      {/* Events List */}
      {eventList.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 rounded-xl p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xl">
            📅
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
            No events planned yet
          </h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm max-w-md mx-auto mb-6">
            Describe your wedding, birthday party, or community event in natural language to create your first intelligent plan.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-colors"
          >
            Start Planning
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eventList.map((plan) => {
            const daysLeft = todayStr ? daysBetween(todayStr, plan.profile.eventDate) : 0;
            const isPast = daysLeft < 0;

            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                        plan.profile.type === "wedding"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : plan.profile.type === "birthday"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {plan.profile.type}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {isPast ? "Event concluded" : `${daysLeft} days to go`}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
                    <Link
                      href={`/plan/${plan.id}/overview`}
                      className="hover:text-amber-600 dark:hover:text-amber-400 focus:outline-none focus:underline"
                    >
                      {plan.profile.title}
                    </Link>
                  </h2>

                  <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1 mt-3">
                    <p>📅 Date: {plan.profile.eventDate}</p>
                    <p>👥 Guests: {plan.profile.guestCount.toLocaleString()}</p>
                    <p>
                      💰 Budget:{" "}
                      {formatCurrency(plan.profile.budgetMinor, plan.profile.currency)}
                    </p>
                    {plan.profile.location && <p>📍 {plan.profile.location}</p>}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <Link
                    href={`/plan/${plan.id}/overview`}
                    className="font-medium text-amber-600 dark:text-amber-400 hover:underline px-2 py-1.5 min-h-[44px] flex items-center"
                  >
                    Open Plan →
                  </Link>

                  <div className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                    <button
                      onClick={() => handleExport(plan.id, plan.profile.title)}
                      className="hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1.5 min-h-[44px] rounded"
                      title="Export plan as JSON"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => duplicateEvent(plan.id)}
                      className="hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1.5 min-h-[44px] rounded"
                      title="Duplicate this plan"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(plan.id)}
                      className="text-red-600 dark:text-red-400 hover:underline px-2 py-1.5 min-h-[44px] rounded"
                      title="Delete this plan"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Event Modal */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-white dark:bg-stone-900 rounded-xl p-6 max-w-sm w-full border border-stone-200 dark:border-stone-800 shadow-xl">
            <h3 id="delete-dialog-title" className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
              Delete Event Plan?
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
              This action cannot be undone. All budget, timeline, and vendor records for this event will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteEvent(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Data Privacy Action */}
      {eventList.length > 0 && (
        <div className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-200">
              Privacy & Local Storage
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Gatherly does not store any of your data on servers. You can permanently wipe all local plans anytime.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline px-3 py-2 border border-red-200 dark:border-red-900/50 rounded-lg min-h-[44px]"
          >
            Delete all my data
          </button>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wipe-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-white dark:bg-stone-900 rounded-xl p-6 max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-xl">
            <h3 id="wipe-dialog-title" className="text-base font-bold text-red-600 dark:text-red-400 mb-2">
              Permanently Clear All Data?
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
              This will erase all plans, budgets, checklists, and preferences from your browser. There is no account or cloud backup to recover them.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px]"
              >
                Keep My Data
              </button>
              <button
                onClick={() => {
                  deleteAllData();
                  setShowDeleteAllModal(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg min-h-[44px]"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
