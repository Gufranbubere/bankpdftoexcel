declare module 'pdf-parse/lib' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }

  function PDFParse(dataBuffer: Buffer): Promise<PDFData>;
  export = PDFParse;
}

export interface ProcessFileResult {
  filename: string;
}

export interface ConversionResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
}

export interface Transaction {
  date: string;
  description: string;
  moneyIn: string | null;
  moneyOut: string | null;
  balance: string;
  category?: string;
}

export interface ExtractedData {
  transactions: Transaction[];
  metadata: {
    accountNumber?: string;
    statementPeriod?: string;
    totalCredits?: string;
    totalDebits?: string;
  };
} 