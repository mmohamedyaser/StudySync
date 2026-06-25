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
import { readConfig } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  agent: "retriever" | "mapper" | "quiz" | "explainer";
};

export async function POST(req: NextRequest) {
  const cfg = readConfig(req.headers);
  const body = (await req.json()) as Body;
  const provider = cfg.llmProvider as ProviderName;
  const embedProvider = cfg.embedProvider as EmbedName;

  if (isEmpty()) {
    const blobs = await listPdfs();
    if (blobs.length > 0) {
      await fetch(new URL("/api/reindex", req.url), {
        method: "POST",
        headers: {
          "x-api-key": cfg.apiKey,
          "x-llm-provider": cfg.llmProvider,
          "x-embed-provider": cfg.embedProvider,
        },
      });
    }
  }

  const allTools = {
    retriever: retrieverTool(embedProvider, cfg.apiKey),
    mapper: mapperTool(embedProvider, cfg.apiKey),
    quiz: quizTool(embedProvider, cfg.apiKey),
    explainer: explainerTool(embedProvider, cfg.apiKey),
  };

  const toolsForMode = {
    retriever: { retriever: allTools.retriever },
    mapper: { mapper: allTools.mapper },
    quiz: { quiz: allTools.quiz },
    explainer: { explainer: allTools.explainer },
  } as const;

  const result = await streamText({
    model: getChatModel(provider, cfg.apiKey),
    system: systemPrompt(body.agent),
    messages: body.messages,
    tools: toolsForMode[body.agent],
    toolChoice: "required",
    maxSteps: 4,
  });

  return result.toDataStreamResponse();
}