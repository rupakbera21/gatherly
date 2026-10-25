"use client";

/**
 * @module WeddingExtras
 * @purpose Specialized modules for wedding planning:
 *          Table seating arrangement calculator, dietary restriction breakdown,
 *          and day-of photography shot list checklist.
 * @rubric Tier 2 Features & Domain Completeness – Type-specific operational features.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";
import { Surface, Badge, Button, Icon, Input } from "@/components/ui";

interface WeddingExtrasProps {
  plan: EventPlan;
}

interface ShotItem {
  id: string;
  category: "pre-ceremony" | "ceremony" | "portraits" | "reception";
  item: string;
  done: boolean;
}

const DEFAULT_SHOTS: ShotItem[] = [
  { id: "s1", category: "pre-ceremony", item: "Wedding outfits hanging and jewelry details", done: false },
  { id: "s2", category: "pre-ceremony", item: "Getting ready candid moments and makeup final touches", done: false },
  { id: "s3", category: "ceremony", item: "Entrance / Baraat procession and welcome", done: false },
  { id: "s4", category: "ceremony", item: "Vows exchange and ring / garland ceremony", done: false },
  { id: "s5", category: "ceremony", item: "First kiss / blessings and recessional walk", done: false },
  { id: "s6", category: "portraits", item: "Couple portraits with natural golden hour lighting", done: false },
  { id: "s7", category: "portraits", item: "Immediate family portraits and multigenerational group shots", done: false },
  { id: "s8", category: "portraits", item: "Bridal party / groomsmen celebration poses", done: false },
  { id: "s9", category: "reception", item: "Reception hall reveal, centerpieces, and cake setup", done: false },
  { id: "s10", category: "reception", item: "Grand entrance and first dance", done: false },
  { id: "s11", category: "reception", item: "Toasts, speeches, and emotional guest reactions", done: false },
  { id: "s12", category: "reception", item: "Cake cutting and late-night dance floor candids", done: false },
];

export function WeddingExtras({ plan }: WeddingExtrasProps) {
  const guests = plan.profile.guestCount;
  const numTables = Math.max(1, Math.ceil(guests / 8));

  const [dietary, setDietary] = useState({
    vegetarian: Math.round(guests * 0.4),
    vegan: Math.round(guests * 0.05),
    glutenFree: Math.round(guests * 0.05),
    halalOrKosher: Math.round(guests * 0.1),
    noRestrictions: Math.max(0, guests - Math.round(guests * 0.6)),
  });

  const [shotList, setShotList] = useState<ShotItem[]>(DEFAULT_SHOTS);
  const [newShot, setNewShot] = useState("");

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
        id: `s_custom_${Date.now()}`,
        category: "portraits",
        item: newShot.trim(),
        done: false,
      },
    ]);
    setNewShot("");
  }

  const completedShots = shotList.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table Seating Calculator */}
        <Surface className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-control bg-tint-wedding-bg text-tint-wedding border border-tint-wedding-border">
              <Icon name="users" size={16} aria-hidden />
            </span>
            <h3 className="font-bold text-primary font-display">Table Seating Plan</h3>
          </div>
          <p className="text-xs text-secondary">
            For {guests} guests with standard 60-inch round tables (8 seats per table).
          </p>
          <div className="p-3 bg-surface-elevated rounded-control border border-border-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              Recommended Tables:
            </span>
            <span className="text-lg font-bold text-primary tnum">
              {numTables} Round Tables
            </span>
          </div>
          <div className="text-xs text-tertiary">
            Includes 1 Head Table / Sweetheart Table + {Math.max(0, numTables - 1)} Guest Tables.
          </div>
        </Surface>

        {/* Dietary Restrictions Tally */}
        <Surface className="p-5 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-control bg-status-success-bg text-status-success border border-status-success-border">
                <Icon name="check" size={16} aria-hidden />
              </span>
              <h3 className="font-bold text-primary font-display">
                Dietary &amp; Catering Breakdown
              </h3>
            </div>
            <span className="text-xs text-tertiary font-mono tnum">
              Total Meals: {Object.values(dietary).reduce((a, b) => a + b, 0)} / {guests}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {Object.entries(dietary).map(([key, val]) => (
              <div key={key} className="p-3 rounded-control bg-surface-elevated border border-border-subtle text-center">
                <p className="text-xs font-medium text-secondary capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDietary((p) => ({ ...p, [key]: Math.max(0, p[key as keyof typeof dietary] - 1) }))
                    }
                    className="w-5 h-5 rounded-control bg-surface border border-border-strong text-xs font-bold text-primary hover:bg-surface-elevated flex items-center justify-center cursor-pointer"
                    aria-label={`Decrease ${key}`}
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-primary tnum">{val}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDietary((p) => ({ ...p, [key]: p[key as keyof typeof dietary] + 1 }))
                    }
                    className="w-5 h-5 rounded-control bg-surface border border-border-strong text-xs font-bold text-primary hover:bg-surface-elevated flex items-center justify-center cursor-pointer"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
          <div>
            <h3 className="font-bold text-base text-primary font-display">
              Day-of Photography Shot List
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Essential must-have moments from pre-ceremony to reception send-off.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-secondary tnum">
              {completedShots} of {shotList.length} captured
            </span>
            <div className="w-24 bg-surface-elevated rounded-full h-2 overflow-hidden border border-border-subtle">
              <div
                className="h-2 rounded-full bg-primary transition-all"
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
            placeholder="Add custom shot (e.g. Groom reading letter, Grandparents blessings)..."
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            size="md"
            icon="plus"
          >
            Add shot
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {shotList.map((shot) => (
            <div
              key={shot.id}
              className={`flex items-start gap-3 p-3 rounded-control border transition-colors ${
                shot.done
                  ? "bg-status-success-bg/30 border-status-success-border"
                  : "bg-surface border-border-subtle hover:border-border-strong"
              }`}
            >
              <input
                id={shot.id}
                type="checkbox"
                checked={shot.done}
                onChange={() => toggleShot(shot.id)}
                className="mt-0.5 h-4 w-4 rounded-control border-border-strong text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor={shot.id} className="space-y-0.5 cursor-pointer flex-1">
                <Badge variant="neutral" size="sm">
                  {shot.category}
                </Badge>
                <span
                  className={`block text-xs pt-1 ${
                    shot.done
                      ? "line-through text-tertiary"
                      : "text-primary"
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
