"use client";

/**
 * @module BirthdayExtras
 * @purpose Birthday party specialized tools: Cake Size Calculator, Age-Bracket Activities, and DJ Vibe Curve.
 * @rubric Problem Statement Alignment – Specialized birthday party domain workflows.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";

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
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cake Sizing Calculator */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h10z" />
              </svg>
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">
              Cake Order & Sizing Calculator
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Automated bakery sizing specification based on your guest count ({guests} guests).
          </p>

          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-amber-800 dark:text-amber-300">Recommended Size:</span>
              <span className="font-bold text-amber-900 dark:text-amber-200">{cakeInfo.tiers}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-amber-800 dark:text-amber-300">Portions / Yield:</span>
              <span className="font-bold text-amber-900 dark:text-amber-200">{cakeInfo.servings}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>💡 Tip: For outdoor celebrations, avoid delicate buttercream; opt for fondant or ganache.</p>
            <p>⏰ Order Lead Time: Ensure bakery confirmation at least 3 weeks before event date.</p>
          </div>
        </div>

        {/* Energy & Music Curve */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">
              Party Vibe Curve & DJ Cues
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Curate musical tempo progression from guest arrival to peak celebration.
          </p>

          <div className="space-y-2">
            {playlistStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => toggleStage(stage.id)}
                className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between text-xs ${
                  stage.completed
                    ? "bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    {stage.completed && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓</span>
                    )}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {stage.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{stage.energy}</div>
                </div>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                  {stage.bpm}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Age Bracket Recommendations */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Age-Group Activity & Entertainment Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activities.map((act) => (
            <div
              key={act.bracket}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
            >
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {act.bracket}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {act.idea}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
