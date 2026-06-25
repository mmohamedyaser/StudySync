"use client";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentTabs } from "./agent-tabs";
import type { AgentMode, Citation, Doc } from "@/lib/types";
import { Send } from "lucide-react";
import { getConfigHeaders, isConfigured } from "@/lib/fetch-config";

type ToolInvocationLike = { result?: { citations?: Citation[] } };

export function ChatPanel({
  docs,
  onCitations,
  onJump,
}: {
  docs: Doc[];
  onCitations: (c: Citation[]) => void;
  onJump: (page: number) => void;
}) {
  const [agent, setAgent] = useState<AgentMode>("retriever");
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: "/api/chat",
    body: { agent },
    headers: getConfigHeaders(),
    onFinish: (msg) => {
      const toolInvocations = (msg as unknown as { toolInvocations?: ToolInvocationLike[] })
        .toolInvocations;
      const last = toolInvocations?.find((t) => t.result?.citations)?.result;
      if (last?.citations) {
        onCitations(last.citations);
        if (last.citations[0]) onJump(last.citations[0].page);
      }
    },
  });

  const [configured, setConfigured] = useState(false);
  useEffect(() => {
    const update = () => setConfigured(isConfigured());
    update();
    window.addEventListener("studysync-config-change", update);
    return () => window.removeEventListener("studysync-config-change", update);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2 shrink-0">
        <AgentTabs value={agent} onChange={setAgent} />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {!configured
              ? "Open Settings (gear icon) to add your API key."
              : docs.length === 0
              ? "Upload a PDF to get started."
              : `Ask a question across ${docs.length} document${docs.length > 1 ? "s" : ""}.`}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded p-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"
            }`}
          >
            {m.content}
          </div>
        ))}
        {isLoading && <div className="text-xs text-muted-foreground">Thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-2 flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={configured ? `Ask ${agent}...` : "Add API key in Settings first"}
          disabled={isLoading || docs.length === 0 || !configured}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim() || !configured}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}