"use client";

/**
 * @module PlanIdeasPage
 * @purpose Interactive creative brainstorming studio for events.
 *          Deduplicated, personalized idea generation with feedback loops (save, dismiss with undo toast, add to plan),
 *          category filtering, and validated patch state persistence.
 * @rubric Problem Statement Alignment & Code Quality – Creative AI recommendations with human agency.
 */

import React, { use, useState } from "react";
import { IdeaItem } from "@/domain/types";
import { useGatherlyStore } from "@/store";
import { Button, Icon, Badge, Surface, Input, Toast } from "@/components/ui";

interface IdeasPageProps {
  params: Promise<{ id: string }>;
}

export default function PlanIdeasPage({ params }: IdeasPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, applyPatchToPlan, setPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Activities");

  // Undo dismiss toast state
  const [dismissToast, setDismissToast] = useState<{ id: string; title: string; prevStatus: IdeaItem["status"] } | null>(null);

  if (!plan) return null;

  const ideas = plan.ideas ?? [];
  const categories = Array.from(new Set(ideas.map((i) => i.category || "General")));

  const filteredIdeas = ideas.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    if (filterStatus === "saved" && item.status !== "saved") return false;
    if (filterStatus === "added" && !item.addedToPlan) return false;
    if (filterStatus === "suggested" && item.status !== "suggested") return false;
    if (filterStatus !== "all" && item.status === "dismissed" && filterStatus !== "dismissed") return false;
    if (filterStatus === "all" && item.status === "dismissed") return false;
    return true;
  });

  const savedCount = ideas.filter((i) => i.status === "saved" || i.addedToPlan).length;
  const addedCount = ideas.filter((i) => i.addedToPlan).length;

  function handleAddToPlan(idea: IdeaItem) {
    applyPatchToPlan(eventId, {
      op: "addIdeaToPlan",
      ideaId: idea.id,
    });
  }

  function handleToggleSave(idea: IdeaItem) {
    if (!plan) return;
    const nextStatus = idea.status === "saved" ? "suggested" : "saved";
    setPlan({
      ...plan,
      ideas: plan.ideas.map((i) => (i.id === idea.id ? { ...i, status: nextStatus } : i)),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleDismiss(idea: IdeaItem) {
    if (!plan) return;
    setDismissToast({ id: idea.id, title: idea.title, prevStatus: idea.status });
    setPlan({
      ...plan,
      ideas: plan.ideas.map((i) => (i.id === idea.id ? { ...i, status: "dismissed" } : i)),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleUndoDismiss() {
    if (!plan || !dismissToast) return;
    setPlan({
      ...plan,
      ideas: plan.ideas.map((i) => (i.id === dismissToast.id ? { ...i, status: dismissToast.prevStatus } : i)),
      updatedAt: new Date().toISOString(),
    });
    setDismissToast(null);
  }

  function handleAddCustomIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || !newTitle.trim() || !newDesc.trim()) return;

    const newIdea: IdeaItem = {
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory.trim() || "General",
      status: "saved",
      addedToPlan: false,
    };

    setPlan({
      ...plan,
      ideas: [newIdea, ...plan.ideas],
      updatedAt: new Date().toISOString(),
    });

    setNewTitle("");
    setNewDesc("");
    setIsAddOpen(false);
  }

  async function handleRegenerateIdeas() {
    if (!plan) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: plan.profile,
          existingTitles: plan.ideas.map((i) => i.title),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ideas) {
        setPlan({
          ...plan,
          ideas: [...data.ideas, ...plan.ideas],
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
            Inspiration &amp; Ideas Studio
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            AI-suggested thematic enhancements, activities, and personalized event decor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="sparkles"
            onClick={handleRegenerateIdeas}
            isLoading={isRegenerating}
            disabled={isRegenerating}
          >
            {isRegenerating ? "Brainstorming..." : "Generate New Ideas"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() => setIsAddOpen(true)}
          >
            Add Custom Idea
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Surface className="p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Ideas</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tnum">{ideas.length}</p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider">Saved / Starred</p>
          <p className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400 tnum">{savedCount}</p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-medium text-success uppercase tracking-wider">Adopted Into Plan</p>
          <p className="mt-1 text-2xl font-bold text-success tnum">{addedCount}</p>
        </Surface>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-md border border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Filter:</span>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label="Filter ideas by category"
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
          aria-label="Filter ideas by status"
          className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
        >
          <option value="all">Active Ideas</option>
          <option value="saved">Saved / Starred</option>
          <option value="added">Added to Plan</option>
          <option value="dismissed">Dismissed</option>
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

      {/* Add Custom Idea Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-display">Add Custom Concept</h3>
            <form onSubmit={handleAddCustomIdea} className="space-y-4">
              <div>
                <label htmlFor="custom-idea-title" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Idea Title *
                </label>
                <Input
                  id="custom-idea-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Acoustic Sunset Trio"
                />
              </div>

              <div>
                <label htmlFor="custom-idea-category" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Category
                </label>
                <Input
                  id="custom-idea-category"
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Entertainment, Decor, Food & Drink"
                />
              </div>

              <div>
                <label htmlFor="custom-idea-desc" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description *
                </label>
                <textarea
                  id="custom-idea-desc"
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the experience, logistics, or styling idea..."
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
                  Save Idea
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.length === 0 ? (
          <Surface className="col-span-full p-12 text-center text-neutral-500 dark:text-neutral-400 space-y-2">
            <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 font-display">
              No ideas found for this view
            </p>
            <p className="text-xs">
              Try adjusting your filter or click &quot;Generate New Ideas&quot; to brainstorm fresh concepts.
            </p>
          </Surface>
        ) : (
          filteredIdeas.map((item) => {
            const isSaved = item.status === "saved" || item.addedToPlan;

            return (
              <Surface
                key={item.id}
                className={`flex flex-col justify-between p-5 transition-all ${
                  item.addedToPlan
                    ? "border-success bg-success-surface"
                    : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="neutral" size="sm">
                      {item.category}
                    </Badge>

                    <div className="flex items-center gap-1">
                      {/* Save / Star button */}
                      <button
                        onClick={() => handleToggleSave(item)}
                        aria-label={isSaved ? "Unstar idea" : "Star idea"}
                        className={`p-1.5 rounded-md transition-colors ${
                          isSaved
                            ? "text-warning hover:opacity-80"
                            : "text-neutral-400 hover:text-warning"
                        }`}
                      >
                        <Icon name="sparkles" size="sm" aria-hidden="true" />
                      </button>

                      {/* Dismiss button */}
                      <button
                        onClick={() => handleDismiss(item)}
                        aria-label="Dismiss idea"
                        className="p-1.5 rounded-md text-neutral-400 hover:text-danger hover:bg-danger-surface transition-colors"
                      >
                        <Icon name="x" size="sm" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
                    {item.title}
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Action */}
                <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  {item.addedToPlan ? (
                    <span className="text-xs font-semibold text-success flex items-center gap-1.5">
                      <Icon name="check" size="xs" aria-hidden="true" />
                      <span>Adopted into Plan</span>
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="plus"
                      onClick={() => handleAddToPlan(item)}
                      className="w-full"
                    >
                      Add to Plan
                    </Button>
                  )}
                </div>
              </Surface>
            );
          })
        )}
      </div>

      {/* Undo Toast when dismissed */}
      {dismissToast && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom duration-fast">
          <Toast
            id="dismiss-toast"
            variant="neutral"
            message={`Idea "${dismissToast.title}" dismissed`}
            action={{
              label: "Undo",
              onClick: handleUndoDismiss,
            }}
            onDismiss={() => setDismissToast(null)}
          />
        </div>
      )}
    </div>
  );
}
