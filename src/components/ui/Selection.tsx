"use client";

import React, { forwardRef, useId } from "react";
import { Icon } from "./Icon";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  helperText?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, id: customId, className = "", checked, disabled, ...rest }, ref) => {
    const generatedId = useId();
    const id = customId || generatedId;

    return (
      <label
        htmlFor={id}
        className={`inline-flex items-start gap-3 cursor-pointer select-none min-h-11 py-1.5 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          <div
            className={`
              w-5 h-5 rounded-control border flex items-center justify-center
              transition-colors duration-fast peer-focus-visible:ring-2 peer-focus-visible:ring-primary
              ${
                checked
                  ? "bg-primary border-primary text-white"
                  : "bg-surface border-border-strong hover:border-primary"
              }
            `}
          >
            {checked && <Icon name="check" size={14} aria-hidden />}
          </div>
        </div>
        {(label || helperText) && (
          <div className="flex flex-col text-sm text-left">
            {label && <span className="font-medium text-primary">{label}</span>}
            {helperText && <span className="text-xs text-tertiary mt-0.5">{helperText}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  helperText?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, helperText, id: customId, className = "", checked, disabled, ...rest }, ref) => {
    const generatedId = useId();
    const id = customId || generatedId;

    return (
      <label
        htmlFor={id}
        className={`inline-flex items-start gap-3 cursor-pointer select-none min-h-11 py-1.5 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={id}
            type="radio"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          <div
            className={`
              w-5 h-5 rounded-full border flex items-center justify-center
              transition-colors duration-fast peer-focus-visible:ring-2 peer-focus-visible:ring-primary
              ${
                checked
                  ? "border-primary"
                  : "bg-surface border-border-strong hover:border-primary"
              }
            `}
          >
            {checked && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
          </div>
        </div>
        {(label || helperText) && (
          <div className="flex flex-col text-sm text-left">
            {label && <span className="font-medium text-primary">{label}</span>}
            {helperText && <span className="text-xs text-tertiary mt-0.5">{helperText}</span>}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = "Radio";

export interface SwitchProps {
  label?: React.ReactNode;
  helperText?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  helperText,
  checked,
  onChange,
  disabled = false,
  id: customId,
  className = "",
}) => {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center justify-between gap-4 cursor-pointer select-none min-h-11 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {(label || helperText) && (
        <div className="flex flex-col text-sm text-left mr-auto">
          {label && <span className="font-medium text-primary">{label}</span>}
          {helperText && <span className="text-xs text-tertiary mt-0.5">{helperText}</span>}
        </div>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${checked ? "bg-primary" : "bg-border-strong"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0
            transition duration-fast ease-in-out
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </label>
  );
};
