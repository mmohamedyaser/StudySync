import { NextRequest, NextResponse } from "next/server";
import { getDoc } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const state = getDoc(params.id);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(state.data, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${state.doc.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}