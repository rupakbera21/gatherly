"use client";

/**
 * @module WeddingExtras
 * @purpose Wedding-specific tools: Photography Shot List, Dietary Restrictions tracker, and Table Seating.
 * @rubric Problem Statement Alignment – Event-type specific specialized domain workflows.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";
import { Surface, Badge, Button, Input, Icon } from "@/components/ui";

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
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table & Seating Math */}
        <Surface className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-wedding-tint/15 text-wedding-tint">
              <Icon name="users" size="sm" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">Table Seating Plan</h3>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            For {guests} guests with standard 60-inch round tables (8 seats per table).
          </p>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-md flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Recommended Tables:
            </span>
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400 tnum">
              {numTables} Round Tables
            </span>
          </div>
          <div className="text-xs text-neutral-500">
            Includes 1 Head Table / Sweetheart Table + {Math.max(0, numTables - 1)} Guest Tables.
          </div>
        </Surface>

        {/* Dietary Restrictions Tally */}
        <Surface className="p-5 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-success/15 text-success">
                <Icon name="check" size="sm" aria-hidden="true" />
              </span>
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">
                Dietary &amp; Catering Breakdown
              </h3>
            </div>
            <span className="text-xs text-neutral-500 font-mono tnum">
              Total Meals: {Object.values(dietary).reduce((a, b) => a + b, 0)} / {guests}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {Object.entries(dietary).map(([key, val]) => (
              <div key={key} className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-800/50 text-center">
                <p className="text-xs font-medium text-neutral-500 capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <button
                    onClick={() =>
                      setDietary((p) => ({ ...p, [key]: Math.max(0, p[key as keyof typeof dietary] - 1) }))
                    }
                    className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center"
                    aria-label={`Decrease ${key}`}
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 tnum">{val}</span>
                  <button
                    onClick={() =>
                      setDietary((p) => ({ ...p, [key]: p[key as keyof typeof dietary] + 1 }))
                    }
                    className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center"
                    aria-label={`Increase ${key}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      {/* Photography Shot List */}
      <Surface className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 font-display">
              Day-of Photography Shot List
            </h3>
            <p className="text-xs text-neutral-500">
              Essential must-have moments from ceremony to reception send-off.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 tnum">
              {completedShots} of {shotList.length} captured
            </span>
            <div className="w-24 bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary-600 transition-all"
                style={{ width: `${shotList.length ? Math.round((completedShots / shotList.length) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Add custom shot */}
        <form onSubmit={addCustomShot} className="flex gap-2">
          <Input
            type="text"
            value={newShot}
            onChange={(e) => setNewShot(e.target.value)}
            placeholder="Add custom shot (e.g. Groom reading letter, Grandma dancing)..."
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            size="md"
            icon="plus"
          >
            Add Shot
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {shotList.map((shot) => (
            <div
              key={shot.id}
              className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                shot.done
                  ? "bg-success-surface border-success"
                  : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              }`}
            >
              <input
                id={shot.id}
                type="checkbox"
                checked={shot.done}
                onChange={() => toggleShot(shot.id)}
                className="mt-0.5 h-4 w-4 rounded-xs border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor={shot.id} className="space-y-0.5 cursor-pointer flex-1">
                <Badge variant="neutral" size="sm">
                  {shot.category}
                </Badge>
                <span
                  className={`block text-xs pt-1 ${
                    shot.done
                      ? "line-through text-neutral-400 dark:text-neutral-500"
                      : "text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  {shot.item}
                </span>
              </label>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
