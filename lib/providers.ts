import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "ai";

export type ProviderName = "gemini" | "ollama-llama" | "ollama-mistral" | "ollama-qwen";
export type EmbedName = "gemini" | "ollama-nomic" | "ollama-mxbai" | "ollama-bge";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "https://ollama.com";

export function getChatModel(name: ProviderName, apiKey: string, geminiModel?: string): LanguageModelV1 {
  switch (name) {
    case "gemini": {
      const key = apiKey || process.env.GEMINI_API_KEY || "";
      if (!key) throw new Error("Gemini API key missing — set in Settings");
      process.env.GEMINI_API_KEY = key;
      const modelName = geminiModel || "gemini-2.0-flash";
      return google(modelName) as unknown as LanguageModelV1;
    }
    case "ollama-llama": {
      const key = apiKey || process.env.OLLAMA_CLOUD_API_KEY || "";
      if (!key) throw new Error("Ollama API key missing — set in Settings");
      const ollama = createOllama({ baseURL: OLLAMA_BASE, headers: { Authorization: `Bearer ${key}` } });
      return ollama("llama3.1:8b") as unknown as LanguageModelV1;
    }
    case "ollama-mistral": {
      const key = apiKey || process.env.OLLAMA_CLOUD_API_KEY || "";
      if (!key) throw new Error("Ollama API key missing — set in Settings");
      const ollama = createOllama({ baseURL: OLLAMA_BASE, headers: { Authorization: `Bearer ${key}` } });
      return ollama("mistral-small") as unknown as LanguageModelV1;
    }
    case "ollama-qwen": {
      const key = apiKey || process.env.OLLAMA_CLOUD_API_KEY || "";
      if (!key) throw new Error("Ollama API key missing — set in Settings");
      const ollama = createOllama({ baseURL: OLLAMA_BASE, headers: { Authorization: `Bearer ${key}` } });
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