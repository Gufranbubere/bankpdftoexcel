import React from 'react';
import { OutputFormat } from '../types';
import { FileType, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface FormatSelectorProps {
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
}

const FormatSelector: React.FC<FormatSelectorProps> = ({ format, onFormatChange }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-lg font-medium text-gray-900">
        Choose Output Format
      </label>
      <div className="grid grid-cols-2 gap-4">
        <Card
          onClick={() => onFormatChange('xlsx')}
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-2",
            format === 'xlsx' 
              ? "border-blue-600 bg-blue-50" 
              : "border-gray-200 hover:border-blue-600 hover:bg-blue-50"
          )}
        >
          <div className="p-6 flex items-center gap-4">
            <FileSpreadsheet className={cn(
              "h-8 w-8",
              format === 'xlsx' ? "text-blue-600" : "text-gray-400"
            )} />
            <div className="flex flex-col">
              <span className="text-lg font-medium text-gray-900">Excel</span>
              <span className="text-sm text-gray-500">Formatted spreadsheet</span>
            </div>
          </div>
        </Card>
        
        <Card
          onClick={() => onFormatChange('csv')}
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-2",
            format === 'csv' 
              ? "border-blue-600 bg-blue-50" 
              : "border-gray-200 hover:border-blue-600 hover:bg-blue-50"
          )}
        >
          <div className="p-6 flex items-center gap-4">
            <FileType className={cn(
              "h-8 w-8",
              format === 'csv' ? "text-blue-600" : "text-gray-400"
            )} />
            <div className="flex flex-col">
              <span className="text-lg font-medium text-gray-900">CSV</span>
              <span className="text-sm text-gray-500">Maximum compatibility</span>
            </div>
          </div>
        </Card>
      </div>
      <p className="text-sm text-gray-500 mt-1">
        Choose Excel for formatted spreadsheets or CSV for maximum compatibility with other software
      </p>
    </div>
  );
};

export default FormatSelector; 