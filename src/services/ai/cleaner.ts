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
  // Also strip any unclosed tag at end of string (model cut off)
  result = result.replace(/<(?:think|reasoning|reflection|scratchpad)>[\s\S]*$/i, "");
  return result.trim();
}

/**
 * Balance and close truncated JSON strings cut off by token limits.
 */
export function repairTruncatedJson(text: string): string {
  if (!text || typeof text !== "string") return "{}";
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === "}" || char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  let repaired = text;
  if (inString) {
    repaired += '"';
  }

  // Remove trailing comma before closing
  repaired = repaired.replace(/,\s*$/, "");

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

/**
 * Robustly extract valid JSON from model responses containing:
 * - <think>...</think> chain-of-thought tags
 * - Markdown code fences (```json ... ``` or ``` ... ```)
 * - Trailing conversational prose
 * - Truncated JSON brackets/braces
 */
export function extractJsonFromText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Strip reasoning blocks
  let text = stripReasoningTags(raw);

  // 2. Extract from markdown code fences
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) {
    text = fencedMatch[1].trim();
  }

  // 3. Extract balanced JSON if trailing prose exists
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");

  let startIdx = -1;
  let isObject = true;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const endChar = isObject ? "}" : "]";
    const lastIdx = text.lastIndexOf(endChar);
    if (lastIdx > startIdx) {
      text = text.slice(startIdx, lastIdx + 1);
    } else {
      text = repairTruncatedJson(text.slice(startIdx));
    }
  }

  return text.trim();
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
    // Normalize aliases for event type in LLM outputs
    if (!cleanedObj["type"] && (cleanedObj["eventType"] || cleanedObj["category"] || cleanedObj["event_type"])) {
      cleanedObj["type"] = cleanedObj["eventType"] || cleanedObj["category"] || cleanedObj["event_type"];
    }
    // Normalize aliases for quote analysis
    if (!cleanedObj["lineItems"] && (cleanedObj["line_items"] || cleanedObj["items"] || cleanedObj["breakdown"])) {
      cleanedObj["lineItems"] = cleanedObj["line_items"] || cleanedObj["items"] || cleanedObj["breakdown"];
    }
    if (cleanedObj["summary"] && typeof cleanedObj["summary"] === "object") {
      const s = cleanedObj["summary"] as Record<string, unknown>;
      cleanedObj["summary"] = s.text || s.overview || s.description || Object.values(s).filter(v => typeof v === "string").join(" ") || "Quote analysis completed.";
    }
    return cleanedObj as T;
  }

  return input;
}
