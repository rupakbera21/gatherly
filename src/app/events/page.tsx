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
import {
  PageHeader,
  Surface,
  Badge,
  Button,
  EmptyState,
  Dialog,
  Icon,
} from "@/components/ui";

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

  // useSyncExternalStore avoids SSR prerender Date access
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
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-primary">
      {/* Top Utility Bar */}
      <header className="w-full border-b border-border-subtle bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
            aria-label="Gatherly Home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Gatherly Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-control border border-border-strong text-secondary hover:text-primary hover:bg-surface-elevated transition-colors no-underline"
            >
              New plan
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="Saved event plans"
          subtitle="All plans are stored locally on your device in your browser's private storage."
          badge={
            <Badge variant="neutral" size="sm">
              {eventList.length} {eventList.length === 1 ? "plan" : "plans"}
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
                aria-label="Import plan JSON file"
              />
              <Button
                variant="secondary"
                size="md"
                leftIcon="download"
                onClick={() => fileInputRef.current?.click()}
              >
                Import JSON
              </Button>
              <Link href="/" className="no-underline">
                <Button variant="primary" size="md" leftIcon="plus">
                  Plan new event
                </Button>
              </Link>
            </div>
          }
        />

        {storageNotice && (
          <div
            role="status"
            className="mt-4 p-3 bg-status-info-bg border border-status-info-border rounded-control text-sm text-status-info flex items-center justify-between"
          >
            <span>{storageNotice}</span>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Dismiss notice"
              onClick={clearStorageNotice}
            >
              <Icon name="x" size={14} aria-hidden />
            </Button>
          </div>
        )}

        {importError && (
          <div
            role="alert"
            className="mt-4 p-3 bg-status-danger-bg border border-status-danger-border rounded-control text-sm text-status-danger flex items-center gap-2"
          >
            <Icon name="alert" size={16} aria-hidden />
            <span>{importError}</span>
          </div>
        )}

        {/* Events Grid */}
        <div className="mt-8">
          {eventList.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No events planned yet"
              description="Describe your wedding, birthday party, or community gathering to generate your first complete plan."
              actionLabel="Start planning"
              onAction={() => router.push("/")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventList.map((plan) => {
                const daysLeft = todayStr ? daysBetween(todayStr, plan.profile.eventDate) : 0;
                const isPast = daysLeft < 0;

                const tintType =
                  plan.profile.type === "wedding"
                    ? "wedding"
                    : plan.profile.type === "birthday"
                    ? "birthday"
                    : "community";

                return (
                  <Surface
                    key={plan.id}
                    variant="default"
                    tint={tintType}
                    className="p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant={tintType} size="sm">
                          {plan.profile.type}
                        </Badge>
                        <span className="text-xs text-tertiary tnum font-medium">
                          {isPast ? "Event concluded" : `${daysLeft} days to go`}
                        </span>
                      </div>

                      <h2 className="text-lg font-bold font-display text-primary mb-1">
                        <Link
                          href={`/plan/${plan.id}/overview`}
                          className="hover:text-primary transition-colors no-underline"
                        >
                          {plan.profile.title}
                        </Link>
                      </h2>

                      <div className="text-xs text-secondary space-y-1 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Icon name="calendar" size={14} className="text-tertiary" aria-hidden />
                          <span>Date: {plan.profile.eventDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Icon name="users" size={14} className="text-tertiary" aria-hidden />
                          <span>Guests: {plan.profile.guestCount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Icon name="currency" size={14} className="text-tertiary" aria-hidden />
                          <span>
                            Budget: {formatCurrency(plan.profile.budgetMinor, plan.profile.currency)}
                          </span>
                        </div>
                        {plan.profile.location && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="location" size={14} className="text-tertiary" aria-hidden />
                            <span>{plan.profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between text-xs">
                      <Link href={`/plan/${plan.id}/overview`} className="no-underline">
                        <Button variant="primary" size="sm" rightIcon="chevron-right">
                          Open plan
                        </Button>
                      </Link>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(plan.id, plan.profile.title)}
                          title="Export plan as JSON"
                        >
                          Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateEvent(plan.id)}
                          title="Duplicate this plan"
                        >
                          Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="text-status-danger hover:text-status-danger"
                          title="Delete this plan"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Surface>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Single Event Modal */}
        <Dialog
          isOpen={Boolean(confirmDeleteId)}
          onClose={() => setConfirmDeleteId(null)}
          title="Delete event plan?"
          description="This action cannot be undone. All budget, timeline, and vendor records for this event will be permanently removed."
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  if (confirmDeleteId) {
                    deleteEvent(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }
                }}
              >
                Delete plan
              </Button>
            </>
          }
        >
          <p className="text-sm text-secondary">
            Are you sure you want to permanently remove this event from your browser storage?
          </p>
        </Dialog>

        {/* Delete All Data Privacy Action */}
        {eventList.length > 0 && (
          <div className="mt-12 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-primary">
                Privacy & local storage
              </h3>
              <p className="text-xs text-tertiary">
                Gatherly does not store any of your data on servers. You can permanently wipe all local plans anytime.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteAllModal(true)}
            >
              Delete all my data
            </Button>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        <Dialog
          isOpen={showDeleteAllModal}
          onClose={() => setShowDeleteAllModal(false)}
          title="Permanently clear all data?"
          description="This will erase all plans, budgets, checklists, and preferences from your browser. There is no account or cloud backup to recover them."
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowDeleteAllModal(false)}
              >
                Keep my data
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  deleteAllData();
                  setShowDeleteAllModal(false);
                }}
              >
                Clear everything
              </Button>
            </>
          }
        >
          <p className="text-sm text-status-danger font-medium">
            Warning: All created events and saved records will be deleted immediately.
          </p>
        </Dialog>
      </div>
    </main>
  );
}
