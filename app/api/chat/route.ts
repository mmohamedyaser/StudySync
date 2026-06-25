import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getChatModel, type ProviderName, type EmbedName } from "@/lib/providers";
import { retrieverTool } from "@/lib/tools/retriever";
import { mapperTool } from "@/lib/tools/mapper";
import { quizTool } from "@/lib/tools/quiz";
import { explainerTool } from "@/lib/tools/explainer";
import { systemPrompt } from "@/lib/prompts";
import { isEmpty } from "@/lib/store";
import { listPdfs } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  agent: "retriever" | "mapper" | "quiz" | "explainer";
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const provider = (process.env.LLM_PROVIDER ?? "gemini") as ProviderName;
  const embedProvider = (process.env.EMBED_PROVIDER ?? "gemini") as EmbedName;

  if (isEmpty()) {
    const blobs = await listPdfs();
    if (blobs.length > 0) {
      await fetch(new URL("/api/reindex", req.url), { method: "POST" });
    }
  }

  const allTools = {
    retriever: retrieverTool(embedProvider),
    mapper: mapperTool(embedProvider),
    quiz: quizTool(embedProvider),
    explainer: explainerTool(embedProvider),
  };

  const toolsForMode = {
    retriever: { retriever: allTools.retriever },
    mapper: { mapper: allTools.mapper },
    quiz: { quiz: allTools.quiz },
    explainer: { explainer: allTools.explainer },
  } as const;

  const result = await streamText({
    model: getChatModel(provider),
    system: systemPrompt(body.agent),
    messages: body.messages,
    tools: toolsForMode[body.agent],
    toolChoice: "required",
    maxSteps: 4,
  });

  return result.toDataStreamResponse();
}