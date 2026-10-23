/**
 * @module ai/types
 * @purpose Common interfaces, task tokens, and types for LLM providers and orchestrator.
 *          Decouples the orchestrator from concrete SDKs so tests can inject fakes.
 * @rubric Modularity & Code Quality – Ports & Adapters pattern.
 */

import { z } from "zod";

export type AIProviderName = "gemini" | "groq" | "baseline";

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

export interface LLMProvider {
  readonly name: AIProviderName;
  generateStructured<T>(
    task: string,
    schema: z.ZodType<T>,
    prompt: PromptPayload,
    opts?: GenerationOptions
  ): Promise<T>;
}

export type AIErrorType =
  | "quota"
  | "transient"
  | "invalid_input"
  | "schema"
  | "unknown";

export interface AIErrorDetails {
  type: AIErrorType;
  provider: AIProviderName;
  statusCode?: number;
  message: string;
  retryable: boolean;
}

/** Standard max token budgets per task */
export const TASK_MAX_TOKENS: Record<string, number> = {
  "parse-intake": 1024,
  "propose-budget": 1024,
  "generate-timeline": 2048,
  "generate-vendors": 1536,
  "generate-ideas": 1536,
  "copilot": 1536,
  "analyze-quote": 2048,
  "run-of-show": 2048,
};
