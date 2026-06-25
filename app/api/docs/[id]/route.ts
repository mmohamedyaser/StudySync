import { NextRequest, NextResponse } from "next/server";
import { removeDoc, getDoc } from "@/lib/store";
import { deletePdf } from "@/lib/blob";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const state = getDoc(params.id);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  removeDoc(params.id);
  const pathname = state.doc.blobUrl.split("/").slice(-2).join("/");
  await deletePdf(pathname).catch(() => null);
  return NextResponse.json({ ok: true });
}