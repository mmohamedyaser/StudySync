"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X } from "lucide-react";
import { loadConfig, saveConfig, clearConfig, type ClientConfig } from "@/lib/client-config";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<ClientConfig>({ llmProvider: "gemini", embedProvider: "gemini", apiKey: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setCfg(loadConfig());
      setSaved(false);
    }
  }, [open]);

  function onSave() {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setOpen(false), 400);
  }

  function onClear() {
    clearConfig();
    setCfg({ llmProvider: "gemini", embedProvider: "gemini", apiKey: "" });
    setSaved(true);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Settings">
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Keys stored in your browser only. Never sent to a database.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">LLM Provider</label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={cfg.llmProvider}
            onChange={(e) => {
              const llm = e.target.value as ClientConfig["llmProvider"];
              setCfg((prev) => ({ ...prev, llmProvider: llm }));
            }}
          >
            <option value="gemini">Gemini 2.0 Flash</option>
            <option value="ollama-llama">Ollama Cloud — Llama 3.1 8B</option>
            <option value="ollama-mistral">Ollama Cloud — Mistral Small</option>
            <option value="ollama-qwen">Ollama Cloud — Qwen 2.5 7B</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Embeddings Provider</label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={cfg.embedProvider}
            onChange={(e) => {
              const embed = e.target.value as ClientConfig["embedProvider"];
              setCfg((prev) => ({ ...prev, embedProvider: embed }));
            }}
          >
            <option value="gemini">Gemini text-embedding-004</option>
            <option value="ollama-nomic">Ollama nomic-embed-text</option>
            <option value="ollama-mxbai">Ollama mxbai-embed-large</option>
            <option value="ollama-bge">Ollama bge-m3</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            API Key {cfg.llmProvider.startsWith("ollama") || cfg.embedProvider.startsWith("ollama") ? "(Ollama)" : "(Gemini)"}
          </label>
          <Input
            type="password"
            placeholder={cfg.llmProvider.startsWith("ollama") ? "Ollama Cloud API key" : "Gemini API key"}
            value={cfg.apiKey}
            onChange={(e) => setCfg((prev) => ({ ...prev, apiKey: e.target.value }))}
          />
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onClear}>Clear</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSave} disabled={!cfg.apiKey.trim()}>
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}