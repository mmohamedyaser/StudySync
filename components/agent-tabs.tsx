"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentMode } from "@/lib/types";

const AGENTS: { value: AgentMode; label: string }[] = [
  { value: "retriever", label: "Retriever" },
  { value: "mapper", label: "Mapper" },
  { value: "quiz", label: "Quiz" },
  { value: "explainer", label: "Explainer" },
];

export function AgentTabs({
  value,
  onChange,
}: {
  value: AgentMode;
  onChange: (v: AgentMode) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as AgentMode)}>
      <TabsList className="grid grid-cols-4 w-full">
        {AGENTS.map((a) => (
          <TabsTrigger key={a.value} value={a.value}>
            {a.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}