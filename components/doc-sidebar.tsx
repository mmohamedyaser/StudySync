"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import type { Doc } from "@/lib/types";

export function DocSidebar({
  docs,
  setDocs,
  selectedDocId,
  setSelectedDocId,
}: {
  docs: Doc[];
  setDocs: (updater: (prev: Doc[]) => Doc[]) => void;
  selectedDocId: string | null;
  setSelectedDocId: (id: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error ?? "Upload failed");
        return;
      }
      const doc = (await res.json()) as Doc;
      setDocs((prev) => [...prev, doc]);
      setSelectedDocId(doc.id);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/docs/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocId === id) setSelectedDocId(null);
  }

  return (
    <div className="p-3 space-y-3">
      <div>
        <Input ref={inputRef} type="file" accept="application/pdf" onChange={onUpload} disabled={uploading} />
        {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading + embedding...</p>}
      </div>
      <div className="space-y-1">
        {docs.length === 0 && <p className="text-xs text-muted-foreground">No documents yet.</p>}
        {docs.map((d) => (
          <div
            key={d.id}
            className={`flex items-center justify-between rounded p-2 text-sm cursor-pointer hover:bg-accent ${
              selectedDocId === d.id ? "bg-accent" : ""
            }`}
            onClick={() => setSelectedDocId(d.id)}
          >
            <span className="truncate flex-1" title={d.filename}>{d.filename}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(d.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}