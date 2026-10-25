"use client";

import React, { forwardRef } from "react";
import { Icon, IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: IconName;
  leftIcon?: IconName;
  rightIcon?: IconName;
  isIconOnly?: boolean;
  "aria-label"?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white border border-transparent hover:opacity-95 active:opacity-90 shadow-sm",
  secondary:
    "bg-surface text-primary border border-border-strong hover:bg-surface-elevated active:border-border-subtle shadow-sm",
  ghost:
    "bg-transparent text-secondary hover:text-primary hover:bg-surface-elevated active:bg-surface border border-transparent",
  danger:
    "bg-status-danger text-white border border-transparent hover:opacity-95 active:opacity-90 shadow-sm",
};

const sizeStyles: Record<ButtonSize, { button: string; touch: string; icon: number }> = {
  sm: {
    button: "h-8 px-3 text-xs gap-1.5 font-medium rounded-control",
    touch: "min-h-11 min-w-11 sm:min-h-8 sm:min-w-0",
    icon: 14,
  },
  md: {
    button: "h-10 px-4 text-sm gap-2 font-medium rounded-control",
    touch: "min-h-11 min-w-11 sm:min-h-10 sm:min-w-0",
    icon: 16,
  },
  lg: {
    button: "h-12 px-5 text-base gap-2.5 font-semibold rounded-control",
    touch: "min-h-11 min-w-11",
    icon: 18,
  },
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-10 w-10 p-0",
  lg: "h-12 w-12 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      leftIcon,
      rightIcon,
      isIconOnly = false,
      disabled = false,
      children,
      className = "",
      type = "button",
      "aria-label": ariaLabel,
      ...rest
    },
    ref
  ) => {
    const sizeConfig = sizeStyles[size];
    const isInteractiveDisabled = disabled || isLoading;
    const effectiveLeftIcon = leftIcon || icon;

    // Accessibility check: Icon-only button must have an aria-label
    if (isIconOnly && !ariaLabel && typeof children !== "string") {
      console.warn("Accessible button warning: Icon-only button must have an aria-label");
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractiveDisabled}
        aria-disabled={isInteractiveDisabled}
        aria-busy={isLoading ? "true" : undefined}
        aria-label={ariaLabel}
        className={`
          relative inline-flex items-center justify-center select-none
          transition-colors duration-fast focus-visible:outline-none
          cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
          ${variantStyles[variant]}
          ${sizeConfig.button}
          ${sizeConfig.touch}
          ${isIconOnly ? iconOnlySizeStyles[size] : ""}
          ${className}
        `.trim()}
        {...rest}
      >
        {isLoading ? (
          <>
            <Icon name="spinner" size={sizeConfig.icon} aria-hidden />
            <span className="sr-only">Loading</span>
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {effectiveLeftIcon && <Icon name={effectiveLeftIcon} size={sizeConfig.icon} aria-hidden />}
            {children}
            {rightIcon && <Icon name={rightIcon} size={sizeConfig.icon} aria-hidden />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
