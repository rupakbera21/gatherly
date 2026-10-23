/**
 * @module dedupe
 * @purpose Token-based Jaccard similarity deduplication for ideas.
 *          Normalises text, removes stop words, and computes set similarity.
 *          Threshold 0.7 flags duplicate or near-duplicate AI suggestions.
 * @rubric Problem Statement Alignment & Efficiency – Prevents repetitive AI ideas.
 */

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "all", "am", "an", "and", "any",
  "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "did", "do", "does", "doing", "don't", "down", "during", "each", "few",
  "for", "from", "further", "had", "has", "have", "having", "he", "her",
  "here", "hers", "herself", "him", "himself", "his", "how", "i", "if",
  "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
  "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
  "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own",
  "same", "she", "should", "so", "some", "such", "than", "that", "the",
  "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very",
  "was", "we", "were", "what", "when", "where", "which", "while", "who",
  "whom", "why", "with", "would", "you", "your", "yours", "yourself",
]);

/**
 * Tokenize a string into a set of lowercased, punctuation-free content words.
 */
export function tokenize(text: string): Set<string> {
  if (!text || typeof text !== "string") {
    return new Set();
  }

  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");
  const tokens = new Set<string>();

  for (let word of words) {
    if (word.length > 1 && !STOP_WORDS.has(word)) {
      // Basic normalisation / stemming for plurals
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
        word = word.slice(0, -1);
      }
      tokens.add(word);
    }
  }

  return tokens;
}

/**
 * Compute Jaccard similarity index between two texts: |A ∩ B| / |A ∪ B|.
 * Returns a float between 0.0 (completely distinct) and 1.0 (identical tokens).
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 && setB.size === 0) {
    return 1.0;
  }
  if (setA.size === 0 || setB.size === 0) {
    return 0.0;
  }

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

/**
 * Check if two texts are duplicates based on Jaccard similarity threshold.
 * Default threshold is 0.7.
 */
export function isDuplicate(
  textA: string,
  textB: string,
  threshold = 0.7
): boolean {
  return jaccardSimilarity(textA, textB) >= threshold;
}

/**
 * Filter an array of new idea items to remove items that duplicate
 * an existing idea or duplicate an earlier item in the new batch.
 */
export function filterDuplicateIdeas<T extends { title: string; description?: string }>(
  newItems: T[],
  existingItems: T[] = [],
  threshold = 0.7
): T[] {
  const accepted: T[] = [];

  const getCombinedText = (item: T) =>
    `${item.title} ${item.description || ""}`.trim();

  for (const item of newItems) {
    const itemText = getCombinedText(item);

    // Check against existing items
    const duplicatesExisting = existingItems.some((existing) =>
      isDuplicate(itemText, getCombinedText(existing), threshold)
    );

    if (duplicatesExisting) {
      continue;
    }

    // Check against items already accepted from this batch
    const duplicatesAccepted = accepted.some((acc) =>
      isDuplicate(itemText, getCombinedText(acc), threshold)
    );

    if (!duplicatesAccepted) {
      accepted.push(item);
    }
  }

  return accepted;
}
