"use client";

import React, { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog container or first focusable element
      setTimeout(() => {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.[0]?.focus();
      }, 50);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-normal"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-desc" : undefined}
        className={`
          w-full ${maxWidthMap[maxWidth]} bg-surface border border-border-subtle
          rounded-overlay shadow-overlay p-6 flex flex-col gap-4 text-left
          animate-in fade-in zoom-in-95 duration-fast
        `}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="dialog-title" className="text-lg font-bold font-display text-primary">
              {title}
            </h2>
            {description && (
              <p id="dialog-desc" className="text-xs text-secondary">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="x" size={16} aria-hidden />
          </Button>
        </div>

        <div className="py-2 text-sm text-primary">{children}</div>

        {footer && <div className="flex items-center justify-end gap-3 pt-2">{footer}</div>}
      </div>
    </div>
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.[0]?.focus();
      }, 50);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-normal"
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby={description ? "drawer-desc" : undefined}
        className="
          w-full sm:max-w-md h-full bg-surface border-l border-border-subtle shadow-overlay
          flex flex-col text-left animate-in slide-in-from-right duration-fast
        "
      >
        <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 id="drawer-title" className="text-base font-bold font-display text-primary">
              {title}
            </h2>
            {description && (
              <p id="drawer-desc" className="text-xs text-secondary">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Close drawer"
            onClick={onClose}
          >
            <Icon name="x" size={16} aria-hidden />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-sm text-primary">{children}</div>

        {footer && (
          <div className="p-4 border-t border-border-subtle bg-surface-elevated flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs transition-opacity duration-normal sm:hidden"
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="
          w-full max-h-5/6 bg-surface border-t border-border-subtle rounded-t-overlay shadow-overlay
          flex flex-col text-left animate-in slide-in-from-bottom duration-fast
        "
      >
        <div className="pt-3 pb-2 flex flex-col items-center border-b border-border-subtle">
          <div className="w-10 h-1 bg-border-strong rounded-full mb-2" />
          <div className="w-full px-4 flex items-center justify-between">
            <div>
              <h2 id="sheet-title" className="text-sm font-bold font-display text-primary">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-secondary">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Close sheet"
              onClick={onClose}
            >
              <Icon name="x" size={16} aria-hidden />
            </Button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
