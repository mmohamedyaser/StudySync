"use client";

export type ClientConfig = {
  llmProvider: "gemini" | "ollama-llama" | "ollama-mistral" | "ollama-qwen";
  apiKey: string;
  geminiModel?: string;
};

const KEY = "studysync.config.v2";

const DEFAULTS: ClientConfig = {
  llmProvider: "gemini",
  apiKey: "",
  geminiModel: "gemini-2.0-flash",
};

export function loadConfig(): ClientConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ClientConfig>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function saveConfig(cfg: ClientConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent("studysync-config-change"));
}

export function clearConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("studysync-config-change"));
}