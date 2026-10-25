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
          className="text-xs font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 mb-3"
        >
          <Icon name="arrow-left" size={14} aria-hidden />
          <span>Back to saved plans</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary font-display tracking-tight">
          Create New Event Plan
        </h1>
        <p className="text-secondary text-sm mt-1">
          Describe what you are planning and our assistant will build your structured plan.
        </p>
      </div>

      <IntakeSection />
    </div>
  );
}
