"use client";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { Doc } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export function PdfViewer({
  docId,
  docs,
  jumpPage,
}: {
  docId: string | null;
  docs: Doc[];
  jumpPage: number | null;
}) {
  const doc = docs.find((d) => d.id === docId);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (jumpPage) setPage(jumpPage);
  }, [jumpPage]);

  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a document to view
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 bg-muted/20">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium truncate">{doc.filename}</span>
        <span>
          Page {page} / {numPages || "?"}
        </span>
      </div>
      <Document
        file={`/api/docs/${doc.id}/raw`}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p className="text-sm">Loading PDF...</p>}
        error={<p className="text-sm text-destructive">Failed to load PDF</p>}
        className="flex justify-center"
      >
        <Page pageNumber={page} width={800} renderTextLayer renderAnnotationLayer={false} />
      </Document>
      <div className="mt-2 flex gap-2 justify-center">
        <button
          className="text-xs px-2 py-1 border rounded disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <button
          className="text-xs px-2 py-1 border rounded disabled:opacity-50"
          disabled={page >= numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}