import type { Chunk } from "./types";

export type PageText = { page: number; text: string };

export function chunkPages(pages: PageText[], chunkSize = 1000, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  for (const { page, text } of pages) {
    if (!text.trim()) continue;
    if (text.length <= chunkSize) {
      chunks.push({ docId: "", page, text: text.trim(), embedding: [] });
      continue;
    }
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end).trim();
      if (slice) chunks.push({ docId: "", page, text: slice, embedding: [] });
      if (end === text.length) break;
      start = end - overlap;
    }
  }
  return chunks;
}

export function setChunkDocId(chunks: Chunk[], docId: string): Chunk[] {
  return chunks.map((c) => ({ ...c, docId }));
}