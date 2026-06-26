# StudySync

Agentic multi-document Q&A for students. Upload PDFs (textbooks, notes, question banks), ask across them with 4 agent modes: Subject Retriever, Concept Mapper, Quiz Generator, Explainer.

## Stack

Next.js 14 (App Router, TS) · Vercel AI SDK · shadcn/ui · Gemini + Ollama Cloud

## Setup

1. `npm install`
2. `npm run dev`
3. Open app, click Settings (gear icon), enter API key, pick provider, save.

No env vars required. API keys stored in browser localStorage.

## Deploy

Vercel → New Project → import repo. Deploy. No storage config needed.

## Caveats

- No database. Vectors + PDF buffers in memory, lost on cold start.
- Chat history not persisted.
- Single-user, no auth.

## Spec & Plan

- Spec: `docs/superpowers/specs/2026-06-25-studysync-design.md`
- Plan: `docs/superpowers/plans/2026-06-25-studysync.md`