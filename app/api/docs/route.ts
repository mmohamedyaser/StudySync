import { NextResponse } from "next/server";
import { listDocs, getAllChunks } from "@/lib/store";
import { listPdfs } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const indexed = listDocs();
  const blobs = await listPdfs();
  return NextResponse.json({
    indexed,
    blobs,
    indexedChunkCount: getAllChunks().length,
  });
}