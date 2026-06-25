import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EmbedName } from "./providers";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "https://ollama.com";
export const GEMINI_DIM = 768;
export const OLLAMA_DIM = 1024;

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
    case "ollama-nomic":
    case "ollama-mxbai":
    case "ollama-bge": {
      const modelName =
        provider === "ollama-nomic"
          ? "nomic-embed-text"
          : provider === "ollama-mxbai"
          ? "mxbai-embed-large"
          : "bge-m3";
      const out: number[][] = [];
      for (const text of texts) {
        const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OLLAMA_CLOUD_API_KEY ?? ""}` },
          body: JSON.stringify({ model: modelName, prompt: text }),
        });
        if (!res.ok) throw new Error(`ollama embed failed: ${res.status}`);
        const json = (await res.json()) as { embedding: number[] };
        if (json.embedding.length !== OLLAMA_DIM) {
          throw new Error(`unexpected dim ${json.embedding.length}, expected ${OLLAMA_DIM}`);
        }
        out.push(json.embedding);
      }
      return out;
    }
  }
}

export function getEmbedDim(provider: EmbedName): number {
  switch (provider) {
    case "gemini":
      return GEMINI_DIM;
    case "ollama-nomic":
    case "ollama-mxbai":
    case "ollama-bge":
      return OLLAMA_DIM;
  }
}