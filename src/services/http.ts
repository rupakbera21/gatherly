/**
 * @module http
 * @purpose Shared HTTP utilities for API route handlers.
 *          readJsonBodyWithLimit: streams request body with a hard byte cap,
 *          checking Content-Length first to reject oversized requests early.
 *          This prevents unbounded memory usage on serverless functions.
 * @rubric Efficiency – no whole-file buffers; Security – bounded input.
 */

import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { ZodError } from "zod";

/** Default body size limit: 32 KB. */
export const DEFAULT_BODY_LIMIT_BYTES = 32 * 1024;

/** Error codes for typed API responses. */
export type ApiErrorCode =
  | "BODY_TOO_LARGE"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "BOTH_PROVIDERS_FAILED"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR"
  | "NOT_FOUND";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown
): Response {
  const statusMap: Record<ApiErrorCode, number> = {
    BODY_TOO_LARGE: 413,
    INVALID_JSON: 400,
    VALIDATION_ERROR: 422,
    RATE_LIMITED: 429,
    PROVIDER_ERROR: 502,
    BOTH_PROVIDERS_FAILED: 502,
    INVALID_INPUT: 400,
    INTERNAL_ERROR: 500,
    NOT_FOUND: 404,
  };

  const body: ApiError = { code, message };
  if (details !== undefined) body.details = details;

  return Response.json(body, { status: statusMap[code] });
}

export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init });
}

/**
 * Read and parse a JSON request body, enforcing a byte limit.
 * Checks Content-Length header first (fast path), then streams with a cap.
 * Throws with a Response if the body is too large or not valid JSON.
 */
export async function readJsonBodyWithLimit(
  req: NextRequest,
  maxBytes = DEFAULT_BODY_LIMIT_BYTES
): Promise<unknown> {
  // Fast path: reject immediately if Content-Length is declared and too large
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declared = parseInt(contentLength, 10);
    if (!isNaN(declared) && declared > maxBytes) {
      throw apiError(
        "BODY_TOO_LARGE",
        `Request body must be ≤ ${maxBytes} bytes`
      );
    }
  }

  // Stream with hard cap
  const reader = req.body?.getReader();
  if (!reader) {
    throw apiError("INVALID_JSON", "Request body is empty");
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw apiError(
          "BODY_TOO_LARGE",
          `Request body must be ≤ ${maxBytes} bytes`
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const text = new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array(0))
  );

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw apiError("INVALID_JSON", "Request body is not valid JSON");
  }
}

/** Extract request ID from header, or generate a simple fallback. */
export function getRequestId(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

/** Extract and hash IP for safe logging. */
export function getHashedIp(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/** Format a zod validation error for the API response. */
export function formatZodError(err: ZodError): unknown {
  return err.errors.map((e) => ({
    path: e.path.join("."),
    message: e.message,
  }));
}
