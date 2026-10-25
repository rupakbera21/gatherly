"use client";

import React, { useEffect } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

export interface ToastProps {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "danger" | "neutral";
  variant?: "info" | "success" | "warning" | "danger" | "neutral";
  action?: { label: string; onClick: () => void };
  onUndo?: () => void;
  undoLabel?: string;
  onDismiss: (id: string) => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = "info",
  variant,
  action,
  onUndo,
  undoLabel = "Undo",
  onDismiss,
  durationMs = 6000,
}) => {
  const effectiveType = (variant || type) === "neutral" ? "info" : (variant || type);
  const effectiveUndo = onUndo || action?.onClick;
  const effectiveUndoLabel = action?.label || undoLabel;
  useEffect(() => {
    if (durationMs > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [id, durationMs, onDismiss]);

  const configMap = {
    info: { icon: "info" as const, border: "border-status-info-border", text: "text-status-info" },
    success: { icon: "check" as const, border: "border-status-success-border", text: "text-status-success" },
    warning: { icon: "alert" as const, border: "border-status-warning-border", text: "text-status-warning" },
    danger: { icon: "alert" as const, border: "border-status-danger-border", text: "text-status-danger" },
  };
  const typeConfig = configMap[effectiveType as keyof typeof configMap] || configMap.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        flex items-center gap-3 px-4 py-3 bg-surface border ${typeConfig.border}
        rounded-surface shadow-floating text-sm text-primary max-w-md w-full
        animate-in fade-in slide-in-from-bottom-2 duration-fast
      `}
    >
      <Icon name={typeConfig.icon} size={18} className={typeConfig.text} aria-hidden />
      <span className="flex-1 font-medium">{message}</span>
      {effectiveUndo && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            effectiveUndo();
            onDismiss(id);
          }}
          className="text-xs"
        >
          {effectiveUndoLabel}
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(id)}
        className="text-tertiary hover:text-primary p-1 rounded-control transition-colors"
      >
        <Icon name="x" size={14} aria-hidden />
      </button>
    </div>
  );
};
