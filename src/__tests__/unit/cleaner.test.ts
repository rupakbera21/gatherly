/**
 * @module cleaner.test
 * @purpose Unit tests for cleanModelText, stripReasoningTags, and cleanStructuredStrings.
 *          Includes: think-tag stripping before JSON parse, all reasoning wrappers,
 *          nested content, markdown stripping, recursive object cleaning.
 */

import {
  cleanModelText,
  cleanStructuredStrings,
  extractJsonFromText,
  repairTruncatedJson,
  stripReasoningTags,
} from "@/services/ai/cleaner";

describe("stripReasoningTags", () => {
  it("strips <think>…</think> blocks from Qwen/DeepSeek output", () => {
    const input = '<think>I need to think about this budget first.</think>{"budget": 5000}';
    const result = stripReasoningTags(input);
    expect(result).toBe('{"budget": 5000}');
    // Must be parseable after stripping
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result) as { budget: number };
    expect(parsed.budget).toBe(5000);
  });

  it("strips <reasoning>…</reasoning> wrappers", () => {
    const input = '<reasoning>Let me reason through this step by step…</reasoning>{"answer": 42}';
    const result = stripReasoningTags(input);
    expect(result).toBe('{"answer": 42}');
  });

  it("strips <reflection>…</reflection> wrappers", () => {
    const input = '<reflection>On second thought…</reflection>{"value": "ok"}';
    const result = stripReasoningTags(input);
    expect(result).toBe('{"value": "ok"}');
  });

  it("strips <scratchpad>…</scratchpad> wrappers", () => {
    const input = "<scratchpad>Working out numbers…\n2+2=4</scratchpad>\n{\"total\": 4}";
    const result = stripReasoningTags(input);
    expect(result).toContain('{"total": 4}');
  });

  it("handles multiline think blocks spanning many lines", () => {
    const input = `<think>
Line 1 of thinking
Line 2 of thinking
Line 3 of thinking
</think>
{"result": "clean"}`;
    const result = stripReasoningTags(input);
    expect(result).toBe('{"result": "clean"}');
  });

  it("returns empty string when input is only a think block", () => {
    const input = "<think>Just reasoning, no JSON here.</think>";
    const result = stripReasoningTags(input);
    expect(result).toBe("");
  });

  it("handles case-insensitive tag names", () => {
    const input = '<THINK>uppercase think block</THINK>{"data": true}';
    const result = stripReasoningTags(input);
    expect(result).toBe('{"data": true}');
  });

  it("leaves normal JSON untouched when no reasoning tags present", () => {
    const input = '{"categories": [{"id": "venue", "weight": 30}]}';
    const result = stripReasoningTags(input);
    expect(result).toBe(input);
  });

  it("returns empty string for empty / non-string input", () => {
    expect(stripReasoningTags("")).toBe("");
    expect(stripReasoningTags(null as unknown as string)).toBe("");
  });
});

describe("cleanModelText", () => {
  it("strips bold markdown markers", () => {
    expect(cleanModelText("**Hello** world")).toBe("Hello world");
    expect(cleanModelText("__Hello__ world")).toBe("Hello world");
  });

  it("strips code backticks", () => {
    expect(cleanModelText("`inline code`")).toBe("inline code");
  });

  it("strips heading hashes at start of lines", () => {
    expect(cleanModelText("# Heading One\n## Sub")).toBe("Heading One\nSub");
  });

  it("strips horizontal rules", () => {
    expect(cleanModelText("---")).toBe("");
    expect(cleanModelText("===")).toBe("");
  });

  it("strips bullet points at start of lines", () => {
    expect(cleanModelText("• Item one")).toBe("Item one");
    expect(cleanModelText("- Item two")).toBe("Item two");
    expect(cleanModelText("* Item three")).toBe("Item three");
  });

  it("normalizes excessive whitespace", () => {
    expect(cleanModelText("too   many   spaces")).toBe("too many spaces");
  });

  it("returns empty string for empty / non-string input", () => {
    expect(cleanModelText("")).toBe("");
    expect(cleanModelText(null as unknown as string)).toBe("");
  });
});

describe("cleanStructuredStrings", () => {
  it("cleans all string values in a nested object", () => {
    const input = {
      title: "**Bold Title**",
      nested: {
        note: "# Heading note",
      },
    };
    const result = cleanStructuredStrings(input);
    expect(result.title).toBe("Bold Title");
    expect(result.nested.note).toBe("Heading note");
  });

  it("cleans strings in arrays", () => {
    const input = ["**first**", "second", "# third"];
    const result = cleanStructuredStrings(input);
    expect(result).toEqual(["first", "second", "third"]);
  });

  it("returns primitive non-string values unchanged", () => {
    expect(cleanStructuredStrings(42)).toBe(42);
    expect(cleanStructuredStrings(true)).toBe(true);
    expect(cleanStructuredStrings(null)).toBe(null);
    expect(cleanStructuredStrings(undefined)).toBe(undefined);
  });

  it("normalizes alias keys in object inputs (event_type to type, line_items to lineItems)", () => {
    const input = {
      event_type: "wedding",
      line_items: [{ description: "Food", cost: 100 }],
      summary: { text: "Analyzed budget successfully" },
    };
    const result = cleanStructuredStrings(input) as Record<string, unknown>;
    expect(result["type"]).toBe("wedding");
    expect(result["lineItems"]).toBeDefined();
    expect(result["summary"]).toBe("Analyzed budget successfully");
  });
});

describe("extractJsonFromText and repairTruncatedJson", () => {
  it("extracts clean JSON from markdown code fences", () => {
    const input = '```json\n{"status": "ok", "count": 10}\n```';
    const result = extractJsonFromText(input);
    expect(result).toBe('{"status": "ok", "count": 10}');
    expect(JSON.parse(result)).toEqual({ status: "ok", count: 10 });
  });

  it("extracts JSON while removing <think> tags and trailing conversational prose", () => {
    const input = '<think>Let me formulate the response</think>Here is the plan:\n{"budget": 5000}\nHope this helps you plan your event!';
    const result = extractJsonFromText(input);
    expect(result).toBe('{"budget": 5000}');
    expect(JSON.parse(result)).toEqual({ budget: 5000 });
  });

  it("repairs truncated JSON cut off at bracket/brace level", () => {
    const truncated = '{"title": "Gala", "milestones": [{"name": "Book hall"';
    const repaired = repairTruncatedJson(truncated);
    expect(() => JSON.parse(repaired)).not.toThrow();
    const parsed = JSON.parse(repaired);
    expect(parsed.title).toBe("Gala");
    expect(parsed.milestones[0].name).toBe("Book hall");
  });

  it("repairs truncated string and closes outer object", () => {
    const truncated = '{"notes": "Pending venue confirmation';
    const repaired = repairTruncatedJson(truncated);
    expect(() => JSON.parse(repaired)).not.toThrow();
    const parsed = JSON.parse(repaired);
    expect(parsed.notes).toBe("Pending venue confirmation");
  });

  it("handles unclosed <think> tag gracefully", () => {
    const input = '<think>Model ran out of tokens before finishing think\n{"data": 123}';
    const result = stripReasoningTags(input);
    expect(result).toBe("");
  });
});
