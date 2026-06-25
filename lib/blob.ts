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