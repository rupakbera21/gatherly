"use client";

import React from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  caption?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No items to display.",
  caption,
  className = "",
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-8 px-4 text-center text-sm text-tertiary bg-surface border border-border-subtle rounded-surface">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden border border-border-subtle rounded-surface bg-surface ${className}`}>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border-subtle bg-surface-elevated">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-secondary ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-surface-elevated/50 transition-colors duration-fast"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 text-primary ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card Layout (Under 640px) */}
      <div className="sm:hidden divide-y divide-border-subtle">
        {data.map((row) => (
          <div key={keyExtractor(row)} className="p-4 flex flex-col gap-2">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-start justify-between gap-4 text-xs"
              >
                <span className="font-semibold text-secondary uppercase tracking-wider">
                  {col.header}
                </span>
                <span className="text-primary text-right font-medium">
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
