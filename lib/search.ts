// ponytail: keyword overlap search. No embeddings = no API cost.
// Upgrade to embeddings or BM25 if recall on long docs is poor.

import { getAllChunks } from "./store";
import type { Citation } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "at", "by", "for", "with", "from", "as", "into", "that",
  "this", "these", "those", "it", "its", "they", "them", "their", "we", "you", "i",
  "what", "how", "why", "when", "where", "who", "which", "do", "does", "did", "can",
  "could", "should", "would", "will", "may", "might", "must", "shall", "about",
  "explain", "describe", "define", "give", "show", "tell", "use", "using",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function keywordSearch(query: string, k: number): Citation[] {
  const chunks = getAllChunks();
  if (chunks.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, k).map(toCitation);

  const scored = chunks.map((c) => {
    const chunkTokens = tokenize(c.text);
    const chunkSet = new Set(chunkTokens);
    let score = 0;
    for (const qt of queryTokens) {
      if (chunkSet.has(qt)) score += 1;
    }
    // normalize by chunk length to avoid bias toward long chunks
    return { chunk: c, score: score / Math.log(chunkTokens.length + 2) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => toCitation(s.chunk));
}

function toCitation(c: { docId: string; filename: string; page: number; text: string }): Citation {
  return { docId: c.docId, filename: c.filename, page: c.page, text: c.text };
}