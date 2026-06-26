import { NextResponse } from "next/server";
import { listDocs, getAllChunks } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    docs: listDocs(),
    chunkCount: getAllChunks().length,
  });
}