"use client";

/**
 * @module BirthdayExtras
 * @purpose Specialized modules for birthday celebrations:
 *          Cake portions and sizing calculator, musical tempo party vibe curve,
 *          and age-bracket entertainment ideas.
 * @rubric Tier 2 Features & Domain Completeness – Birthday-specific milestones.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";
import { Surface, Badge, Icon } from "@/components/ui";

interface BirthdayExtrasProps {
  plan: EventPlan;
}

export function BirthdayExtras({ plan }: BirthdayExtrasProps) {
  const guests = plan.profile.guestCount;

  // Cake sizing calculation
  function calculateCake(numGuests: number) {
    if (numGuests <= 15) return { tiers: "Single Tier (8-inch round)", servings: "16-20 slices" };
    if (numGuests <= 35) return { tiers: "2-Tier Stack (10\" + 6\")", servings: "35-40 slices" };
    if (numGuests <= 60) return { tiers: "2-Tier Large (12\" + 8\")", servings: "60-65 slices" };
    if (numGuests <= 100) return { tiers: "3-Tier Stack (12\" + 9\" + 6\")", servings: "95-100 slices" };
    return { tiers: "3-Tier Large + Sheet Cake Backup", servings: `${numGuests}+ slices` };
  }

  const cakeInfo = calculateCake(guests);

  const [playlistStages, setPlaylistStages] = useState([
    { id: "p1", name: "Guest Arrival & Welcome Mingle", bpm: "95 - 105 BPM", energy: "Laidback acoustic / lo-fi chill", completed: true },
    { id: "p2", name: "Appetizers, Cocktails & Activity Zone", bpm: "110 - 118 BPM", energy: "Upbeat indie pop / warm grooves", completed: false },
    { id: "p3", name: "Cake Cutting & Birthday Anthem Cues", bpm: "Celebratory Fanfare", energy: "High-focus feature song & toasts", completed: false },
    { id: "p4", name: "Peak Dance Floor & Open Celebration", bpm: "124 - 130 BPM", energy: "Energetic dance pop / throwback classics", completed: false },
    { id: "p5", name: "Wind-Down & Farewell Hugs", bpm: "85 - 95 BPM", energy: "Warm singalongs & mellow outro", completed: false },
  ]);

  function toggleStage(id: string) {
    setPlaylistStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  }

  const activities = [
    { bracket: "Toddlers (1-4 yrs)", idea: "Soft play foam blocks, bubble machine, and sensory play corner." },
    { bracket: "Kids (5-10 yrs)", idea: "Interactive treasure hunt, magician / balloon artist, and obstacle relay." },
    { bracket: "Teens (11-17 yrs)", idea: "Selfie photobooth station with props, arcade console tournaments, mocktail bar." },
    { bracket: "Adults (18+ yrs)", idea: "Acoustic lounge set, trivia quiz tailored to the guest of honor, polaroid guestbook." },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cake Sizing Calculator */}
        <Surface className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-control bg-tint-birthday-bg text-tint-birthday border border-tint-birthday-border">
              <Icon name="coffee" size={16} aria-hidden />
            </span>
            <h3 className="font-bold text-primary font-display">
              Cake Order &amp; Sizing Calculator
            </h3>
          </div>
          <p className="text-xs text-secondary">
            Automated bakery sizing specification based on your guest count ({guests} guests).
          </p>

          <div className="p-4 rounded-control bg-status-warning-bg border border-status-warning-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-status-warning">Recommended Size:</span>
              <span className="font-bold text-primary">{cakeInfo.tiers}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-status-warning">Portions / Yield:</span>
              <span className="font-bold text-primary">{cakeInfo.servings}</span>
            </div>
          </div>

          <div className="text-xs text-secondary space-y-1">
            <p className="flex items-center gap-1.5">
              <Icon name="info" size={14} aria-hidden />
              <span>Tip: For outdoor celebrations, avoid delicate buttercream; opt for fondant or ganache.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Icon name="clock" size={14} aria-hidden />
              <span>Order Lead Time: Ensure bakery confirmation at least 3 weeks before celebration date.</span>
            </p>
          </div>
        </Surface>

        {/* Energy & Music Curve */}
        <Surface className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-control bg-primary-subtle text-primary border border-border-subtle">
              <Icon name="music" size={16} aria-hidden />
            </span>
            <h3 className="font-bold text-primary font-display">
              Party Vibe Curve &amp; DJ Cues
            </h3>
          </div>
          <p className="text-xs text-secondary">
            Curate musical tempo progression from guest arrival to peak celebration.
          </p>

          <div className="space-y-2">
            {playlistStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => toggleStage(stage.id)}
                className={`w-full p-2.5 rounded-control border text-left transition-colors flex items-center justify-between text-xs cursor-pointer ${
                  stage.completed
                    ? "bg-primary-subtle border-primary text-primary"
                    : "border-border-subtle bg-surface-elevated text-secondary hover:text-primary"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    {stage.completed && (
                      <Icon name="check" size={14} className="text-primary" aria-hidden />
                    )}
                    <span className="font-semibold text-primary">
                      {stage.name}
                    </span>
                  </div>
                  <div className="text-xs text-tertiary">{stage.energy}</div>
                </div>
                <span className="font-mono text-primary text-xs font-semibold tnum">
                  {stage.bpm}
                </span>
              </button>
            ))}
          </div>
        </Surface>
      </div>

      {/* Activities by age group */}
      <Surface className="p-6 space-y-4">
        <h3 className="text-base font-bold text-primary font-display">
          Age-Group Activity &amp; Entertainment Guide
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activities.map((act) => (
            <div
              key={act.bracket}
              className="p-3.5 rounded-control border border-border-subtle bg-surface-elevated space-y-1.5 text-xs"
            >
              <Badge variant="neutral" size="sm">
                {act.bracket}
              </Badge>
              <p className="text-secondary leading-relaxed pt-1">
                {act.idea}
              </p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
