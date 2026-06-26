import type { ClientConfig } from "./client-config";

export type ServerConfig = {
  llmProvider: ClientConfig["llmProvider"];
  apiKey: string;
  geminiModel?: string;
};

export function readConfig(headers: Headers): ServerConfig {
  const llmProvider = (headers.get("x-llm-provider") ?? "gemini") as ServerConfig["llmProvider"];
  const apiKey = headers.get("x-api-key") ?? "";
  const geminiModel = headers.get("x-gemini-model") ?? undefined;
  return { llmProvider, apiKey, geminiModel };
}