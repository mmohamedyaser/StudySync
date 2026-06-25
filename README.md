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