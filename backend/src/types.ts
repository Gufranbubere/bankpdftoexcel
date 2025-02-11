export interface Transaction {
  date: string;
  description: string;
  moneyIn: string | null;
  moneyOut: string | null;
  balance: string | null;
  category?: string;
}

export interface ExtractedData {
  transactions: Transaction[];
  metadata: {
    accountNumber?: string;
    statementPeriod?: string;
    totalCredits: string;
    totalDebits: string;
  };
} 