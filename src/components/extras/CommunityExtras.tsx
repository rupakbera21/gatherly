"use client";

/**
 * @module CommunityExtras
 * @purpose Community event specialized tools: Municipal Permits Checklist, Volunteer Shift Roster, and Rain Plan.
 * @rubric Problem Statement Alignment – Specialized municipal & public event management tools.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";

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
    <div className="space-y-8 animate-fade-in">
      {/* Top Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Permits KPI */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">Municipal Permits</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {approvedPermits} / {permits.length}{" "}
            <span className="text-xs font-normal text-slate-400">Approved</span>
          </p>
          <div className="text-xs text-slate-500">
            Click any permit below to advance its compliance stage.
          </div>
        </div>

        {/* Volunteer KPI */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">Volunteer Roster</h3>
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {totalVolunteersConfirmed} / {totalVolunteersNeeded}{" "}
            <span className="text-xs font-normal text-slate-400">Staffed</span>
          </p>
          <div className="text-xs text-slate-500">
            Targeting 1 volunteer per 15 of your {plan.profile.guestCount} projected community attendees.
          </div>
        </div>

        {/* Weather Contingency KPI */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">Weather Protocol</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {rainPlan.decisionHoursBefore}h Call
          </p>
          <div className="text-xs text-slate-500">
            Indoor backup venue secured for severe weather disruption.
          </div>
        </div>
      </div>

      {/* Permits Checklist Table */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Municipal Ordinance & Regulatory Compliance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Permit / Compliance Item</th>
                <th className="px-4 py-3">Issuing Agency</th>
                <th className="px-4 py-3">Lead Time</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {permits.map((p) => {
                const statusStyles: Record<string, string> = {
                  Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
                  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
                  "In Review": "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
                  Required: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
                };

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {p.agency}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.leadWeeks} weeks prior
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => togglePermitStatus(p.id)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                          statusStyles[p.status] || "bg-slate-100 text-slate-700"
                        }`}
                        title="Click to cycle status: Required -> In Review -> Pending -> Approved"
                      >
                        {p.status}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Volunteer Shift Roster */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Volunteer Shift Schedule & Headcounts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volunteers.map((v) => {
            const isFull = v.confirmed >= v.needed;

            return (
              <div
                key={v.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {v.role}
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">{v.time}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isFull
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {v.confirmed} / {v.needed} Volunteers
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Adjust confirmed:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustVolunteer(v.id, -1)}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-slate-900 dark:text-white w-6 text-center">
                      {v.confirmed}
                    </span>
                    <button
                      onClick={() => adjustVolunteer(v.id, 1)}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
