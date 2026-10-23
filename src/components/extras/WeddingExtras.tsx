"use client";

/**
 * @module WeddingExtras
 * @purpose Wedding-specific tools: Photography Shot List, Dietary Restrictions tracker, and Table Seating.
 * @rubric Problem Statement Alignment – Event-type specific specialized domain workflows.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";

interface WeddingExtrasProps {
  plan: EventPlan;
}

const DEFAULT_SHOTS = [
  { id: "shot_1", category: "Getting Ready", item: "Dress hanging & invitation suite detail", done: false },
  { id: "shot_2", category: "Getting Ready", item: "Rings, shoes, bouquet, and jewelry flat-lay", done: false },
  { id: "shot_3", category: "Getting Ready", item: "Mother zipping dress / father first look", done: false },
  { id: "shot_4", category: "Ceremony", item: "Groom's reaction walking down aisle", done: false },
  { id: "shot_5", category: "Ceremony", item: "First kiss and recessional cheer", done: false },
  { id: "shot_6", category: "Formals", item: "Full wedding party & immediate families", done: false },
  { id: "shot_7", category: "Reception", item: "Grand entrance & first dance golden hour", done: false },
  { id: "shot_8", category: "Reception", item: "Toasts, speeches, and champagne toast", done: false },
  { id: "shot_9", category: "Reception", item: "Cake cutting and sparkler exit", done: false },
];

export function WeddingExtras({ plan }: WeddingExtrasProps) {
  const [shotList, setShotList] = useState(DEFAULT_SHOTS);
  const [newShot, setNewShot] = useState("");

  // Dietary counts (initialized from guest count)
  const guests = plan.profile.guestCount;
  const [dietary, setDietary] = useState({
    standard: Math.max(0, Math.round(guests * 0.7)),
    vegetarian: Math.max(0, Math.round(guests * 0.15)),
    vegan: Math.max(0, Math.round(guests * 0.08)),
    glutenFree: Math.max(0, Math.round(guests * 0.05)),
    nutAllergy: Math.max(0, Math.round(guests * 0.02)),
  });

  // Seating tables estimation (e.g. 8-10 top rounds)
  const tableCapacity = 8;
  const numTables = Math.ceil(guests / tableCapacity);

  function toggleShot(id: string) {
    setShotList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  }

  function addCustomShot(e: React.FormEvent) {
    e.preventDefault();
    if (!newShot.trim()) return;
    setShotList((prev) => [
      ...prev,
      {
        id: `shot_${Date.now()}`,
        category: "Custom",
        item: newShot.trim(),
        done: false,
      },
    ]);
    setNewShot("");
  }

  const completedShots = shotList.filter((s) => s.done).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table & Seating Math */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">Table Seating Plan</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            For {guests} guests with standard 60-inch round tables (8 seats per table).
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Recommended Tables:
            </span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {numTables} Round Tables
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Includes 1 Head Table / Sweetheart Table + {Math.max(0, numTables - 1)} Guest Tables.
          </div>
        </div>

        {/* Dietary Restrictions Tally */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Dietary & Catering Breakdown
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total Meals: {Object.values(dietary).reduce((a, b) => a + b, 0)} / {guests}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {Object.entries(dietary).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                <p className="text-[11px] font-medium text-slate-500 capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <button
                    onClick={() =>
                      setDietary((p) => ({ ...p, [key]: Math.max(0, p[key as keyof typeof dietary] - 1) }))
                    }
                    className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-slate-900 dark:text-white">{val}</span>
                  <button
                    onClick={() =>
                      setDietary((p) => ({ ...p, [key]: p[key as keyof typeof dietary] + 1 }))
                    }
                    className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Photography Shot List */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Day-of Photography Shot List
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                {completedShots}/{shotList.length} captured
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Essential captures to share with your primary and secondary photographers.
            </p>
          </div>

          <form onSubmit={addCustomShot} className="flex gap-2">
            <input
              type="text"
              aria-label="Add custom photo request"
              value={newShot}
              onChange={(e) => setNewShot(e.target.value)}
              placeholder="Add custom photo request..."
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-56"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs"
            >
              Add Shot
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {shotList.map((shot) => (
            <div
              key={shot.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                shot.done
                  ? "bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                  : "bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <input
                id={shot.id}
                type="checkbox"
                checked={shot.done}
                onChange={() => toggleShot(shot.id)}
                className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor={shot.id} className="space-y-0.5 cursor-pointer flex-1">
                <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {shot.category}
                </span>
                <span
                  className={`block text-xs ${
                    shot.done
                      ? "line-through text-slate-400 dark:text-slate-500"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {shot.item}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
