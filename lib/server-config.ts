import type { ClientConfig } from "./client-config";

export type ServerConfig = {
  llmProvider: ClientConfig["llmProvider"];
  embedProvider: ClientConfig["embedProvider"];
  apiKey: string;
};

export function readConfig(headers: Headers): ServerConfig {
  const llmProvider = (headers.get("x-llm-provider") ?? "gemini") as ServerConfig["llmProvider"];
  const embedProvider = (headers.get("x-embed-provider") ?? "gemini") as ServerConfig["embedProvider"];
  const apiKey = headers.get("x-api-key") ?? "";
  return { llmProvider, embedProvider, apiKey };
}

export function getApiKey(cfg: ServerConfig, kind: "gemini" | "ollama"): string {
  if (cfg.apiKey) return cfg.apiKey;
  return kind === "gemini"
    ? process.env.GEMINI_API_KEY ?? ""
    : process.env.OLLAMA_CLOUD_API_KEY ?? "";
}