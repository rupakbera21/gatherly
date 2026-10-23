/**
 * @module dedupe.test
 * @purpose Unit tests for idea deduplication.
 *          Verifies tokenization, stop word filtering, Jaccard similarity scoring,
 *          and threshold-based batch filtering.
 */

import {
  filterDuplicateIdeas,
  isDuplicate,
  jaccardSimilarity,
  tokenize,
} from "../../domain/dedupe";

describe("Idea Dedupe Engine Tests", () => {
  it("normalises text, lowercases, and filters common stop words", () => {
    const tokens = tokenize("The quick brown fox and a lazy dog!");
    expect(tokens.has("the")).toBe(false); // Stop word
    expect(tokens.has("and")).toBe(false); // Stop word
    expect(tokens.has("a")).toBe(false); // Stop word
    expect(tokens.has("quick")).toBe(true);
    expect(tokens.has("brown")).toBe(true);
    expect(tokens.has("fox")).toBe(true);
    expect(tokens.has("lazy")).toBe(true);
    expect(tokens.has("dog")).toBe(true);
  });

  it("calculates exact Jaccard similarity index", () => {
    // Exactly same tokens
    expect(jaccardSimilarity("Rustic Photo Booth", "photo booth rustic")).toBe(1.0);

    // Completely disjoint
    expect(jaccardSimilarity("Live Jazz Band", "Custom Cake Bakery")).toBe(0.0);

    // Partial overlap:
    // A: {acoustic, guitarist, ceremony} (size 3)
    // B: {acoustic, guitarist, cocktail, hour} (size 4)
    // Intersection: {acoustic, guitarist} (size 2)
    // Union: {acoustic, guitarist, ceremony, cocktail, hour} (size 5)
    // Jaccard: 2 / 5 = 0.4
    const sim = jaccardSimilarity(
      "Acoustic guitarist for ceremony",
      "Acoustic guitarist for cocktail hour"
    );
    expect(sim).toBeCloseTo(0.4, 2);
  });

  it("evaluates duplicate status with threshold 0.7", () => {
    // Very similar phrasing
    const textA = "Vintage Polaroid photo guestbook station";
    const textB = "Polaroid guestbook photo station vintage";
    expect(isDuplicate(textA, textB, 0.7)).toBe(true);

    // Different ideas sharing common words
    const textC = "Vintage car rental for couple arrival";
    expect(isDuplicate(textA, textC, 0.7)).toBe(false);
  });

  it("filters duplicates against existing ideas and within batch", () => {
    const existing = [
      { id: "1", title: "Retro Polaroid photo booth station", description: "Guests take polaroid photos" },
    ];

    const newIdeas = [
      // Duplicate of existing item (similarity > 0.7)
      { id: "2", title: "Polaroid photo booth retro station", description: "Take polaroids" },
      // First unique idea
      { id: "3", title: "Signature cocktail bar", description: "Two custom craft cocktails named after couple" },
      // Duplicate of item 3 in same batch
      { id: "4", title: "Signature craft cocktail bar", description: "Custom cocktails named after couple" },
      // Second unique idea
      { id: "5", title: "Silent disco after-party", description: "Wireless multi-channel headphones" },
    ];

    const filtered = filterDuplicateIdeas(newIdeas, existing, 0.7);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((f) => f.id)).toEqual(["3", "5"]);
  });
});
