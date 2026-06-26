import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeminiModel = {
  name: string;
  displayName: string;
  description?: string;
  supportedGenerationMethods?: string[];
};

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") ?? "";
  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini API error: ${res.status} ${err}` }, { status: res.status });
    }
    const data = (await res.json()) as { models?: GeminiModel[] };
    const models = (data.models ?? []).map((m) => ({
      name: m.name.replace("models/", ""),
      displayName: m.displayName,
      methods: m.supportedGenerationMethods ?? [],
    }));
    return NextResponse.json({ models });
  } catch (e) {
    return NextResponse.json({ error: `fetch failed: ${(e as Error).message}` }, { status: 500 });
  }
}