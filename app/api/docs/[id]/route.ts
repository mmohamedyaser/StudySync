import { NextRequest, NextResponse } from "next/server";
import { removeDoc, getDoc } from "@/lib/store";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!getDoc(params.id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  removeDoc(params.id);
  return NextResponse.json({ ok: true });
}