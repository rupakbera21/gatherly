"use client";

import React, { forwardRef, useId } from "react";
import { Icon } from "./Icon";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isInvalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      isInvalid = false,
      id: customId,
      disabled = false,
      className = "",
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const hasError = isInvalid || Boolean(errorMessage);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold text-secondary uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={`
              w-full h-10 px-3 py-2 text-sm text-primary bg-surface
              border rounded-control transition-colors duration-fast
              placeholder:text-tertiary focus:outline-none focus:border-primary
              disabled:opacity-50 disabled:bg-surface-elevated disabled:cursor-not-allowed
              ${
                hasError
                  ? "border-status-danger focus:border-status-danger"
                  : "border-border-strong hover:border-border-strong"
              }
              ${className}
            `.trim()}
            {...rest}
          />
        </div>
        {hasError && errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-status-danger flex items-center gap-1 mt-0.5"
          >
            <Icon name="alert" size={14} aria-hidden />
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-tertiary mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
