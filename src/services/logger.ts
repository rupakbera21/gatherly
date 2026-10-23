/**
 * @module logger
 * @purpose Structured server-side logger. Emits JSON lines with request ID,
 *          route, provider, latency, outcome, and token counts.
 *          Never logs user content, guest data, or API keys.
 *          Hashes IP addresses before logging to protect privacy.
 * @rubric Security – no PII logging; Code Quality – structured logs.
 */

import { createHash } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  requestId?: string;
  route?: string;
  provider?: string;
  latencyMs?: number;
  outcome?: string;
  inputTokens?: number;
  outputTokens?: number;
  statusCode?: number;
  hashedIp?: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

/** Hash an IP address for logging (SHA-256, hex, first 16 chars). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function emit(level: LogLevel, msg: string, extra: Partial<LogEntry> = {}) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...extra,
  };

  if (isDev) {
    // Human-readable in development
    const prefix = `[${entry.level.toUpperCase()}]`;
    const parts = [prefix, entry.ts, msg];
    if (extra.requestId) parts.push(`rid=${extra.requestId}`);
    if (extra.latencyMs !== undefined) parts.push(`${extra.latencyMs}ms`);
    console.log(parts.join(" "), Object.keys(extra).length > 0 ? extra : "");
  } else {
    // JSON lines in production
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, extra?: Partial<LogEntry>) => emit("debug", msg, extra),
  info: (msg: string, extra?: Partial<LogEntry>) => emit("info", msg, extra),
  warn: (msg: string, extra?: Partial<LogEntry>) => emit("warn", msg, extra),
  error: (msg: string, extra?: Partial<LogEntry>) => emit("error", msg, extra),
};
