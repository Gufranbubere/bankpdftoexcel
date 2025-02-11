declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }

  function PDFParse(dataBuffer: Buffer): Promise<PDFData>;
  export = PDFParse;
} 