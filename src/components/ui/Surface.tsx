"use client";

import React from "react";

export type SurfaceVariant = "default" | "elevated" | "outlined";
export type SurfaceTint = "wedding" | "birthday" | "community" | "none";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  tint?: SurfaceTint;
  eventTint?: SurfaceTint;
  children: React.ReactNode;
}

const tintStyles: Record<SurfaceTint, string> = {
  none: "",
  wedding: "border-t-2 border-t-tint-wedding",
  birthday: "border-t-2 border-t-tint-birthday",
  community: "border-t-2 border-t-tint-community",
};

const variantStyles: Record<SurfaceVariant, string> = {
  default: "bg-surface border border-border-subtle rounded-surface",
  elevated: "bg-surface-elevated border border-border-subtle rounded-surface",
  outlined: "bg-transparent border border-border-strong rounded-surface",
};

export const Surface: React.FC<SurfaceProps> = ({
  variant = "default",
  tint = "none",
  eventTint,
  children,
  className = "",
  ...rest
}) => {
  const effectiveTint = eventTint || tint;
  return (
    <div
      className={`
        relative p-5 transition-colors duration-fast text-left
        ${variantStyles[variant]}
        ${tintStyles[effectiveTint]}
        ${className}
      `.trim()}
      {...rest}
    >
      {children}
    </div>
  );
};

export interface StatProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  subtitle,
  badge,
  icon,
  className = "",
}) => {
  return (
    <div className={`flex flex-col gap-1 text-left ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
          {label}
        </span>
        {badge}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        {icon && <span className="text-primary">{icon}</span>}
        <span className="text-2xl font-bold font-display text-primary tnum tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && <p className="text-xs text-tertiary mt-0.5">{subtitle}</p>}
    </div>
  );
};
