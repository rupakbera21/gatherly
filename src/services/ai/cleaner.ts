/**
 * @module ai/cleaner
 * @purpose Output hygiene filter for model generated text (Section 5.3).
 *          Strips reasoning-model wrappers (<think>…</think> and equivalents)
 *          BEFORE JSON.parse, then strips stray markdown delimiters, heading
 *          marks, horizontal rules, backticks, and bullet glyphs from all
 *          string fields.
 * @rubric Security & Code Quality – Clean plain text rendering; AI hardening.
 */

/**
 * Strip provider-specific reasoning wrapper tags from raw model output.
 * MUST be called before JSON.parse so reasoning tokens do not break parsing.
 *
 * Tags stripped (case-insensitive, multiline-safe):
 *  - <think>…</think>   — Qwen / DeepSeek chain-of-thought
 *  - <reasoning>…</reasoning>
 *  - <reflection>…</reflection>
 *  - <scratchpad>…</scratchpad>
 */
export function stripReasoningTags(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const tags = ["think", "reasoning", "reflection", "scratchpad"];
  let result = raw;
  for (const tag of tags) {
    // Remove everything between opening and closing tag (greedy within the pair, not across pairs)
    result = result.replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
  }
  return result.trim();
}

/**
 * Clean a single string from common LLM formatting artifacts:
 * - Bold / italic marks (**text**, __text__)
 * - Code backticks (`text`)
 * - Heading hashes (# Heading)
 * - Horizontal rules (-- or ---)
 * - Bullet glyphs (•, -, *, etc. at start of lines)
 */
export function cleanModelText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    // Strip bold & italic markers: **text** or __text__ or *text* or _text_
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Strip heading marks at start of lines: #, ##, ###
    .replace(/^#{1,6}\s+/gm, "")
    // Strip horizontal rules: ---, ===, ___
    .replace(/^[-=_]{2,}\s*$/gm, "")
    // Strip bullet points at line starts: •, -, *, ⁃
    .replace(/^[\s]*[•\-*⁃]\s+/gm, "")
    // Normalize excessive whitespace
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Recursively clean all string values in an object, array, or primitive.
 */
export function cleanStructuredStrings<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return cleanModelText(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map(cleanStructuredStrings) as unknown as T;
  }

  if (typeof input === "object") {
    const cleanedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      cleanedObj[key] = cleanStructuredStrings(value);
    }
    return cleanedObj as T;
  }

  return input;
}
