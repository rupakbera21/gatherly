"use client";

import React from "react";
import { Icon, IconName } from "./Icon";
import { Button } from "./Button";

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  max?: number;
  showPercent?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  max = 100,
  showPercent = false,
  className = "",
}) => {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`w-full flex flex-col gap-1.5 text-left ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-medium text-secondary">{label}</span>}
          {showPercent && <span className="text-tertiary tnum font-semibold">{percent}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || "Progress"}
        className="w-full h-2 bg-surface-elevated border border-border-subtle rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-normal ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rectangular" | "circular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  variant = "rectangular",
}) => {
  const variantClass = {
    text: "h-4 rounded-control",
    rectangular: "rounded-control",
    circular: "rounded-full",
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`skeleton animate-pulse ${variantClass} ${className}`.trim()}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
};

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "clipboard",
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center p-8 text-center
        bg-surface border border-border-subtle rounded-surface gap-3
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-secondary">
        <Icon name={icon} size={24} aria-hidden />
      </div>
      <h2 className="text-base font-bold font-display text-primary">{title}</h2>
      <p className="text-sm text-secondary max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className = "",
}) => {
  return (
    <div className={`w-full flex flex-col gap-2 pb-6 border-b border-border-subtle ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-tertiary">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <Icon name="chevron-right" size={12} aria-hidden />}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-primary transition-colors no-underline"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="font-semibold text-secondary">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-primary tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
