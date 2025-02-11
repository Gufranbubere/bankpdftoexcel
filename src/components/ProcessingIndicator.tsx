import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingIndicatorProps {
  isProcessing: boolean;
}

export const ProcessingIndicator = ({ isProcessing }: ProcessingIndicatorProps) => {
  if (!isProcessing) return null;

  return (
    <div className="flex items-center justify-center gap-2 animate-fade-in">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm text-muted-foreground">Processing your file...</span>
    </div>
  );
};