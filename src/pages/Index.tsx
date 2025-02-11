import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ExportOptions } from '@/components/ExportOptions';
import { ProcessingIndicator } from '@/components/ProcessingIndicator';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      setIsProcessing(true);
      
      // Create sample data (in a real app, this would come from your processed PDF)
      const data = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-01', 'Grocery Store', '50.00'],
        ['2024-01-02', 'Gas Station', '30.00'],
        ['2024-01-03', 'Restaurant', '25.00']
      ];

      // Convert data to CSV string
      const csvContent = data.map(row => row.join(',')).join('\n');
      
      // Create blob and download link
      const blob = new Blob([csvContent], { 
        type: format === 'csv' 
          ? 'text/csv;charset=utf-8;' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bank-statement.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Your bank statement has been successfully converted and downloaded as a ${format.toUpperCase()} file. You can find it in your downloads folder.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "We couldn't convert your bank statement. Please ensure you have a PDF uploaded and try again.",
        variant: "destructive",
      });
      console.error('Export error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-4 animate-fade-up">
        <h1 className="text-4xl font-medium tracking-tight">
          Bank Statement Converter
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transform your PDF bank statements into organized spreadsheets with just a few clicks
        </p>
      </div>

      <div className="space-y-8">
        <FileUpload />
        <ProcessingIndicator isProcessing={isProcessing} />
        <ExportOptions onExport={handleExport} isProcessing={isProcessing} />
      </div>
    </div>
  );
};

export default Index;