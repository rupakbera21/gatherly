/**
 * @module ai/groq
 * @purpose Fallback AI provider adapter using plain fetch to GroqCloud OpenAI-compatible API.
 *          Implements LLMProvider interface with per-attempt timeout,
 *          response_format json_object, SSE stream parsing, Zod validation, and error classification.
 *          Strips reasoning-model tags (<think>…</think>) before JSON.parse.
 * @rubric GenAI Architecture – Fallback provider adapter.
 */

import { z } from "zod";
import { logger } from "../logger";
import { stripReasoningTags } from "./cleaner";
import {
  AIErrorDetails,
  GenerationOptions,
  LLMProvider,
  PromptPayload,
} from "./types";

export class GroqProvider implements LLMProvider {
  readonly name = "groq" as const;

  private buildError(details: Omit<AIErrorDetails, "provider">): Error {
    const err = new Error(details.message);
    (err as unknown as { aiDetails: AIErrorDetails }).aiDetails = {
      ...details,
      provider: "groq",
    };
    return err;
  }

  async generateStructured<T>(
    task: string,
    schema: z.ZodType<T>,
    prompt: PromptPayload,
    opts: GenerationOptions = {}
  ): Promise<T> {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      throw this.buildError({
        type: "quota",
        message: "GROQ_API_KEY is not configured",
        retryable: false,
      });
    }

    // Default: llama-3.3-70b-versatile — stable Groq-hosted non-reasoning instruct model.
    // Override via GROQ_MODEL env var if needed.
    const model = process.env["GROQ_MODEL"] || "llama-3.3-70b-versatile";
    const timeoutMs = opts.timeoutMs ?? 20_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    logger.info("Calling Groq fallback", { task, model, timeoutMs });

    // Groq json_object requires the word "JSON" in messages
    let systemPrompt = prompt.systemPrompt;
    if (!systemPrompt.includes("JSON") && !prompt.userPrompt.includes("JSON")) {
      systemPrompt += "\nRespond strictly with a valid JSON object.";
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt.userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        const retryAfter = response.headers.get("retry-after");

        // 401 Unauthorized – invalid API key (non-retryable, no fallback loop)
        if (status === 401) {
          throw this.buildError({
            type: "quota",
            statusCode: 401,
            message: `Groq invalid API key (401): ${errorText}`,
            retryable: false,
          });
        }

        // 429 Rate / Quota limit
        if (status === 429) {
          const retryMsg = retryAfter ? ` (retry-after: ${retryAfter}s)` : "";
          throw this.buildError({
            type: "quota",
            statusCode: 429,
            message: `Groq rate/quota limit reached${retryMsg}: ${errorText}`,
            retryable: false,
          });
        }

        // 400 Bad Request – invalid input / prompt
        if (status === 400) {
          throw this.buildError({
            type: "invalid_input",
            statusCode: 400,
            message: `Groq invalid input (400): ${errorText}`,
            retryable: false,
          });
        }

        // 5xx Server errors – transient
        if (status >= 500) {
          throw this.buildError({
            type: "transient",
            statusCode: status,
            message: `Groq transient server error (${status}): ${errorText}`,
            retryable: true,
          });
        }

        throw this.buildError({
          type: "unknown",
          statusCode: status,
          message: `Groq API error (${status}): ${errorText}`,
          retryable: false,
        });
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content?.trim() || "";

      if (!content) {
        throw this.buildError({
          type: "transient",
          message: "Groq returned empty message content",
          retryable: true,
        });
      }

      // Strip reasoning tags BEFORE JSON.parse to handle models that emit <think>…</think>
      const cleanedContent = stripReasoningTags(content);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleanedContent);
      } catch (parseErr) {
        throw this.buildError({
          type: "schema",
          message: `Groq JSON parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          retryable: true,
        });
      }

      const parseResult = schema.safeParse(parsedJson);
      if (!parseResult.success) {
        throw this.buildError({
          type: "schema",
          message: `Groq schema validation failed: ${JSON.stringify(parseResult.error.format())}`,
          retryable: true,
        });
      }

      return parseResult.data;
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err && typeof err === "object" && "aiDetails" in err) {
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);
      if (controller.signal.aborted || msg.includes("aborted") || msg.includes("timeout")) {
        throw this.buildError({
          type: "transient",
          message: `Groq request timed out after ${timeoutMs}ms`,
          retryable: true,
        });
      }

      throw this.buildError({
        type: "unknown",
        message: `Groq error: ${msg}`,
        retryable: false,
      });
    }
  }

  /**
   * Parse OpenAI-style SSE stream from Groq with abort support.
   */
  async streamCompletion(
    prompt: PromptPayload,
    onChunk: (delta: string) => void,
    opts: GenerationOptions = {}
  ): Promise<string> {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      throw this.buildError({
        type: "quota",
        message: "GROQ_API_KEY is not configured",
        retryable: false,
      });
    }

    const model = process.env["GROQ_MODEL"] || "llama-3.3-70b-versatile";
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? 30_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: prompt.systemPrompt },
            { role: "user", content: prompt.userPrompt },
          ],
          stream: true,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text();
        throw this.buildError({
          type: response.status === 401 ? "quota" : "transient",
          statusCode: response.status,
          message: `Groq streaming error (${response.status}): ${text}`,
          retryable: response.status >= 500,
        });
      }

      if (!response.body) {
        throw this.buildError({
          type: "transient",
          message: "Groq response body is empty",
          retryable: true,
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {
            // Ignore partial SSE parsing errors
          }
        }
      }

      return fullText;
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err && typeof err === "object" && "aiDetails" in err) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw this.buildError({
        type: controller.signal.aborted ? "transient" : "unknown",
        message: `Groq streaming failed: ${msg}`,
        retryable: controller.signal.aborted,
      });
    }
  }
}
