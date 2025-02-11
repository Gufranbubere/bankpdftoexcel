export interface Transaction {
  date: string;
  description: string;
  moneyIn: string | null;
  moneyOut: string | null;
  balance: string;
}

export interface ExtractedData {
  transactions: Transaction[];
  metadata: {
    totalCredits: string;
    totalDebits: string;
  };
}

export interface PreviewResponse {
  success: boolean;
  data?: ExtractedData;
  error?: string;
  downloadUrl?: string;
} 