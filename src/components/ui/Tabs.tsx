"use client";

import React, { useRef } from "react";
import { Icon, IconName } from "./Icon";

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "segmented" | "underline";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  variant = "underline",
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowRight") {
      nextIndex = index < tabs.length - 1 ? index + 1 : 0;
    } else if (e.key === "ArrowLeft") {
      nextIndex = index > 0 ? index - 1 : tabs.length - 1;
    }

    const targetTab = nextIndex >= 0 ? tabs[nextIndex] : undefined;
    if (targetTab) {
      e.preventDefault();
      onChange(targetTab.id);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  if (variant === "segmented") {
    return (
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation="horizontal"
        className={`inline-flex items-center p-1 bg-surface-elevated border border-border-subtle rounded-control gap-1 ${className}`}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`
                flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-control
                transition-colors duration-fast select-none min-h-9
                ${
                  isActive
                    ? "bg-surface text-primary shadow-sm border border-border-subtle"
                    : "text-secondary hover:text-primary hover:bg-surface/50 border border-transparent"
                }
              `}
            >
              {tab.icon && <Icon name={tab.icon} size={14} aria-hidden />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-surface border border-border-subtle text-secondary"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-orientation="horizontal"
      className={`flex items-center gap-1 border-b border-border-subtle overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`
              relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
              transition-colors duration-fast select-none min-h-11 border-b-2
              ${
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-secondary hover:text-primary hover:border-border-strong"
              }
            `}
          >
            {tab.icon && <Icon name={tab.icon} size={16} aria-hidden />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-semibold bg-surface-elevated text-secondary border border-border-subtle">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
