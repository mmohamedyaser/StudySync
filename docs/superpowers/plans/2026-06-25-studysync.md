# StudySync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build StudySync — a Vercel-deployed Next.js app where students upload PDFs and ask agentic questions across them via 4 tools (Subject Retriever, Concept Mapper, Quiz Generator, Explainer).

**Architecture:** Next.js 14 App Router (TS) with Vercel AI SDK `streamText` + tools. Vercel Blob stores PDFs. In-memory `Map` stores chunks + embeddings, rebuilt on cold start. shadcn/ui 3-pane UI.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui, @ai-sdk/react, @ai-sdk/google, ollama-ai-provider, @vercel/blob, pdf-parse, react-pdf, vitest.

**Spec:** `docs/superpowers/specs/2026-06-25-studysync-design.md`

---

## File Structure

```
StudySync/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          POST multipart → Blob + embed
│   │   ├── docs/route.ts            GET list docs
│   │   ├── docs/[id]/route.ts       DELETE single doc
│   │   ├── chat/route.ts            POST streamText
│   │   └── reindex/route.ts         POST trigger cold-start re-embed
│   ├── layout.tsx                   Root + theme provider
│   ├── page.tsx                     3-pane shell
│   └── globals.css                  Tailwind + shadcn vars
├── components/
│   ├── ui/                          shadcn primitives (button, card, tabs, input, scroll-area, separator, tooltip, toast)
│   ├── doc-sidebar.tsx              Upload zone + doc list + delete
│   ├── pdf-viewer.tsx               react-pdf render
│   ├── chat-panel.tsx               useChat + agent tabs
│   ├── citations-panel.tsx          Sources list
│   ├── agent-tabs.tsx               4-mode selector
│   ├── theme-toggle.tsx             Dark/light
│   └── theme-provider.tsx           next-themes wrapper
├── lib/
│   ├── types.ts                     Doc, Chunk, Citation, AgentMode
│   ├── store.ts                     Module-level Map<docId, DocState>
│   ├── chunker.ts                   Page-aware PDF chunker
│   ├── embed.ts                     Provider dispatch
│   ├── providers.ts                 Gemini + Ollama Cloud adapters
│   ├── blob.ts                      Vercel Blob wrapper
│   ├── prompts.ts                   System prompts per agent
│   ├── cosine.ts                    Vector similarity
│   └── tools/
│       ├── retriever.ts             Tool: vector search
│       ├── mapper.ts                Tool: concept graph
│       ├── quiz.ts                  Tool: MCQ + short-answer
│       └── explainer.ts             Tool: student explanation
├── __tests__/
│   ├── chunker.test.ts
│   ├── cosine.test.ts
│   └── retriever.test.ts
├── docs/superpowers/{specs,plans}/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── vitest.config.ts
├── components.json                  shadcn config
├── .env.local.example
├── .gitignore
└── README.md
```

Decomposition rationale: each tool in own file (single responsibility, testable independently). `lib/` holds pure logic; `app/api/` holds thin HTTP wrappers; `components/` holds UI. Providers isolated for swapping.

---

## Task 1: Project scaffold + deps

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `.gitignore`, `.env.local.example`

- [ ] **Step 1: Init package.json**

Write `package.json`:
```json
{
  "name": "studysync",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install runtime deps**

Run: `npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer @ai-sdk/react @ai-sdk/google @ai-sdk/openai ollama-ai-provider ai @vercel/blob pdf-parse react-pdf clsx tailwind-merge class-variance-authority lucide-react next-themes`
Expected: deps installed, `package-lock.json` created.

- [ ] **Step 3: Install dev deps**

Run: `npm install -D vitest @vitest/ui jsdom @testing-library/react`
Expected: vitest installed.

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Write next.config.js**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["pdf-parse"] },
};
```

- [ ] **Step 6: Write tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 7: Write postcss.config.js**

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 8: Install tailwindcss-animate**

Run: `npm install tailwindcss-animate`

- [ ] **Step 9: Write components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "tailwind.config.ts", "css": "app/globals.css", "baseColor": "slate", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils" }
}
```

- [ ] **Step 10: Write .gitignore**

```
node_modules
.next
.env*.local
*.tsbuildinfo
next-env.d.ts
.vercel
coverage
```

- [ ] **Step 11: Write .env.local.example**

```
BLOB_READ_WRITE_TOKEN=
GEMINI_API_KEY=
OLLAMA_CLOUD_API_KEY=
LLM_PROVIDER=gemini
EMBED_PROVIDER=gemini
```

- [ ] **Step 12: Write vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["__tests__/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 13: Verify install**

Run: `npm ls next`
Expected: prints next@14.x.x without errors.

- [ ] **Step 14: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project"
```

---

## Task 2: Shared types + utils

**Files:**
- Create: `lib/types.ts`, `lib/utils.ts`

- [ ] **Step 1: Write lib/types.ts**

```ts
export type AgentMode = "retriever" | "mapper" | "quiz" | "explainer";

export type Doc = {
  id: string;
  filename: string;
  blobUrl: string;
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
```

- [ ] **Step 2: Write lib/utils.ts (cn helper)**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/utils.ts
git commit -m "feat: shared types and utils"
```

---

## Task 3: Cosine similarity (TDD)

**Files:**
- Create: `lib/cosine.ts`, `__tests__/cosine.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/cosine.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "@/lib/cosine";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("handles zero vector", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- cosine`
Expected: FAIL "cosineSimilarity not exported".

- [ ] **Step 3: Write impl**

`lib/cosine.ts`:
```ts
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("length mismatch");
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function topKSimilar<T extends { embedding: number[] }>(
  query: number[],
  items: T[],
  k: number
): T[] {
  return items
    .map((item) => ({ item, score: cosineSimilarity(query, item.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.item);
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- cosine`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/cosine.ts __tests__/cosine.test.ts
git commit -m "feat: cosine similarity + topK"
```

---

## Task 4: PDF chunker (TDD)

**Files:**
- Create: `lib/chunker.ts`, `__tests__/chunker.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/chunker.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { chunkPages } from "@/lib/chunker";

describe("chunkPages", () => {
  it("returns one chunk for short page", () => {
    const pages = [{ page: 1, text: "short text" }];
    const chunks = chunkPages(pages, 100, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("short text");
    expect(chunks[0].page).toBe(1);
  });

  it("splits long page into multiple chunks preserving page number", () => {
    const longText = "a".repeat(250);
    const chunks = chunkPages([{ page: 5, text: longText }], 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.page).toBe(5));
  });

  it("respects overlap", () => {
    const longText = "abcdefghij".repeat(20);
    const chunks = chunkPages([{ page: 1, text: longText }], 50, 10);
    expect(chunks.length).toBeGreaterThan(1);
    const overlap = chunks[0].text.slice(-10);
    expect(chunks[1].text.startsWith(overlap)).toBe(true);
  });

  it("preserves page boundaries", () => {
    const chunks = chunkPages(
      [
        { page: 1, text: "page1 content" },
        { page: 2, text: "page2 content" },
      ],
      1000,
      0
    );
    const pages = chunks.map((c) => c.page);
    expect(pages).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- chunker`
Expected: FAIL "chunkPages not exported".

- [ ] **Step 3: Write impl**

`lib/chunker.ts`:
```ts
import type { Chunk } from "./types";

export type PageText = { page: number; text: string };

export function chunkPages(pages: PageText[], chunkSize = 1000, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  for (const { page, text } of pages) {
    if (!text.trim()) continue;
    if (text.length <= chunkSize) {
      chunks.push({ docId: "", page, text: text.trim(), embedding: [] });
      continue;
    }
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end).trim();
      if (slice) chunks.push({ docId: "", page, text: slice, embedding: [] });
      if (end === text.length) break;
      start = end - overlap;
    }
  }
  return chunks;
}

export function setChunkDocId(chunks: Chunk[], docId: string): Chunk[] {
  return chunks.map((c) => ({ ...c, docId }));
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- chunker`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/chunker.ts __tests__/chunker.test.ts
git commit -m "feat: page-aware PDF chunker"
```

---

## Task 5: In-memory store

**Files:**
- Create: `lib/store.ts`

- [ ] **Step 1: Write impl**

`lib/store.ts`:
```ts
import type { DocState, Chunk, Doc } from "./types";

// ponytail: module-level Map, lost on cold start. Global mutex via Promise chain
// because /api/* are stateless functions and Node's event loop is single-threaded;
// a single Promise chain is enough until throughput proves otherwise.

type Store = {
  docs: Map<string, DocState>;
  locks: Map<string, Promise<unknown>>;
  globalLock: Promise<unknown>;
};

declare global {
  // eslint-disable-next-line no-var
  var __studysyncStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__studysyncStore) {
    globalThis.__studysyncStore = {
      docs: new Map(),
      locks: new Map(),
      globalLock: Promise.resolve(),
    };
  }
  return globalThis.__studysyncStore;
}

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const store = getStore();
  const prev = store.locks.get(key) ?? Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>((res) => (release = res));
  store.locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function addDoc(state: DocState): void {
  getStore().docs.set(state.doc.id, state);
}

export function removeDoc(id: string): void {
  getStore().docs.delete(id);
}

export function getDoc(id: string): DocState | undefined {
  return getStore().docs.get(id);
}

export function listDocs(): Doc[] {
  return Array.from(getStore().docs.values()).map((s) => s.doc);
}

export function getAllChunks(): Array<Chunk & { filename: string }> {
  const out: Array<Chunk & { filename: string }> = [];
  for (const state of getStore().docs.values()) {
    for (const chunk of state.chunks) {
      out.push({ ...chunk, filename: state.doc.filename });
    }
  }
  return out;
}

export function isEmpty(): boolean {
  return getStore().docs.size === 0;
}

export function size(): number {
  return getStore().docs.size;
}
```

- [ ] **Step 2: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/store.ts
git commit -m "feat: in-memory doc store with per-doc locks"
```

---

## Task 6: Vercel Blob wrapper

**Files:**
- Create: `lib/blob.ts`

- [ ] **Step 1: Write impl**

`lib/blob.ts`:
```ts
import { put, list, del } from "@vercel/blob";

const PREFIX = "studysync/";

export async function uploadPdf(file: File, docId: string): Promise<string> {
  const blob = await put(`${PREFIX}${docId}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return blob.url;
}

export type BlobDoc = {
  url: string;
  pathname: string;
  filename: string;
  uploadedAt: Date;
};

export async function listPdfs(): Promise<BlobDoc[]> {
  const { blobs } = await list({ prefix: PREFIX });
  return blobs
    .filter((b) => b.pathname.toLowerCase().endsWith(".pdf"))
    .map((b) => ({
      url: b.url,
      pathname: b.pathname,
      filename: b.pathname.replace(PREFIX, ""),
      uploadedAt: b.uploadedAt,
    }));
}

export async function deletePdf(pathname: string): Promise<void> {
  await del(pathname);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/blob.ts
git commit -m "feat: Vercel Blob wrapper"
```

---

## Task 7: Provider adapters (Gemini + Ollama Cloud)

**Files:**
- Create: `lib/providers.ts`, `lib/embed.ts`

- [ ] **Step 1: Write providers.ts**

```ts
import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "ai";

export type ProviderName = "gemini" | "ollama-llama" | "ollama-mistral" | "ollama-qwen";
export type EmbedName = "gemini" | "ollama-nomic" | "ollama-mxbai" | "ollama-bge";

export function getChatModel(name: ProviderName): LanguageModelV1 {
  switch (name) {
    case "gemini":
      return google("gemini-2.0-flash");
    case "ollama-llama":
      return createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "https://ollama.com" })(
        "llama3.1:8b"
      );
    case "ollama-mistral":
      return createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "https://ollama.com" })(
        "mistral-small"
      );
    case "ollama-qwen":
      return createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "https://ollama.com" })(
        "qwen2.5:7b"
      );
  }
}

export function getChatModelName(name: ProviderName): string {
  switch (name) {
    case "gemini":
      return "gemini-2.0-flash";
    case "ollama-llama":
      return "llama3.1:8b";
    case "ollama-mistral":
      return "mistral-small";
    case "ollama-qwen":
      return "qwen2.5:7b";
  }
}
```

- [ ] **Step 2: Write embed.ts**

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createOllama } from "ollama-ai-provider";
import type { EmbedName } from "./providers";

const GEMINI_DIM = 768;

export async function embedTexts(texts: string[], provider: EmbedName): Promise<number[][]> {
  switch (provider) {
    case "gemini": {
      const gen = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
      const model = gen.getGenerativeModel({ model: "text-embedding-004" });
      const out: number[][] = [];
      for (const text of texts) {
        const r = await model.embedContent(text);
        const values = r.embedding.values;
        if (values.length !== GEMINI_DIM) {
          throw new Error(`unexpected dim ${values.length}, expected ${GEMINI_DIM}`);
        }
        out.push(values);
      }
      return out;
    }
    case "ollama-nomic": {
      const ollama = createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "https://ollama.com" });
      return embedWithOllama(ollama.textEmbeddingModel("nomic-embed-text"), texts);
    }
    case "ollama-mxbai": {
      const ollama = createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "https://ollama.com" });
      return embedWithOllama(ollama.textEmbeddingModel("mxbai-embed-large"), texts);
    }
    case "ollama-bge": {
      const ollama = createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "https://ollama.com" });
      return embedWithOllama(ollama.textEmbeddingModel("bge-m3"), texts);
    }
  }
}

async function embedWithOllama(
  model: ReturnType<ReturnType<typeof createOllama>["textEmbeddingModel"]>,
  texts: string[]
): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    const r = await model.doEmbed({ values: [text] });
    out.push(r.embeddings[0]);
  }
  return out;
}

export function getEmbedDim(provider: EmbedName): number {
  switch (provider) {
    case "gemini":
      return GEMINI_DIM;
    case "ollama-nomic":
    case "ollama-mxbai":
    case "ollama-bge":
      return 1024;
  }
}
```

- [ ] **Step 3: Install missing dep**

Run: `npm install @google/generative-ai`
Expected: installed.

- [ ] **Step 4: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: no errors (provider types may need adjustment if signatures differ; fix inline).

- [ ] **Step 5: Commit**

```bash
git add lib/providers.ts lib/embed.ts
git commit -m "feat: provider adapters for chat and embeddings"
```

---

## Task 8: Retriever tool + tests

**Files:**
- Create: `lib/tools/retriever.ts`, `__tests__/retriever.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/retriever.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { retrieve } from "@/lib/tools/retriever";

vi.mock("@/lib/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) =>
    texts.map((t) => (t.includes("photosynthesis") ? [1, 0, 0] : [0, 1, 0]))
  ),
}));

vi.mock("@/lib/store", () => ({
  getAllChunks: () => [
    { docId: "d1", page: 1, text: "Photosynthesis is how plants make food.", embedding: [1, 0, 0], filename: "bio.pdf" },
    { docId: "d1", page: 2, text: "Mitochondria produce ATP.", embedding: [0, 1, 0], filename: "bio.pdf" },
    { docId: "d2", page: 5, text: "Photosynthesis chapter index.", embedding: [0.9, 0.1, 0], filename: "ch5.pdf" },
  ],
}));

describe("retrieve", () => {
  it("returns top-k chunks by similarity", async () => {
    const results = await retrieve("how does photosynthesis work", 2, "gemini");
    expect(results).toHaveLength(2);
    expect(results[0].text.toLowerCase()).toContain("photosynthesis");
  });

  it("includes citation metadata", async () => {
    const results = await retrieve("photosynthesis", 1, "gemini");
    expect(results[0]).toMatchObject({ docId: expect.any(String), filename: expect.any(String), page: expect.any(Number) });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- retriever`
Expected: FAIL "retrieve not exported".

- [ ] **Step 3: Write impl**

`lib/tools/retriever.ts`:
```ts
import { tool } from "ai";
import { z } from "zod";
import { embedTexts } from "@/lib/embed";
import { getAllChunks } from "@/lib/store";
import { topKSimilar } from "@/lib/cosine";
import type { Citation, EmbedName } from "@/lib/providers";

export async function retrieve(query: string, k: number, embedProvider: EmbedName): Promise<Citation[]> {
  const [qVec] = await embedTexts([query], embedProvider);
  const chunks = getAllChunks();
  if (chunks.length === 0) return [];
  const top = topKSimilar(qVec, chunks, k);
  return top.map((c) => ({
    docId: c.docId,
    filename: c.filename,
    page: c.page,
    text: c.text,
  }));
}

export const retrieverTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Search uploaded PDFs for chunks relevant to the query. Returns top-k passages with page citations. Use this whenever the student asks about material from their documents.",
    parameters: z.object({
      query: z.string().describe("The search query"),
      k: z.number().int().min(1).max(10).default(5).describe("Number of chunks to return"),
    }),
    execute: async ({ query, k }) => {
      const citations = await retrieve(query, k, embedProvider);
      return { citations };
    },
  });
```

- [ ] **Step 4: Install zod**

Run: `npm install zod`

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- retriever`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/tools/retriever.ts __tests__/retriever.test.ts
git commit -m "feat: retriever tool with vector search"
```

---

## Task 9: Concept Mapper tool

**Files:**
- Create: `lib/tools/mapper.ts`

- [ ] **Step 1: Write impl**

```ts
import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";
import type { EmbedName } from "@/lib/providers";

export type Concept = { term: string; definition: string };
export type ConceptMap = { concepts: Concept[]; relationships: Array<{ from: string; to: string; relation: string }> };

export const mapperTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Build a concept map from relevant chunks: extract key terms, their definitions, and relationships between them.",
    parameters: z.object({
      topic: z.string().describe("Topic to map"),
    }),
    execute: async ({ topic }) => {
      const citations = await retrieve(topic, 8, embedProvider);
      return { citations, topic };
    },
  });
```

(Note: model fills in `concepts` + `relationships` in its response, tool just gathers context.)

- [ ] **Step 2: Commit**

```bash
git add lib/tools/mapper.ts
git commit -m "feat: concept mapper tool"
```

---

## Task 10: Quiz Generator tool

**Files:**
- Create: `lib/tools/quiz.ts`

- [ ] **Step 1: Write impl**

```ts
import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";
import type { EmbedName } from "@/lib/providers";

export const quizTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Generate a practice quiz (MCQ + short-answer) from material relevant to the topic. Returns citations to source chunks.",
    parameters: z.object({
      topic: z.string().describe("Quiz topic"),
      numQuestions: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ topic, numQuestions }) => {
      const citations = await retrieve(topic, Math.max(numQuestions * 2, 6), embedProvider);
      return { citations, topic, numQuestions };
    },
  });
```

- [ ] **Step 2: Commit**

```bash
git add lib/tools/quiz.ts
git commit -m "feat: quiz generator tool"
```

---

## Task 11: Explainer tool

**Files:**
- Create: `lib/tools/explainer.ts`

- [ ] **Step 1: Write impl**

```ts
import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";
import type { EmbedName } from "@/lib/providers";

export const explainerTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Explain a concept in a student-friendly way using retrieved material: simple language, analogies, examples.",
    parameters: z.object({
      concept: z.string().describe("Concept to explain"),
    }),
    execute: async ({ concept }) => {
      const citations = await retrieve(concept, 6, embedProvider);
      return { citations, concept };
    },
  });
```

- [ ] **Step 2: Commit**

```bash
git add lib/tools/explainer.ts
git commit -m "feat: explainer tool"
```

---

## Task 12: System prompts

**Files:**
- Create: `lib/prompts.ts`

- [ ] **Step 1: Write impl**

```ts
import type { AgentMode } from "./types";

const base = `You are StudySync, a personalized tutor. You answer using the student's uploaded PDFs (textbooks, notes, syllabi, question banks).
Always cite sources as [n] matching the citations list provided by tools. Never invent page numbers. If the tool returns no relevant material, say so honestly.`;

export function systemPrompt(mode: AgentMode): string {
  switch (mode) {
    case "retriever":
      return `${base}\n\nMode: Subject Retriever. Answer the student's question directly, citing relevant passages from their documents.`;
    case "mapper":
      return `${base}\n\nMode: Concept Mapper. Build a concept map from the retrieved material:
- Extract 5-10 key concepts with short definitions
- List relationships between concepts (e.g. "X causes Y", "X is a type of Y")
- Return as a clear structured response with a Mermaid diagram in a code block if helpful.`;
    case "quiz":
      return `${base}\n\nMode: Quiz Generator. Create a practice quiz on the topic:
- Mix MCQ (4 options, mark correct) and short-answer questions
- Base questions strictly on the retrieved passages
- After each question, cite the source passage`;
    case "explainer":
      return `${base}\n\nMode: Explainer. Explain the concept like a patient tutor:
- Use simple language, avoid jargon unless defined
- Give a real-world analogy
- Walk through step-by-step if it's a process
- Cite source passages inline`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts.ts
git commit -m "feat: agent system prompts"
```

---

## Task 13: Upload API route

**Files:**
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Write impl**

```ts
import { NextRequest, NextResponse } from "next/server";
import { uploadPdf } from "@/lib/blob";
import { chunkPages, setChunkDocId } from "@/lib/chunker";
import { embedTexts } from "@/lib/embed";
import { addDoc, withLock } from "@/lib/store";
import pdf from "pdf-parse";
import crypto from "crypto";
import type { EmbedName } from "@/lib/providers";

export const runtime = "nodejs";
const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? "10");

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `file too large (max ${MAX_MB}MB)` }, { status: 413 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF only" }, { status: 400 });
  }

  const docId = crypto.randomBytes(8).toString("hex");
  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(0, 120);
  const blobUrl = await uploadPdf(file, `${docId}-${safeName}`);

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await pdf(buf);
  const pages = parsed.text
    .split(/\f/)
    .map((t, i) => ({ page: i + 1, text: t }))
    .filter((p) => p.text.trim());

  const rawChunks = chunkPages(pages, 1000, 200);
  const docChunks = setChunkDocId(rawChunks, docId);

  const embedProvider = (process.env.EMBED_PROVIDER ?? "gemini") as EmbedName;
  const batchSize = 16;
  const embedded: typeof docChunks = [];
  await withLock(docId, async () => {
    for (let i = 0; i < docChunks.length; i += batchSize) {
      const batch = docChunks.slice(i, i + batchSize);
      const vecs = await embedTexts(batch.map((c) => c.text), embedProvider);
      batch.forEach((c, j) => embedded.push({ ...c, embedding: vecs[j] }));
    }
  });

  addDoc({
    doc: {
      id: docId,
      filename: file.name,
      blobUrl,
      pageCount: pages.length || 1,
      uploadedAt: Date.now(),
    },
    chunks: embedded,
  });

  return NextResponse.json({
    id: docId,
    filename: file.name,
    pageCount: pages.length || 1,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: upload route with chunk + embed"
```

---

## Task 14: Docs list + delete routes

**Files:**
- Create: `app/api/docs/route.ts`, `app/api/docs/[id]/route.ts`

- [ ] **Step 1: Write list route**

`app/api/docs/route.ts`:
```ts
import { NextResponse } from "next/server";
import { listDocs, getAllChunks } from "@/lib/store";
import { listPdfs } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const indexed = listDocs();
  const blobs = await listPdfs();
  return NextResponse.json({
    indexed,
    blobs,
    indexedChunkCount: getAllChunks().length,
  });
}
```

- [ ] **Step 2: Write delete route**

`app/api/docs/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { removeDoc, getDoc } from "@/lib/store";
import { deletePdf } from "@/lib/blob";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const state = getDoc(params.id);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  removeDoc(params.id);
  const pathname = state.doc.blobUrl.split("/").slice(-2).join("/");
  await deletePdf(pathname).catch(() => null);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/docs/route.ts app/api/docs/[id]/route.ts
git commit -m "feat: docs list + delete routes"
```

---

## Task 15: Reindex (cold-start recovery) route

**Files:**
- Create: `app/api/reindex/route.ts`

- [ ] **Step 1: Write impl**

```ts
import { NextResponse } from "next/server";
import { listPdfs } from "@/lib/blob";
import { addDoc, isEmpty, getDoc } from "@/lib/store";
import { chunkPages, setChunkDocId } from "@/lib/chunker";
import { embedTexts } from "@/lib/embed";
import pdf from "pdf-parse";
import type { EmbedName } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const embedProvider = (process.env.EMBED_PROVIDER ?? "gemini") as EmbedName;
  const blobs = await listPdfs();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const b of blobs) {
    const id = b.pathname.split("/").pop()?.split("-")[0];
    if (!id) continue;
    if (!isEmpty() && getDoc(id)) continue; // already indexed
    try {
      const res = await fetch(b.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const parsed = await pdf(buf);
      const pages = parsed.text
        .split(/\f/)
        .map((t, i) => ({ page: i + 1, text: t }))
        .filter((p) => p.text.trim());
      const rawChunks = chunkPages(pages, 1000, 200);
      const docChunks = setChunkDocId(rawChunks, id);
      const vecs = await embedTexts(docChunks.map((c) => c.text), embedProvider);
      const embedded = docChunks.map((c, i) => ({ ...c, embedding: vecs[i] }));
      addDoc({
        doc: {
          id,
          filename: b.filename.split("-").slice(1).join("-") || b.filename,
          blobUrl: b.url,
          pageCount: pages.length || 1,
          uploadedAt: b.uploadedAt.getTime(),
        },
        chunks: embedded,
      });
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: (e as Error).message });
    }
  }

  return NextResponse.json({ reindexed: results });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/reindex/route.ts
git commit -m "feat: cold-start reindex route"
```

---

## Task 16: Chat route (orchestrator)

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Write impl**

```ts
import { NextRequest } from "next/server";
import { streamText, tool } from "ai";
import { z } from "zod";
import { getChatModel, type ProviderName, type EmbedName } from "@/lib/providers";
import { retrieverTool } from "@/lib/tools/retriever";
import { mapperTool } from "@/lib/tools/mapper";
import { quizTool } from "@/lib/tools/quiz";
import { explainerTool } from "@/lib/tools/explainer";
import { systemPrompt } from "@/lib/prompts";
import { isEmpty, listDocs } from "@/lib/store";
import { listPdfs } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  agent: "retriever" | "mapper" | "quiz" | "explainer";
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const provider = (process.env.LLM_PROVIDER ?? "gemini") as ProviderName;
  const embedProvider = (process.env.EMBED_PROVIDER ?? "gemini") as EmbedName;

  // Lazy cold-start reindex
  if (isEmpty()) {
    const blobs = await listPdfs();
    if (blobs.length > 0) {
      await fetch(new URL("/api/reindex", req.url), { method: "POST" });
    }
  }

  const allTools = {
    retriever: retrieverTool(embedProvider),
    mapper: mapperTool(embedProvider),
    quiz: quizTool(embedProvider),
    explainer: explainerTool(embedProvider),
  };

  // Force tool based on selected agent
  const toolsForMode = {
    retriever: { retriever: allTools.retriever },
    mapper: { mapper: allTools.mapper },
    quiz: { quiz: allTools.quiz },
    explainer: { explainer: allTools.explainer },
  } as const;

  const result = streamText({
    model: getChatModel(provider),
    system: systemPrompt(body.agent),
    messages: body.messages,
    tools: toolsForMode[body.agent],
    toolChoice: "required",
    maxSteps: 4,
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: chat orchestrator route"
```

---

## Task 17: shadcn UI primitives

**Files:**
- Create: `components/ui/button.tsx`, `card.tsx`, `input.tsx`, `tabs.tsx`, `scroll-area.tsx`, `separator.tsx`, `tooltip.tsx`, `toast.tsx`, `toaster.tsx`, `use-toast.ts`

- [ ] **Step 1: Run shadcn add**

Run: `npx --yes shadcn@latest add button card input tabs scroll-area separator tooltip --yes`
Expected: components created in `components/ui/`.

- [ ] **Step 2: Install radix deps if missing**

Run: `npm install @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-toast`

- [ ] **Step 3: Commit**

```bash
git add components/ui/ package.json
git commit -m "feat: shadcn UI primitives"
```

---

## Task 18: Theme provider + globals

**Files:**
- Create: `components/theme-provider.tsx`, `components/theme-toggle.tsx`, `app/globals.css`

- [ ] **Step 1: Write theme-provider**

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 2: Write theme-toggle**

```tsx
"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
    </Button>
  );
}
```

- [ ] **Step 3: Write globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 4: Commit**

```bash
git add components/theme-provider.tsx components/theme-toggle.tsx app/globals.css
git commit -m "feat: theme provider + globals"
```

---

## Task 19: App layout + 3-pane page

**Files:**
- Create: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Write app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudySync",
  description: "Student study material Q&A companion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write app/page.tsx (3-pane shell)**

```tsx
"use client";
import { useState } from "react";
import { DocSidebar } from "@/components/doc-sidebar";
import { PdfViewer } from "@/components/pdf-viewer";
import { ChatPanel } from "@/components/chat-panel";
import { CitationsPanel } from "@/components/citations-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Citation, Doc } from "@/lib/types";

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [jumpPage, setJumpPage] = useState<number | null>(null);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">StudySync</h1>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r overflow-y-auto">
          <DocSidebar
            docs={docs}
            setDocs={setDocs}
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
          />
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PdfViewer
              docId={selectedDocId}
              docs={docs}
              jumpPage={jumpPage}
            />
          </div>
          <div className="h-1/2 border-t overflow-hidden">
            <ChatPanel
              docs={docs}
              onCitations={setCitations}
              onJump={(page) => setJumpPage(page)}
            />
          </div>
        </main>
        <aside className="w-80 border-l overflow-y-auto">
          <CitationsPanel citations={citations} onJump={setJumpPage} />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: app layout + 3-pane page"
```

---

## Task 20: DocSidebar component

**Files:**
- Create: `components/doc-sidebar.tsx`

- [ ] **Step 1: Write impl**

```tsx
"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Upload } from "lucide-react";
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
        const err = await res.json();
        alert(err.error ?? "Upload failed");
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
        <Input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onUpload}
          disabled={uploading}
        />
        {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading + embedding...</p>}
      </div>
      <div className="space-y-1">
        {docs.length === 0 && (
          <p className="text-xs text-muted-foreground">No documents yet.</p>
        )}
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
              onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/doc-sidebar.tsx
git commit -m "feat: doc sidebar with upload + delete"
```

---

## Task 21: PdfViewer component

**Files:**
- Create: `components/pdf-viewer.tsx`

- [ ] **Step 1: Install react-pdf deps**

Run: `npm install react-pdf pdfjs-dist`

- [ ] **Step 2: Write impl**

```tsx
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
        file={doc.blobUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p className="text-sm">Loading PDF...</p>}
        error={<p className="text-sm text-destructive">Failed to load PDF</p>}
      >
        <Page pageNumber={page} width={800} renderTextLayer renderAnnotationLayer={false} />
      </Document>
      <div className="mt-2 flex gap-2">
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
```

- [ ] **Step 3: Commit**

```bash
git add components/pdf-viewer.tsx
git commit -m "feat: pdf viewer with page jump"
```

---

## Task 22: AgentTabs component

**Files:**
- Create: `components/agent-tabs.tsx`

- [ ] **Step 1: Write impl**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/agent-tabs.tsx
git commit -m "feat: agent tabs selector"
```

---

## Task 23: ChatPanel component

**Files:**
- Create: `components/chat-panel.tsx`

- [ ] **Step 1: Write impl**

```tsx
"use client";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentTabs } from "./agent-tabs";
import type { AgentMode, Citation, Doc } from "@/lib/types";
import { Send } from "lucide-react";

type ToolResult = { citations?: Citation[] };

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
    onFinish: (msg) => {
      const toolInvocations = (msg as unknown as { toolInvocations?: Array<{ result?: ToolResult }> })
        .toolInvocations;
      const last = toolInvocations?.find((t) => t.result?.citations)?.result;
      if (last?.citations) onCitations(last.citations);
    },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <AgentTabs value={agent} onChange={setAgent} />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {docs.length === 0
              ? "Upload a PDF to get started."
              : `Ask a question across ${docs.length} document${docs.length > 1 ? "s" : ""}.`}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded p-2 text-sm ${
              m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"
            }`}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {isLoading && <div className="text-xs text-muted-foreground">Thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t p-2 flex gap-2"
      >
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={`Ask ${agent}...`}
          disabled={isLoading || docs.length === 0}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat-panel.tsx
git commit -m "feat: chat panel with useChat + agent tabs"
```

---

## Task 24: CitationsPanel component

**Files:**
- Create: `components/citations-panel.tsx`

- [ ] **Step 1: Write impl**

```tsx
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
    <div className="p-3 space-y-2">
      <h2 className="text-sm font-semibold">Citations</h2>
      {citations.length === 0 && (
        <p className="text-xs text-muted-foreground">No citations yet.</p>
      )}
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-2 pr-2">
          {citations.map((c, i) => (
            <div key={`${c.docId}-${c.page}-${i}`} className="rounded border p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate" title={c.filename}>
                  [{i + 1}] {c.filename}
                </span>
                <Button variant="ghost" size="sm" onClick={() => onJump(c.page)}>
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
```

- [ ] **Step 2: Commit**

```bash
git add components/citations-panel.tsx
git commit -m "feat: citations panel"
```

---

## Task 25: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# StudySync

Agentic multi-document Q&A for students. Upload PDFs (textbooks, notes, question banks), ask across them with 4 agent modes: Subject Retriever, Concept Mapper, Quiz Generator, Explainer.

## Stack

Next.js 14 (App Router, TS) · Vercel AI SDK · shadcn/ui · Vercel Blob · Gemini + Ollama Cloud

## Setup

1. `npm install`
2. Copy `.env.local.example` → `.env.local`, fill in:
   - `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
   - `GEMINI_API_KEY` (if using Gemini)
   - `OLLAMA_CLOUD_API_KEY` (if using Ollama)
   - `LLM_PROVIDER` = `gemini` | `ollama-llama` | `ollama-mistral` | `ollama-qwen`
   - `EMBED_PROVIDER` = `gemini` | `ollama-nomic` | `ollama-mxbai` | `ollama-bge`
3. `npm run dev`

## Deploy

Vercel → New Project → import repo. Add env vars in Project Settings. Deploy.

## Caveats

- No database. Vectors in memory, lost on cold start. Chat history lost too. PDFs persist in Blob.
- Cold start re-embeds all docs (2-5s for typical PDFs).
- Single-user, no auth.

## Spec & Plan

- Spec: `docs/superpowers/specs/2026-06-25-studysync-design.md`
- Plan: `docs/superpowers/plans/2026-06-25-studysync.md`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

---

## Task 26: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all pass (cosine 4, chunker 4, retriever 2).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Smoke test dev**

Run: `npm run dev` (in background)
Then: open http://localhost:3000 in browser (you do this)
Expected: page loads, theme toggle works, layout renders 3 panes.

- [ ] **Step 5: Final commit if any fixes**

```bash
git add -A
git commit -m "chore: final fixes from verification" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** upload (T13), list/delete (T14), reindex (T15), chat with 4 agents (T8-12, T16), 3-pane UI (T19-24), theme (T18), tests (T3, T4, T8), error handling (per-route), config (T1, T11). ✓
- **Type consistency:** `Citation` defined T2, used T8/T13/T15/T24. `Doc` T2 → T13/T14/T20/T21. `Chunk` T2 → T4/T5. `AgentMode` T2 → T12/T16/T22/T23. ✓
- **Placeholders:** none — every code block has full content.