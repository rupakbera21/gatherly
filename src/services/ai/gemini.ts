/**
 * @module ai/gemini
 * @purpose Primary AI provider adapter using official @google/genai SDK.
 *          Implements LLMProvider interface with per-attempt timeout,
 *          structured JSON parsing, Zod validation, and error classification.
 * @rubric GenAI Architecture – Primary provider adapter.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { logger } from "../logger";
import {
  AIErrorDetails,
  GenerationOptions,
  LLMProvider,
  PromptPayload,
} from "./types";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      throw this.buildError({
        type: "quota",
        message: "GEMINI_API_KEY is not configured",
        retryable: false,
      });
    }
    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  private buildError(details: Omit<AIErrorDetails, "provider">): Error {
    const err = new Error(details.message);
    (err as unknown as { aiDetails: AIErrorDetails }).aiDetails = {
      ...details,
      provider: "gemini",
    };
    return err;
  }

  async generateStructured<T>(
    task: string,
    schema: z.ZodType<T>,
    prompt: PromptPayload,
    opts: GenerationOptions = {}
  ): Promise<T> {
    const ai = this.getClient();
    const model = process.env["GEMINI_MODEL"] || "gemini-2.5-flash";
    const timeoutMs = opts.timeoutMs ?? 20_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info("Calling Gemini", { task, model, timeoutMs });

      const response = await ai.models.generateContent({
        model,
        contents: prompt.userPrompt,
        config: {
          systemInstruction: prompt.systemPrompt,
          responseMimeType: "application/json",
          maxOutputTokens: opts.maxTokens,
          temperature: opts.temperature ?? 0.2,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timer);

      const text = response.text?.trim() || "";
      if (!text) {
        throw this.buildError({
          type: "transient",
          message: "Gemini returned empty response text",
          retryable: true,
        });
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch (parseErr) {
        throw this.buildError({
          type: "schema",
          message: `Gemini JSON parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          retryable: true,
        });
      }

      const parseResult = schema.safeParse(parsedJson);
      if (!parseResult.success) {
        throw this.buildError({
          type: "schema",
          message: `Gemini schema validation failed: ${JSON.stringify(parseResult.error.format())}`,
          retryable: true,
        });
      }

      return parseResult.data;
    } catch (err: unknown) {
      clearTimeout(timer);

      // If already an AI details error
      if (err && typeof err === "object" && "aiDetails" in err) {
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout =
        controller.signal.aborted ||
        msg.includes("aborted") ||
        msg.includes("deadline") ||
        msg.includes("timeout");

      if (isTimeout) {
        throw this.buildError({
          type: "transient",
          message: `Gemini timed out after ${timeoutMs}ms`,
          retryable: true,
        });
      }

      // Quota / Credit exhaustion detection
      const isQuota =
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("credit") ||
        msg.includes("billing") ||
        msg.includes("limit: 0");

      if (isQuota) {
        throw this.buildError({
          type: "quota",
          statusCode: 429,
          message: `Gemini quota exhausted: ${msg}`,
          retryable: false,
        });
      }

      // Transient rate limits / server errors
      const isTransient =
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("overloaded");

      if (isTransient) {
        throw this.buildError({
          type: "transient",
          statusCode: 429,
          message: `Gemini transient error: ${msg}`,
          retryable: true,
        });
      }

      // General fallback error
      throw this.buildError({
        type: "unknown",
        message: `Gemini error: ${msg}`,
        retryable: false,
      });
    }
  }
}
