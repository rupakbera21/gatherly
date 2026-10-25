"use client";

import React from "react";
import { Icon, IconName } from "./Icon";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "wedding"
  | "birthday"
  | "community";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: IconName;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  neutral: {
    bg: "bg-surface-elevated",
    text: "text-secondary",
    border: "border-border-subtle",
  },
  success: {
    bg: "bg-status-success-bg",
    text: "text-status-success",
    border: "border-status-success-border",
  },
  warning: {
    bg: "bg-status-warning-bg",
    text: "text-status-warning",
    border: "border-status-warning-border",
  },
  danger: {
    bg: "bg-status-danger-bg",
    text: "text-status-danger",
    border: "border-status-danger-border",
  },
  info: {
    bg: "bg-status-info-bg",
    text: "text-status-info",
    border: "border-status-info-border",
  },
  wedding: {
    bg: "bg-tint-wedding-bg",
    text: "text-tint-wedding",
    border: "border-tint-wedding-border",
  },
  birthday: {
    bg: "bg-tint-birthday-bg",
    text: "text-tint-birthday",
    border: "border-tint-birthday-border",
  },
  community: {
    bg: "bg-tint-community-bg",
    text: "text-tint-community",
    border: "border-tint-community-border",
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  icon,
  size = "md",
  className = "",
  title,
}) => {
  const styles = variantStyles[variant];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      title={title}
      className={`
        inline-flex items-center font-medium rounded-full border
        ${styles.bg} ${styles.text} ${styles.border}
        ${sizeClasses} ${className}
      `.trim()}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 12 : 14} aria-hidden />}
      <span>{children}</span>
    </span>
  );
};

export interface StatusProps {
  status: "idle" | "loading" | "success" | "warning" | "error";
  label: string;
  className?: string;
}

const statusMap: Record<
  StatusProps["status"],
  { variant: BadgeVariant; icon: IconName }
> = {
  idle: { variant: "neutral", icon: "clock" },
  loading: { variant: "info", icon: "spinner" },
  success: { variant: "success", icon: "check" },
  warning: { variant: "warning", icon: "alert" },
  error: { variant: "danger", icon: "x" },
};

export const Status: React.FC<StatusProps> = ({ status, label, className = "" }) => {
  const conf = statusMap[status];
  return (
    <Badge variant={conf.variant} icon={conf.icon} className={className}>
      {label}
    </Badge>
  );
};
