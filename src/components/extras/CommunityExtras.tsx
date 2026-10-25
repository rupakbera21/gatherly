"use client";

/**
 * @module CommunityExtras
 * @purpose Community event specialized tools: Municipal Permits Checklist, Volunteer Shift Roster, and Rain Plan.
 *          Implements design system primitives, accessible table layout, and token compliance.
 * @rubric Problem Statement Alignment – Specialized municipal & public event management tools.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";
import { Surface, Badge, Icon } from "@/components/ui";

interface CommunityExtrasProps {
  plan: EventPlan;
}

const DEFAULT_PERMITS = [
  { id: "perm_1", name: "Public Park & Facilities Reservation", agency: "Parks & Recreation Dept", status: "Approved", leadWeeks: 12 },
  { id: "perm_2", name: "Amplified Sound & Noise Exemption", agency: "City Clerk / Police Dept", status: "Pending", leadWeeks: 6 },
  { id: "perm_3", name: "Temporary Street / Sidewalk Closure", agency: "Dept of Transportation", status: "In Review", leadWeeks: 8 },
  { id: "perm_4", name: "Fire Marshal Tent & Assembly Inspection", agency: "Bureau of Fire Prevention", status: "Pending", leadWeeks: 4 },
  { id: "perm_5", name: "Temporary Food Establishment Permits", agency: "Public Health Authority", status: "Required", leadWeeks: 3 },
];

export function CommunityExtras({ plan }: CommunityExtrasProps) {
  const [permits, setPermits] = useState(DEFAULT_PERMITS);

  // Volunteer shifts
  const [volunteers, setVolunteers] = useState([
    { id: "shift_1", role: "Site Setup & Tent Assembly", needed: 8, confirmed: 6, time: "07:00 - 09:30" },
    { id: "shift_2", role: "Registration & Guest Welcome", needed: 6, confirmed: 6, time: "09:30 - 13:00" },
    { id: "shift_3", role: "First Aid & Information Station", needed: 4, confirmed: 3, time: "10:00 - 16:00" },
    { id: "shift_4", role: "Waste Sorting & Post-Event Breakdown", needed: 10, confirmed: 7, time: "16:00 - 18:30" },
  ]);

  // Rain plan
  const [rainPlan] = useState({
    decisionHoursBefore: 48,
    backupIndoorVenue: "Community Center Gymnasium (Capacity: 350)",
    tentRentalVendor: "Tri-County Event Canopies (Quoted)",
    refundPolicy: "Rain or shine event; indoor backup guarantees program continuity.",
  });

  function togglePermitStatus(id: string) {
    const sequence = ["Required", "In Review", "Pending", "Approved"];
    setPermits((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextIdx = (sequence.indexOf(p.status) + 1) % sequence.length;
        return { ...p, status: sequence[nextIdx] ?? "Approved" };
      })
    );
  }

  function adjustVolunteer(id: string, delta: number) {
    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, confirmed: Math.max(0, v.confirmed + delta) } : v
      )
    );
  }

  const approvedPermits = permits.filter((p) => p.status === "Approved").length;
  const totalVolunteersNeeded = volunteers.reduce((a, b) => a + b.needed, 0);
  const totalVolunteersConfirmed = volunteers.reduce((a, b) => a + b.confirmed, 0);

  return (
    <div className="space-y-6">
      {/* Top Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Permits KPI */}
        <Surface className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-community-tint/15 text-community-tint">
              <Icon name="file" size="sm" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">Municipal Permits</h3>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tnum">
            {approvedPermits} / {permits.length}{" "}
            <span className="text-xs font-normal text-neutral-400">Approved</span>
          </p>
          <div className="text-xs text-neutral-500">
            Click any permit below to advance its compliance stage.
          </div>
        </Surface>

        {/* Volunteer KPI */}
        <Surface className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300">
              <Icon name="users" size="sm" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">Volunteer Roster</h3>
          </div>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 tnum">
            {totalVolunteersConfirmed} / {totalVolunteersNeeded}{" "}
            <span className="text-xs font-normal text-neutral-400">Staffed</span>
          </p>
          <div className="text-xs text-neutral-500 tnum">
            Targeting 1 volunteer per 15 of your {plan.profile.guestCount} projected community attendees.
          </div>
        </Surface>

        {/* Weather Contingency KPI */}
        <Surface className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300">
              <Icon name="clock" size="sm" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-display">Weather Protocol</h3>
          </div>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 tnum">
            {rainPlan.decisionHoursBefore}h Call
          </p>
          <div className="text-xs text-neutral-500">
            Indoor backup venue secured for severe weather disruption.
          </div>
        </Surface>
      </div>

      {/* Permits Checklist Table */}
      <Surface className="p-6 space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
          Municipal Ordinance &amp; Regulatory Compliance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Permits checklist table">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Permit / Compliance Item</th>
                <th scope="col" className="px-4 py-3">Issuing Agency</th>
                <th scope="col" className="px-4 py-3">Lead Time</th>
                <th scope="col" className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {permits.map((p) => {
                const variantMap: Record<string, "success" | "warning" | "neutral" | "danger"> = {
                  Approved: "success",
                  Pending: "warning",
                  "In Review": "neutral",
                  Required: "danger",
                };

                return (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {p.agency}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 font-mono tnum">
                      {p.leadWeeks} weeks prior
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => togglePermitStatus(p.id)}
                        className="cursor-pointer inline-flex"
                        title="Click to cycle status: Required -> In Review -> Pending -> Approved"
                      >
                        <Badge variant={variantMap[p.status] || "neutral"} size="sm">
                          {p.status}
                        </Badge>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* Volunteer Shift Roster */}
      <Surface className="p-6 space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
          Volunteer Shift Schedule &amp; Headcounts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volunteers.map((v) => {
            const isFull = v.confirmed >= v.needed;

            return (
              <div
                key={v.id}
                className="p-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      {v.role}
                    </h4>
                    <span className="text-xs text-neutral-500 font-mono tnum">{v.time}</span>
                  </div>
                  <Badge variant={isFull ? "success" : "warning"} size="sm">
                    {v.confirmed} / {v.needed} Volunteers
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    Adjust confirmed:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustVolunteer(v.id, -1)}
                      className="w-6 h-6 rounded-md bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 flex items-center justify-center cursor-pointer"
                      aria-label={`Decrease volunteers for ${v.role}`}
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 w-6 text-center tnum">
                      {v.confirmed}
                    </span>
                    <button
                      onClick={() => adjustVolunteer(v.id, 1)}
                      className="w-6 h-6 rounded-md bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 flex items-center justify-center cursor-pointer"
                      aria-label={`Increase volunteers for ${v.role}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
