"use client";
import { useState, useEffect } from "react";
import { DocSidebar } from "@/components/doc-sidebar";
import { PdfViewer } from "@/components/pdf-viewer";
import { ChatPanel } from "@/components/chat-panel";
import { CitationsPanel } from "@/components/citations-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings-dialog";
import { getConfigHeaders } from "@/lib/fetch-config";
import type { Citation, Doc } from "@/lib/types";

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [jumpPage, setJumpPage] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/docs", { headers: getConfigHeaders() })
      .then((r) => r.json())
      .then((data: { indexed: Doc[] }) => {
        if (Array.isArray(data.indexed)) setDocs(data.indexed);
      })
      .catch(() => null);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <h1 className="text-lg font-semibold">StudySync</h1>
        <div className="flex items-center gap-1">
          <SettingsDialog />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r overflow-y-auto shrink-0">
          <DocSidebar
            docs={docs}
            setDocs={setDocs}
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
          />
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-h-0">
            <PdfViewer docId={selectedDocId} docs={docs} jumpPage={jumpPage} />
          </div>
          <div className="h-96 border-t overflow-hidden shrink-0">
            <ChatPanel docs={docs} onCitations={setCitations} onJump={setJumpPage} />
          </div>
        </main>
        <aside className="w-80 border-l overflow-y-auto shrink-0 hidden md:block">
          <CitationsPanel citations={citations} onJump={setJumpPage} />
        </aside>
      </div>
    </div>
  );
}