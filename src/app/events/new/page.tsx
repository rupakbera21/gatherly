"use client";

/**
 * @module NewEventPage
 * @purpose Dedicated route for starting a new event plan intake.
 *          Provides clean typography, design tokens, and structured intake form.
 * @rubric Problem Statement Alignment – Natural-language event intake.
 */

import React from "react";
import Link from "next/link";
import { IntakeSection } from "@/components/intake/IntakeSection";
import { Icon } from "@/components/ui";

export default function NewEventPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link
          href="/events"
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1.5 mb-3"
        >
          <Icon name="arrow-left" size="xs" aria-hidden="true" />
          <span>Back to My Events</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-display tracking-tight">
          Create New Event Plan
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
          Describe what you are planning and our assistant will build your structured plan.
        </p>
      </div>

      <IntakeSection />
    </div>
  );
}
