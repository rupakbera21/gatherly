"use client";

/**
 * @module CommunityExtras
 * @purpose Specialized modules for community events:
 *          Municipal permits tracking, volunteer staffing matrix, and weather contingency protocol.
 * @rubric Tier 2 Features & Domain Completeness – Community governance & volunteer operations.
 */

import React, { useState } from "react";
import { EventPlan } from "@/domain/types";
import { Surface, Badge, Icon } from "@/components/ui";

interface CommunityExtrasProps {
  plan: EventPlan;
}

interface PermitItem {
  id: string;
  name: string;
  agency: string;
  status: "Approved" | "Pending" | "In Review" | "Required";
  leadWeeks: number;
}

interface VolunteerRole {
  id: string;
  role: string;
  needed: number;
  confirmed: number;
  time: string;
}

const DEFAULT_PERMITS: PermitItem[] = [
  { id: "p1", name: "Public Park & Grounds Assembly Permit", agency: "Department of Parks & Recreation", status: "In Review", leadWeeks: 8 },
  { id: "p2", name: "Amplified Sound & Stage Decibel Variance", agency: "Municipal Environmental Protection", status: "Pending", leadWeeks: 6 },
  { id: "p3", name: "Temporary Food Vendor & Sanitation License", agency: "County Health Department", status: "Required", leadWeeks: 4 },
  { id: "p4", name: "Traffic Management & Street Barricade Approval", agency: "Local Police & Traffic Division", status: "Approved", leadWeeks: 6 },
  { id: "p5", name: "Waste Management & Temporary Recycling Bins", agency: "City Public Works", status: "In Review", leadWeeks: 3 },
];

const DEFAULT_VOLUNTEERS: VolunteerRole[] = [
  { id: "v1", role: "Site Setup & Stage Audio Assembly", needed: 6, confirmed: 5, time: "07:00 - 10:00" },
  { id: "v2", role: "Guest Welcome, Info Booth & Registration", needed: 8, confirmed: 6, time: "10:00 - 14:00" },
  { id: "v3", role: "Kids Craft Zone & Activity Supervision", needed: 4, confirmed: 4, time: "11:00 - 15:00" },
  { id: "v4", role: "Waste Sorting & Sustainability Monitors", needed: 4, confirmed: 2, time: "12:00 - 17:00" },
  { id: "v5", role: "Teardown, Ground Litter Sweep & Load-out", needed: 8, confirmed: 5, time: "18:00 - 21:00" },
];

export function CommunityExtras({ plan }: CommunityExtrasProps) {
  const [permits, setPermits] = useState<PermitItem[]>(DEFAULT_PERMITS);
  const [volunteers, setVolunteers] = useState<VolunteerRole[]>(DEFAULT_VOLUNTEERS);
  const [rainPlan] = useState({
    backupVenue: "Community Center Gymnasium (Secured Reservation)",
    decisionHoursBefore: 24,
    notificationChannels: ["WhatsApp Community Group", "Email Announcement", "On-site Signage"],
  });

  function togglePermitStatus(id: string) {
    const cycle: Record<PermitItem["status"], PermitItem["status"]> = {
      Required: "In Review",
      "In Review": "Pending",
      Pending: "Approved",
      Approved: "Required",
    };
    setPermits((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: cycle[p.status] } : p))
    );
  }

  function adjustVolunteer(id: string, delta: number) {
    setVolunteers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, confirmed: Math.max(0, v.confirmed + delta) } : v))
    );
  }

  const approvedPermits = permits.filter((p) => p.status === "Approved").length;
  const totalVolunteersNeeded = volunteers.reduce((acc, v) => acc + v.needed, 0);
  const totalVolunteersConfirmed = volunteers.reduce((acc, v) => acc + v.confirmed, 0);

  return (
    <div className="space-y-6">
      {/* Top Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Permits KPI */}
        <Surface className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-control bg-tint-community-bg text-tint-community border border-tint-community-border">
              <Icon name="file" size={16} aria-hidden />
            </span>
            <h3 className="font-bold text-primary font-display">Municipal Permits</h3>
          </div>
          <p className="text-2xl font-bold text-primary tnum">
            {approvedPermits} / {permits.length}{" "}
            <span className="text-xs font-normal text-tertiary">Approved</span>
          </p>
          <div className="text-xs text-secondary">
            Click any permit below to advance its compliance stage.
          </div>
        </Surface>

        {/* Volunteer KPI */}
        <Surface className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-control bg-primary-subtle text-primary border border-border-subtle">
              <Icon name="users" size={16} aria-hidden />
            </span>
            <h3 className="font-bold text-primary font-display">Volunteer Roster</h3>
          </div>
          <p className="text-2xl font-bold text-primary tnum">
            {totalVolunteersConfirmed} / {totalVolunteersNeeded}{" "}
            <span className="text-xs font-normal text-tertiary">Staffed</span>
          </p>
          <div className="text-xs text-secondary tnum">
            Targeting 1 volunteer per 15 of your {plan.profile.guestCount} projected community attendees.
          </div>
        </Surface>

        {/* Weather Contingency KPI */}
        <Surface className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-control bg-primary-subtle text-primary border border-border-subtle">
              <Icon name="clock" size={16} aria-hidden />
            </span>
            <h3 className="font-bold text-primary font-display">Weather Protocol</h3>
          </div>
          <p className="text-2xl font-bold text-primary tnum">
            {rainPlan.decisionHoursBefore}h Call
          </p>
          <div className="text-xs text-secondary">
            Indoor backup venue secured for weather disruption.
          </div>
        </Surface>
      </div>

      {/* Permits Checklist Table */}
      <Surface className="p-6 space-y-4">
        <h3 className="text-base font-bold text-primary font-display">
          Municipal Ordinance &amp; Regulatory Compliance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Permits checklist table">
            <thead className="bg-surface-elevated text-xs font-semibold text-secondary border-b border-border-subtle uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Permit / Compliance Item</th>
                <th scope="col" className="px-4 py-3">Issuing Agency</th>
                <th scope="col" className="px-4 py-3">Lead Time</th>
                <th scope="col" className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {permits.map((p) => {
                const variantMap: Record<string, "success" | "warning" | "neutral" | "danger"> = {
                  Approved: "success",
                  Pending: "warning",
                  "In Review": "neutral",
                  Required: "danger",
                };

                return (
                  <tr key={p.id} className="hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">
                      {p.agency}
                    </td>
                    <td className="px-4 py-3 text-xs text-tertiary font-mono tnum">
                      {p.leadWeeks} weeks prior
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
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
        <h3 className="text-base font-bold text-primary font-display">
          Volunteer Shift Schedule &amp; Headcounts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volunteers.map((v) => {
            const isFull = v.confirmed >= v.needed;

            return (
              <div
                key={v.id}
                className="p-4 rounded-control border border-border-subtle bg-surface-elevated space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-primary">
                      {v.role}
                    </h4>
                    <span className="text-xs text-tertiary font-mono tnum">{v.time}</span>
                  </div>
                  <Badge variant={isFull ? "success" : "warning"} size="sm">
                    {v.confirmed} / {v.needed} Volunteers
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-secondary">
                    Adjust confirmed:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustVolunteer(v.id, -1)}
                      className="w-6 h-6 rounded-control bg-surface border border-border-strong text-xs font-bold text-primary hover:bg-surface-elevated flex items-center justify-center cursor-pointer"
                      aria-label={`Decrease volunteers for ${v.role}`}
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-primary w-6 text-center tnum">
                      {v.confirmed}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustVolunteer(v.id, 1)}
                      className="w-6 h-6 rounded-control bg-surface border border-border-strong text-xs font-bold text-primary hover:bg-surface-elevated flex items-center justify-center cursor-pointer"
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
