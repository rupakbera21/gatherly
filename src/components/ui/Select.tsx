"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  id: customId,
}) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        const idx = options.findIndex((opt) => opt.value === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && options[focusedIndex]) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case "Escape":
      case "Tab":
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col gap-1.5 text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="text-xs font-semibold text-secondary uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${id}-label ${id}` : undefined}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            const idx = options.findIndex((opt) => opt.value === value);
            setFocusedIndex(idx >= 0 ? idx : 0);
          }
        }}
        className={`
          w-full h-10 px-3 py-2 text-sm text-left bg-surface border rounded-control
          flex items-center justify-between gap-2 transition-colors duration-fast
          focus:outline-none focus:border-primary disabled:opacity-50 disabled:bg-surface-elevated
          cursor-pointer disabled:cursor-not-allowed border-border-strong
        `}
      >
        <span className={selectedOption ? "text-primary font-medium" : "text-tertiary"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={16}
          className={`text-tertiary transition-transform duration-fast ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={label ? `${id}-label` : undefined}
          className="absolute z-50 top-full mt-1 w-full max-h-60 overflow-auto bg-surface border border-border-subtle rounded-control shadow-lg py-1 focus:outline-none"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIndex;
            return (
              <li
                key={opt.value}
                id={`${id}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`
                  px-3 py-2 text-sm flex items-center justify-between cursor-pointer select-none
                  transition-colors duration-fast
                  ${isFocused ? "bg-surface-elevated" : ""}
                  ${isSelected ? "font-semibold text-primary" : "text-secondary"}
                `}
              >
                <div>
                  <div>{opt.label}</div>
                  {opt.description && (
                    <div className="text-xs text-tertiary">{opt.description}</div>
                  )}
                </div>
                {isSelected && (
                  <Icon name="check" size={16} className="text-primary ml-2" aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
