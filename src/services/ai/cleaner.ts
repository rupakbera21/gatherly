/**
 * @module ai/cleaner
 * @purpose Output hygiene filter for model generated text (Section 5.3).
 *          Strips stray markdown delimiters, heading marks, horizontal rules,
 *          backticks, and bullet glyphs from all string fields.
 * @rubric Security & Code Quality – Clean plain text rendering.
 */

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
