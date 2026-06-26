"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, RefreshCw } from "lucide-react";
import { loadConfig, saveConfig, clearConfig, type ClientConfig } from "@/lib/client-config";

type GeminiModel = { name: string; displayName: string; methods: string[] };

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<ClientConfig>({ llmProvider: "gemini", embedProvider: "gemini", apiKey: "", geminiModel: "gemini-2.0-flash" });
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [pulling, setPulling] = useState(false);
  const [pullErr, setPullErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCfg(loadConfig());
      setSaved(false);
      setPullErr(null);
    }
  }, [open]);

  async function pullModels() {
    setPulling(true);
    setPullErr(null);
    try {
      const res = await fetch("/api/models", { headers: { "x-api-key": cfg.apiKey } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPullErr((err as { error?: string }).error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { models: GeminiModel[] };
      const chatModels = data.models.filter((m) => m.methods.includes("generateContent"));
      setModels(chatModels);
    } catch (e) {
      setPullErr((e as Error).message);
    } finally {
      setPulling(false);
    }
  }

  function onSave() {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setOpen(false), 400);
  }

  function onClear() {
    clearConfig();
    setCfg({ llmProvider: "gemini", embedProvider: "gemini", apiKey: "", geminiModel: "gemini-2.0-flash" });
    setModels([]);
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
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
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
          <label className="text-sm font-medium">API Key</label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Gemini API key"
              value={cfg.apiKey}
              onChange={(e) => setCfg((prev) => ({ ...prev, apiKey: e.target.value }))}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={pullModels}
              disabled={!cfg.apiKey.trim() || pulling}
              aria-label="Pull models"
              title="Pull available Gemini models"
            >
              <RefreshCw className={`h-4 w-4 ${pulling ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {pullErr && <p className="text-xs text-destructive">{pullErr}</p>}
        </div>

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
            <option value="gemini">Gemini</option>
            <option value="ollama-llama">Ollama Cloud — Llama 3.1 8B</option>
            <option value="ollama-mistral">Ollama Cloud — Mistral Small</option>
            <option value="ollama-qwen">Ollama Cloud — Qwen 2.5 7B</option>
          </select>
        </div>

        {cfg.llmProvider === "gemini" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Gemini Model {models.length > 0 && `(${models.length} available)`}
            </label>
            {models.length > 0 ? (
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={cfg.geminiModel ?? models[0]?.name ?? "gemini-2.0-flash"}
                onChange={(e) => setCfg((prev) => ({ ...prev, geminiModel: e.target.value }))}
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName} ({m.name})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="text"
                placeholder="gemini-2.0-flash"
                value={cfg.geminiModel ?? ""}
                onChange={(e) => setCfg((prev) => ({ ...prev, geminiModel: e.target.value }))}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Enter key above, click refresh icon to pull available models.
            </p>
          </div>
        )}

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