"use client";

/**
 * @module NewEventPage
 * @purpose Dedicated route for starting a new event plan intake.
 * @rubric Problem Statement Alignment – Natural-language event intake.
 */

import React from "react";
import Link from "next/link";
import { IntakeSection } from "@/components/intake/IntakeSection";

export default function NewEventPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link
          href="/events"
          className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 mb-3"
        >
          ← Back to My Events
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
          Create New Event Plan
        </h1>
        <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
          Describe what you are planning and our AI assistant will extract your structured plan.
        </p>
      </div>

      <IntakeSection />
    </div>
  );
}
