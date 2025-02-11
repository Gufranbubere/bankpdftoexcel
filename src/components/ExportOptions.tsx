import { FileSpreadsheet, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExportOptionsProps {
  onExport: (format: 'excel' | 'csv') => void;
  isProcessing: boolean;
}

export const ExportOptions = ({ onExport, isProcessing }: ExportOptionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md mx-auto animate-fade-up">
      <Button
        variant="outline"
        className={cn(
          "w-full sm:w-auto px-8 py-6 space-x-2",
          "bg-background/50 backdrop-blur-sm",
          "hover:bg-accent/50 transition-all duration-300"
        )}
        onClick={() => onExport('excel')}
        disabled={isProcessing}
      >
        <FileSpreadsheet className="w-5 h-5" />
        <span>Export as Excel</span>
      </Button>

      <Button
        variant="outline"
        className={cn(
          "w-full sm:w-auto px-8 py-6 space-x-2",
          "bg-background/50 backdrop-blur-sm",
          "hover:bg-accent/50 transition-all duration-300"
        )}
        onClick={() => onExport('csv')}
        disabled={isProcessing}
      >
        <FileDown className="w-5 h-5" />
        <span>Export as CSV</span>
      </Button>
    </div>
  );
};