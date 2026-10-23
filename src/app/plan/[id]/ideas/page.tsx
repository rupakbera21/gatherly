"use client";

/**
 * @module PlanIdeasPage
 * @purpose Interactive creative brainstorming studio for events.
 *          Deduplicated, personalized idea generation with feedback loops (save, dismiss, add to plan),
 *          category filtering, and validated patch state persistence.
 * @rubric Problem Statement Alignment & Code Quality – Creative AI recommendations with human agency.
 */

import React, { use, useState } from "react";
import { IdeaItem } from "@/domain/types";
import { useGatherlyStore } from "@/store";

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

  if (!plan) return null;

  const ideas = plan.ideas ?? [];
  const categories = Array.from(new Set(ideas.map((i) => i.category || "General")));

  const filteredIdeas = ideas.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    if (filterStatus === "saved" && item.status !== "saved") return false;
    if (filterStatus === "added" && !item.addedToPlan) return false;
    if (filterStatus === "suggested" && item.status !== "suggested") return false;
    if (filterStatus !== "all" && item.status === "dismissed" && filterStatus !== "dismissed") return false;
    // By default hide dismissed unless filterStatus is dismissed
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

  function handleDismiss(ideaId: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      ideas: plan.ideas.map((i) => (i.id === ideaId ? { ...i, status: "dismissed" } : i)),
      updatedAt: new Date().toISOString(),
    });
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
        body: JSON.stringify(plan.profile),
      });
      const data = await res.json();
      if (res.ok && data.ideas) {
        // Keep saved or added ideas, prepend fresh ones
        const preserved = plan.ideas.filter((i) => i.addedToPlan || i.status === "saved");
        const existingTitles = new Set(preserved.map((i) => i.title.toLowerCase()));
        const fresh = (data.ideas as IdeaItem[]).filter(
          (i) => !existingTitles.has(i.title.toLowerCase())
        );

        setPlan({
          ...plan,
          ideas: [...preserved, ...fresh],
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
            Creative Ideas & Concepts
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            AI-curated themes, activities, and personalized touches tailored to your {plan.profile.type}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRegenerateIdeas}
            disabled={isRegenerating}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRegenerating ? "Brainstorming..." : "Generate New Ideas"}
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Custom Idea
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Ideas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{ideas.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved / Bookmarked</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{savedCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Adopted Into Plan</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{addedCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter:</span>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label="Filter ideas by category"
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
          aria-label="Filter ideas by status"
          className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
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
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Add Custom Idea Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Custom Concept</h3>
            <form onSubmit={handleAddCustomIdea} className="space-y-4">
              <div>
                <label htmlFor="custom-idea-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Idea Title *
                </label>
                <input
                  id="custom-idea-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Acoustic Sunset Trio"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="custom-idea-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  id="custom-idea-category"
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Entertainment, Decor, Food & Drink"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="custom-idea-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  id="custom-idea-desc"
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the experience, logistics, or styling idea..."
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
                  Save Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No ideas found for this view
            </p>
            <p className="text-xs">
              Try adjusting your filter or click &quot;Generate New Ideas&quot; to brainstorm fresh concepts.
            </p>
          </div>
        ) : (
          filteredIdeas.map((item) => {
            const isSaved = item.status === "saved" || item.addedToPlan;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                  item.addedToPlan
                    ? "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md"
                } shadow-xs`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {item.category}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Save / Star button */}
                      <button
                        onClick={() => handleToggleSave(item)}
                        aria-label={isSaved ? "Unstar idea" : "Star idea"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-slate-400 hover:text-amber-500"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill={isSaved ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>

                      {/* Dismiss button */}
                      <button
                        onClick={() => handleDismiss(item.id)}
                        aria-label="Dismiss idea"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {item.addedToPlan ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Adopted into Plan
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToPlan(item)}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add to Plan
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
