import type { ClientConfig } from "./client-config";
import { loadConfig } from "./client-config";

export function getConfigHeaders(): Record<string, string> {
  const cfg = loadConfig();
  const headers: Record<string, string> = {
    "x-api-key": cfg.apiKey,
    "x-llm-provider": cfg.llmProvider,
    "x-embed-provider": cfg.embedProvider,
  };
  if (cfg.geminiModel) headers["x-gemini-model"] = cfg.geminiModel;
  return headers;
}

export function isConfigured(cfg?: ClientConfig): boolean {
  const c = cfg ?? loadConfig();
  return c.apiKey.length > 0;
}