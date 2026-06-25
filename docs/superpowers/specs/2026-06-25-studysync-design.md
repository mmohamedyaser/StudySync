# StudySync — Design Spec

**Date:** 2026-06-25
**Topic:** Agentic Multi-Document Research and Q&A Assistant for Students
**Status:** Approved (pending user sign-off)

## Summary

StudySync is a web app for students to upload study material (PDFs — textbooks, lecture notes, question banks, syllabi) and ask questions across them via four agentic tools. Students pick an agent per query (default: Subject Retriever), get cited answers, and can switch to Quiz Generator or Explainer for revision.

100% Vercel-deployed. No database. PDFs in Vercel Blob, vectors in-memory (rebuilt on cold start), chat history ephemeral.

## Goals

- Single-user, no-auth, deploy in one `vercel deploy`
- Multi-PDF Q&A with citations to source pages
- Four distinct agent personas: Subject Retriever, Concept Mapper, Quiz Generator, Explainer
- Three-pane UI: doc sidebar, PDF viewer + chat, citations panel
- Dark/light theme toggle

## Non-goals (v1)

- Authentication / multi-tenancy
- Persistent chat history (lost on cold start)
- Image / figure extraction from PDFs (text-only)
- OCR for scanned PDFs
- Cross-user sharing

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, TypeScript) |
| UI | shadcn/ui + Tailwind CSS |
| AI orchestration | Vercel AI SDK (`streamText` + tools) |
| LLM providers | Gemini 2.0 Flash, Ollama Cloud (Llama 3.1 8B, Mistral Small, Qwen 2.5) |
| Embeddings | Gemini `text-embedding-004`, Ollama `nomic-embed-text` / `mxbai-embed-large` / `bge-m3` |
| PDF parsing | `pdf-parse` |
| PDF render (client) | `react-pdf` |
| Storage | Vercel Blob |
| State | In-memory `Map` (module-level, per serverless instance) |
| Deploy | Vercel (frontend + API routes in same project) |

## Architecture

```
Browser (Next.js 14, shadcn/ui)
  │
  ├── POST /api/upload   ──► Vercel Blob
  ├── GET  /api/docs     ──► Vercel Blob list
  ├── DEL  /api/docs/:id ──► Vercel Blob delete
  │
  └── POST /api/chat     ──► Vercel AI SDK streamText
                                │
                                ├── model: gemini-2.0-flash | ollama cloud
                                ├── tools:
                                │     • retriever  (vector search top-k)
                                │     • mapper     (concept graph extract)
                                │     • quiz       (MCQ + short-answer gen)
                                │     • explainer  (student-friendly explain)
                                │
                                └── store: in-memory Map<docId, {chunks, vecs, blobUrl}>
```

### Cold-start lifecycle

1. Function idle ~15 min → Vercel freezes instance
2. New request → instance thaws → module reloads → `Map` empty
3. First `/api/chat` call → if `Map` empty, scan Blob, fetch + re-embed all docs (ponytail: global lock via simple in-memory mutex; add per-doc locks if re-embed latency becomes user-visible)
4. Subsequent calls use warm `Map` until next freeze

**Privacy:** each visitor hits a fresh container instance on cold start. No shared state between users. Vercel Blob tokens are scoped to the deploy (single-tenant). User A cannot see User B's chats or PDFs because each gets their own ephemeral `Map` and Blob namespace isolation is per-deploy.

## Components

### Frontend (`app/`)

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, theme provider, font |
| `app/page.tsx` | 3-pane shell (sidebar / center / citations) |
| `app/globals.css` | Tailwind + shadcn theme vars |
| `components/doc-sidebar.tsx` | Upload zone, doc list, delete buttons |
| `components/pdf-viewer.tsx` | `react-pdf` render of selected doc, page jump |
| `components/chat-panel.tsx` | `useChat` from `@ai-sdk/react`, agent tabs above input |
| `components/citations-panel.tsx` | Sources from last response, click → jump PDF |
| `components/theme-toggle.tsx` | Dark/light toggle |
| `components/agent-tabs.tsx` | 4 tabs: Retriever / Mapper / Quiz / Explainer |
| `lib/blob.ts` | Vercel Blob wrapper (`put`, `list`, `del`) |
| `lib/types.ts` | Shared TS types (Doc, Chunk, Citation, AgentMode) |

### Backend (`app/api/`)

| File | Purpose |
|------|---------|
| `app/api/upload/route.ts` | Multipart → Blob → trigger embed |
| `app/api/docs/route.ts` | `GET` list, `DELETE` by id |
| `app/api/chat/route.ts` | `streamText({ model, tools, messages })` |
| `app/api/embed/route.ts` | Chunk + embed + store in `Map` |
| `lib/store.ts` | Module-level `Map<docId, DocState>` |
| `lib/chunker.ts` | Page-aware chunker (~1000 chars, 200 overlap, preserve page boundaries) |
| `lib/embed.ts` | Provider-agnostic embed dispatch |
| `lib/providers.ts` | Gemini + Ollama Cloud adapter factories |
| `lib/tools/retriever.ts` | Cosine similarity search, returns top-k chunks + page refs |
| `lib/tools/mapper.ts` | Extracts concept map (terms + relationships) from chunks |
| `lib/tools/quiz.ts` | Generates MCQ + short-answer questions from chunks |
| `lib/tools/explainer.ts` | Student-friendly explainer with examples + analogies |
| `lib/prompts.ts` | System prompts per agent mode |

## Data flow

### Upload

1. User selects PDF in sidebar → `POST /api/upload` (multipart)
2. Server: validate size (≤10MB), `put()` to Vercel Blob with random `docId`
3. Server: fetch Blob → `pdf-parse` → page-aware chunks
4. Server: embed each chunk (parallel, batch size 16)
5. Server: write `{chunks, embeddings, blobUrl}` to `Map`
6. Server: return `{docId, filename, pageCount}`
7. Client: append to doc list, trigger embed for any docs missing from `Map`

### Chat (default: Retriever)

1. User types question → `useChat` sends `POST /api/chat` with `{messages, agent}`
2. Server: build `streamText` call with retriever tool available, system prompt varies by `agent`
3. Model decides to call `retriever({ query })` tool
4. Tool: embed query → cosine sim against all chunks in `Map` → return top-5 chunks with `{page, text, docId}`
5. Model: composes answer citing chunks inline as `[1], [2]` etc.
6. Stream chunks to client → `useChat` renders
7. Citations panel shows sources; click → PDF viewer jumps to page

### Chat (opt-in: Mapper / Quiz / Explainer)

1. User selects agent tab → system prompt swaps to that persona's instructions
2. Model calls that specific tool (forced via system prompt + `toolChoice` if needed)
3. Tool returns structured output (concept graph / quiz JSON / explanation)
4. Client renders with appropriate component (graph for mapper, card for quiz, markdown for explainer)

### Cold start recovery

1. First `/api/chat` after freeze: check `Map.size === 0` and Blob has docs
2. If so: spawn re-embed job for all docs (sequential, simple)
3. Return `503` to user with retry-after if job incomplete (rare: usually completes in 2-5s)

## Data types

```ts
type Doc = {
  id: string;            // random hex
  filename: string;
  blobUrl: string;
  pageCount: number;
  uploadedAt: number;
};

type Chunk = {
  docId: string;
  page: number;          // 1-indexed
  text: string;          // ~1000 chars
  embedding: number[];   // 768 or 1024 dim
};

type DocState = {
  doc: Doc;
  chunks: Chunk[];
};

type Citation = {
  docId: string;
  filename: string;
  page: number;
  text: string;
};

type AgentMode = "retriever" | "mapper" | "quiz" | "explainer";
```

## Provider abstraction

```ts
// lib/providers.ts
type Provider = {
  chatModel: () => LanguageModelV1;       // Vercel AI SDK model
  embed: (texts: string[]) => Promise<number[][]>;
};

function getProvider(name: "gemini" | "ollama-llama" | "ollama-mistral" | "ollama-qwen"): Provider;
```

Provider selected via env var `LLM_PROVIDER`. Same for embeddings (`EMBED_PROVIDER`).

## Error handling

| Failure | Behavior |
|---------|----------|
| Upload >10MB | 413 + toast |
| Embed rate limit | Mark doc `degraded`, retry on next chat |
| Tool returns empty context | Model says "no material on this" |
| Blob unreachable | 503 + toast "storage down, retry" |
| Model timeout (60s) | 504 + partial answer |
| Cold-start re-embed >5s | 503 + retry-after: 3 |

## Testing

Per ponytail: small `__main__` self-check on non-trivial logic. One `vitest` file for chunker + retriever.

- `lib/chunker.ts` — unit: page boundaries preserved, overlap correct
- `lib/tools/retriever.ts` — unit: cosine sim correct, top-k correct
- `lib/embed.ts` — integration: smoke against Gemini (skipped if no key)
- `app/api/chat/route.ts` — manual: send query, assert tool called, citations returned

## Security

- No auth → no PII protection beyond Vercel's deploy isolation
- Blob token scoped to deploy, not per-user
- Upload size limit 10MB enforced server-side
- Filename sanitized (strip path, limit length)
- No SSRF: only outbound to LLM provider URLs (Gemini, Ollama Cloud)
- CSP: default Next.js, no inline scripts

## Performance

- Cold-start re-embed: 2-5s for 5 PDFs (~500 chunks total, batch 16)
- Embed latency: ~200ms/chunk on Gemini, ~500ms on Ollama Cloud
- Chat first-token: ~1s (Gemini), ~1.5s (Ollama Cloud)
- Stream: 30-50 tokens/s typical

## Configuration (env vars)

| Var | Required | Default |
|-----|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | yes | — |
| `GEMINI_API_KEY` | if `LLM_PROVIDER=gemini` | — |
| `OLLAMA_CLOUD_API_KEY` | if `LLM_PROVIDER=ollama-*` | — |
| `LLM_PROVIDER` | no | `gemini` |
| `EMBED_PROVIDER` | no | `gemini` |
| `MAX_UPLOAD_MB` | no | `10` |

## Out of scope (deferred)

- Vercel KV for chat history (declined by user, no DB)
- Auth (NextAuth, Clerk)
- Image / figure extraction (GPT-4V, Gemini Vision)
- OCR (Tesseract, Google Document AI)
- Streaming tool calls mid-response (Vercel AI SDK supports, defer)
- PDF annotations / highlights saved
- Study planner / spaced repetition

## Open risks

- **Cold-start re-embed latency** — mitigate with cached embeddings in Blob if user complains
- **Ollama Cloud free tier rate limits** — degrade to Gemini on 429
- **PDF parsing fails on complex layouts** — fall back to raw text extraction, mark degraded
- **Vercel function timeout (10s hobby, 60s pro)** — chunking + embed must fit; batch + parallel

## File layout (final)

```
StudySync/
├── app/
│   ├── api/
│   │   ├── upload/route.ts
│   │   ├── docs/route.ts
│   │   ├── chat/route.ts
│   │   └── embed/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── doc-sidebar.tsx
│   ├── pdf-viewer.tsx
│   ├── chat-panel.tsx
│   ├── citations-panel.tsx
│   ├── theme-toggle.tsx
│   └── agent-tabs.tsx
├── lib/
│   ├── store.ts
│   ├── chunker.ts
│   ├── embed.ts
│   ├── providers.ts
│   ├── blob.ts
│   ├── prompts.ts
│   ├── types.ts
│   └── tools/
│       ├── retriever.ts
│       ├── mapper.ts
│       ├── quiz.ts
│       └── explainer.ts
├── __tests__/
│   ├── chunker.test.ts
│   └── retriever.test.ts
├── docs/superpowers/specs/2026-06-25-studysync-design.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```