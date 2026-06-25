declare module "pdf-parse" {
  type PdfData = { text: string; numpages: number; numrender: number; info: unknown; metadata: unknown; version: string };
  function pdfParse(data: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PdfData>;
  export default pdfParse;
}