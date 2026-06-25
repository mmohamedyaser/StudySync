import { NextRequest, NextResponse } from "next/server";
import { uploadPdf } from "@/lib/blob";
import { chunkPages, setChunkDocId } from "@/lib/chunker";
import { embedTexts } from "@/lib/embed";
import { addDoc, withLock } from "@/lib/store";
import { readConfig } from "@/lib/server-config";
import pdf from "pdf-parse";
import crypto from "crypto";
import type { EmbedName } from "@/lib/providers";

export const runtime = "nodejs";
const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? "10");

export async function POST(req: NextRequest) {
  const cfg = readConfig(req.headers);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `file too large (max ${MAX_MB}MB)` }, { status: 413 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF only" }, { status: 400 });
  }

  const docId = crypto.randomBytes(8).toString("hex");
  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(0, 120);
  const blobUrl = await uploadPdf(file, `${docId}-${safeName}`);

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await pdf(buf);
  const pages = parsed.text
    .split(/\f/)
    .map((t, i) => ({ page: i + 1, text: t }))
    .filter((p) => p.text.trim());

  const rawChunks = chunkPages(pages, 1000, 200);
  const docChunks = setChunkDocId(rawChunks, docId);

  const embedProvider = cfg.embedProvider as EmbedName;
  const batchSize = 16;
  const embedded: typeof docChunks = [];
  await withLock(docId, async () => {
    for (let i = 0; i < docChunks.length; i += batchSize) {
      const batch = docChunks.slice(i, i + batchSize);
      const vecs = await embedTexts(batch.map((c) => c.text), embedProvider, cfg.apiKey);
      batch.forEach((c, j) => embedded.push({ ...c, embedding: vecs[j] }));
    }
  });

  addDoc({
    doc: {
      id: docId,
      filename: file.name,
      blobUrl,
      pageCount: pages.length || 1,
      uploadedAt: Date.now(),
    },
    chunks: embedded,
  });

  return NextResponse.json({
    id: docId,
    filename: file.name,
    pageCount: pages.length || 1,
  });
}