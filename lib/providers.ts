import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "ai";

export type ProviderName = "gemini" | "ollama-llama" | "ollama-mistral" | "ollama-qwen";
export type EmbedName = "gemini" | "ollama-nomic" | "ollama-mxbai" | "ollama-bge";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "https://ollama.com";

export function getChatModel(name: ProviderName): LanguageModelV1 {
  switch (name) {
    case "gemini":
      return google("gemini-2.0-flash") as unknown as LanguageModelV1;
    case "ollama-llama": {
      const ollama = createOllama({ baseURL: OLLAMA_BASE });
      return ollama("llama3.1:8b") as unknown as LanguageModelV1;
    }
    case "ollama-mistral": {
      const ollama = createOllama({ baseURL: OLLAMA_BASE });
      return ollama("mistral-small") as unknown as LanguageModelV1;
    }
    case "ollama-qwen": {
      const ollama = createOllama({ baseURL: OLLAMA_BASE });
      return ollama("qwen2.5:7b") as unknown as LanguageModelV1;
    }
  }
}

export function getChatModelName(name: ProviderName): string {
  switch (name) {
    case "gemini":
      return "gemini-2.0-flash";
    case "ollama-llama":
      return "llama3.1:8b";
    case "ollama-mistral":
      return "mistral-small";
    case "ollama-qwen":
      return "qwen2.5:7b";
  }
}