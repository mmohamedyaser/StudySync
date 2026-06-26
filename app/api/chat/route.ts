import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getChatModel, type ProviderName } from "@/lib/providers";
import { retrieverTool } from "@/lib/tools/retriever";
import { mapperTool } from "@/lib/tools/mapper";
import { quizTool } from "@/lib/tools/quiz";
import { explainerTool } from "@/lib/tools/explainer";
import { systemPrompt } from "@/lib/prompts";
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

  const allTools = {
    retriever: retrieverTool(),
    mapper: mapperTool(),
    quiz: quizTool(),
    explainer: explainerTool(),
  };

  const toolsForMode = {
    retriever: { retriever: allTools.retriever },
    mapper: { mapper: allTools.mapper },
    quiz: { quiz: allTools.quiz },
    explainer: { explainer: allTools.explainer },
  } as const;

  const result = await streamText({
    model: getChatModel(provider, cfg.apiKey, cfg.geminiModel),
    system: systemPrompt(body.agent),
    messages: body.messages,
    tools: toolsForMode[body.agent],
    toolChoice: "required",
    maxSteps: 4,
  });

  return result.toDataStreamResponse();
}