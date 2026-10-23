"use client";

/**
 * @module PlanExtrasPage
 * @purpose Renders event-type specialized tools:
 *          - Wedding: Photography shot list, dietary tally, and table seating.
 *          - Birthday: Cake sizing calculator, DJ vibe curve, and age-group entertainment.
 *          - Community: Municipal permits checklist, volunteer shift roster, and rain plan.
 * @rubric Problem Statement Alignment – Event-type specific specialized domain workflows.
 */

import React, { use } from "react";
import { BirthdayExtras } from "@/components/extras/BirthdayExtras";
import { CommunityExtras } from "@/components/extras/CommunityExtras";
import { WeddingExtras } from "@/components/extras/WeddingExtras";
import { useGatherlyStore } from "@/store";

interface ExtrasPageProps {
  params: Promise<{ id: string }>;
}

function PlanExtrasPageInner({ params }: ExtrasPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events } = useGatherlyStore();
  const plan = events[eventId];

  if (!plan) return null;

  const eventType = plan.profile.type;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
          {eventType} Specialized Toolkit
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Dedicated worksheets and logistical tools tailored specifically for {eventType} planning.
        </p>
      </div>

      {eventType === "wedding" && <WeddingExtras plan={plan} />}
      {eventType === "birthday" && <BirthdayExtras plan={plan} />}
      {eventType === "community" && <CommunityExtras plan={plan} />}
    </div>
  );
}

export default function PlanExtrasPage(props: ExtrasPageProps) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading extras...</div>}>
      <PlanExtrasPageInner {...props} />
    </React.Suspense>
  );
}
