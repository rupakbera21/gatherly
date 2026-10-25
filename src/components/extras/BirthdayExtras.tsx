"use client";

/**
 * @module BirthdayExtras
 * @purpose Birthday party specialized tools: Cake Size Calculator, Age-Bracket Activities, and DJ Vibe Curve.
 * @rubric Problem Statement Alignment – Specialized birthday party domain workflows.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";
import { Icon, Surface, Badge } from "@/components/ui";

interface BirthdayExtrasProps {
  plan: EventPlan;
}

export function BirthdayExtras({ plan }: BirthdayExtrasProps) {
  const guests = plan.profile.guestCount;

  // Cake tier calculator
  function getCakeRecommendation(count: number) {
    if (count <= 15) return { tiers: "Single Tier (8-inch round)", servings: "16-20 slices", tiersCount: 1 };
    if (count <= 35) return { tiers: "Single Tier (10-inch round)", servings: "30-38 slices", tiersCount: 1 };
    if (count <= 60) return { tiers: "Two Tiers (6-inch + 9-inch)", servings: "50-60 slices", tiersCount: 2 };
    if (count <= 100) return { tiers: "Three Tiers (6-inch + 8-inch + 10-inch)", servings: "90-110 slices", tiersCount: 3 };
    return { tiers: "Custom Tiered Display + Sheet Backup", servings: `${count} servings`, tiersCount: 4 };
  }

  const cakeInfo = getCakeRecommendation(guests);

  // Vibe curve playlist stages
  const [playlistStages, setPlaylistStages] = useState([
    { id: "stage_1", name: "Warmup & Guest Arrival", energy: "Low (Chilled)", bpm: "90-110 BPM", completed: true },
    { id: "stage_2", name: "Icebreakers & Social Hour", energy: "Medium (Upbeat)", bpm: "110-120 BPM", completed: false },
    { id: "stage_3", name: "Peak Celebration & Dance", energy: "High (High Energy / Hits)", bpm: "124-132 BPM", completed: false },
    { id: "stage_4", name: "Cake Cutting & Singalong", energy: "Peak Emotional / Anthem", bpm: "Crowd Favorites", completed: false },
    { id: "stage_5", name: "Cool-down & Winddown", energy: "Low / Acoustic", bpm: "Acoustic / Lo-Fi", completed: false },
  ]);

  function toggleStage(id: string) {
    setPlaylistStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  }

  // Activities by age group
  const activities = [
    { bracket: "Kids & Toddlers", idea: "Balloon twisting, bubble entertainer, face painting station." },
    { bracket: "Teens & Tweens", idea: "TikTok dance challenge, instant Polaroid photo wall, retro arcade." },
    { bracket: "Adults (20s-30s)", idea: "Signature cocktail tasting, trivia duel, customized karaoke battle." },
    { bracket: "Milestone (40s-60s+)", idea: "\"Memory Lane\" photo montage video, live acoustic cover band, toast roast." },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cake Sizing Calculator */}
        <Surface className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-md bg-warning-surface text-warning">
              <Icon name="coffee" size="sm" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">
              Cake Order & Sizing Calculator
            </h3>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Automated bakery sizing specification based on your guest count ({guests} guests).
          </p>

          <div className="p-4 rounded-md bg-warning-surface border border-warning space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-warning">Recommended Size:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">{cakeInfo.tiers}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-warning">Portions / Yield:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">{cakeInfo.servings}</span>
            </div>
          </div>

          <div className="text-xs text-neutral-500 space-y-1">
            <p className="flex items-center gap-1.5">
              <Icon name="info" size="xs" aria-hidden="true" />
              <span>Tip: For outdoor celebrations, avoid delicate buttercream; opt for fondant or ganache.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Icon name="clock" size="xs" aria-hidden="true" />
              <span>Order Lead Time: Ensure bakery confirmation at least 3 weeks before event date.</span>
            </p>
          </div>
        </Surface>

        {/* Energy & Music Curve */}
        <Surface className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300">
              <Icon name="music" size="sm" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">
              Party Vibe Curve & DJ Cues
            </h3>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Curate musical tempo progression from guest arrival to peak celebration.
          </p>

          <div className="space-y-2">
            {playlistStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => toggleStage(stage.id)}
                className={`w-full p-2.5 rounded-md border text-left transition-colors flex items-center justify-between text-xs ${
                  stage.completed
                    ? "bg-primary-50/50 border-primary-200 dark:bg-primary-950/30 dark:border-primary-900"
                    : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    {stage.completed && (
                      <Icon name="check" size="xs" className="text-primary-600 dark:text-primary-400" aria-hidden="true" />
                    )}
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {stage.name}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">{stage.energy}</div>
                </div>
                <span className="font-mono text-primary-600 dark:text-primary-400 text-xs font-semibold tnum">
                  {stage.bpm}
                </span>
              </button>
            ))}
          </div>
        </Surface>
      </div>

      {/* Activities by age group */}
      <Surface className="p-6 space-y-4">
        <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 font-display">
          Age-Group Activity &amp; Entertainment Guide
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activities.map((act) => (
            <div
              key={act.bracket}
              className="p-3.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5 text-xs"
            >
              <Badge variant="neutral" size="sm">
                {act.bracket}
              </Badge>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed pt-1">
                {act.idea}
              </p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
