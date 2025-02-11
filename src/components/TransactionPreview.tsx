import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, ArrowDownUp } from "lucide-react";
import { Transaction } from '@/types';

interface TransactionPreviewProps {
  transactions: Transaction[];
  onConfirm: () => void;
  onCancel: () => void;
  metadata: {
    totalCredits: string;
    totalDebits: string;
  };
}

const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  transactions,
  onConfirm,
  onCancel,
  metadata
}) => {
  return (
    <Card className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Preview Transactions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {transactions.length} transactions found
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Confirm & Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-green-50">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Total Credits</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {metadata.totalCredits}
          </p>
        </Card>
        <Card className="p-4 bg-red-50">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-gray-600">Total Debits</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {metadata.totalDebits}
          </p>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Money In (£)</TableHead>
              <TableHead className="text-right">Money Out (£)</TableHead>
              <TableHead className="text-right">Balance (£)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => (
              <TableRow 
                key={index}
                className={
                  transaction.description === 'Start Balance' || 
                  transaction.description === 'Balance carried forward'
                    ? 'bg-gray-50'
                    : ''
                }
              >
                <TableCell>{transaction.date}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {transaction.moneyIn?.replace('£', '') || ''}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {transaction.moneyOut?.replace('£', '') || ''}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {transaction.balance.replace('£', '')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-gray-500">
        <p>Please review the extracted transactions above before confirming.</p>
        <p>The transactions will be saved in your selected format with proper formatting.</p>
      </div>
    </Card>
  );
};

export default TransactionPreview; 