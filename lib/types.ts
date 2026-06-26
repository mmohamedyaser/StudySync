export type AgentMode = "retriever" | "mapper" | "quiz" | "explainer";

export type Doc = {
  id: string;
  filename: string;
  pageCount: number;
  uploadedAt: number;
};

export type Chunk = {
  docId: string;
  page: number;
  text: string;
  embedding: number[];
};

export type DocState = {
  doc: Doc;
  chunks: Chunk[];
  data: Buffer;
};

export type Citation = {
  docId: string;
  filename: string;
  page: number;
  text: string;
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};