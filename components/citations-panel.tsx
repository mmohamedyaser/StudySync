"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Citation } from "@/lib/types";

export function CitationsPanel({
  citations,
  onJump,
}: {
  citations: Citation[];
  onJump: (page: number) => void;
}) {
  return (
    <div className="p-3 space-y-2 h-full flex flex-col">
      <h2 className="text-sm font-semibold">Citations</h2>
      {citations.length === 0 && <p className="text-xs text-muted-foreground">No citations yet.</p>}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {citations.map((c, i) => (
            <div key={`${c.docId}-${c.page}-${i}`} className="rounded border p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate" title={c.filename}>
                  [{i + 1}] {c.filename}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onJump(c.page)}>
                  p.{c.page}
                </Button>
              </div>
              <p className="text-muted-foreground line-clamp-4">{c.text}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}