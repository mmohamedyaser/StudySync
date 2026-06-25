import { NextRequest, NextResponse } from "next/server";
import { listPdfs } from "@/lib/blob";
import { addDoc, isEmpty, getDoc } from "@/lib/store";
import { chunkPages, setChunkDocId } from "@/lib/chunker";
import { embedTexts } from "@/lib/embed";
import { readConfig } from "@/lib/server-config";
import pdf from "pdf-parse";
import type { EmbedName } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const cfg = readConfig(req.headers);
  const embedProvider = cfg.embedProvider as EmbedName;
  const blobs = await listPdfs();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const b of blobs) {
    const id = b.pathname.split("/").pop()?.split("-")[0];
    if (!id) continue;
    if (!isEmpty() && getDoc(id)) continue;
    try {
      const res = await fetch(b.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const parsed = await pdf(buf);
      const pages = parsed.text
        .split(/\f/)
        .map((t, i) => ({ page: i + 1, text: t }))
        .filter((p) => p.text.trim());
      const rawChunks = chunkPages(pages, 1000, 200);
      const docChunks = setChunkDocId(rawChunks, id);
      const vecs = await embedTexts(docChunks.map((c) => c.text), embedProvider, cfg.apiKey);
      const embedded = docChunks.map((c, i) => ({ ...c, embedding: vecs[i] }));
      addDoc({
        doc: {
          id,
          filename: b.filename.split("-").slice(1).join("-") || b.filename,
          blobUrl: b.url,
          pageCount: pages.length || 1,
          uploadedAt: b.uploadedAt.getTime(),
        },
        chunks: embedded,
      });
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: (e as Error).message });
    }
  }

  return NextResponse.json({ reindexed: results });
}