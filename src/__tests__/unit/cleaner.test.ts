/**
 * @module cleaner.test
 * @purpose Unit tests for cleanModelText, stripReasoningTags, and cleanStructuredStrings.
 *          Includes: think-tag stripping before JSON parse, all reasoning wrappers,
 *          nested content, markdown stripping, recursive object cleaning.
 */

import {
  cleanModelText,
  cleanStructuredStrings,
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
});
