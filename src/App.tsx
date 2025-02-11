import { useState } from 'react';
import { Toaster } from "sonner";
import FileUpload from './components/FileUpload';
import FormatSelector from './components/FormatSelector';
import { OutputFormat } from './types/index';
import { uploadAndConvertFile, downloadFile } from './services/api';
import { Download, ArrowRight, Shield, Building2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('xlsx');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setDownloadUrl(null);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      const response = await uploadAndConvertFile(selectedFile, outputFormat);
      
      if (response.success && response.downloadUrl) {
        setDownloadUrl(response.downloadUrl);
      }
    } catch (error) {
      console.error('Conversion error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl || !selectedFile) return;

    try {
      const filename = `converted-statement.${outputFormat}`;
      await downloadFile(downloadUrl, filename);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container max-w-6xl mx-auto py-16 px-4">
        {/* Hero Section */}
        <div className="space-y-4 text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            The world's most trusted bank statement converter
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Easily convert PDF bank statements from 1000s of banks world wide into clean Excel (XLS) format.
          </p>
        </div>

        {/* Main Converter Card */}
        <Card className="max-w-3xl mx-auto mb-16 shadow-lg">
          <div className="p-8 space-y-8">
            <FileUpload 
              selectedFormat={outputFormat}
              onFormatChange={setOutputFormat}
            />

            <FormatSelector 
              format={outputFormat} 
              onFormatChange={setOutputFormat} 
            />

            <div className="space-y-4">
              <Button
                onClick={handleConvert}
                disabled={!selectedFile || isLoading}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  "Converting..."
                ) : (
                  <>
                    Click here to convert a PDF!
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {downloadUrl && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full h-12 text-lg"
                >
                  Download Converted File
                  <Download className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-emerald-100">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Secure</h3>
            <p className="text-gray-600">
              With years of experience in banking we comply with strict standards when handling your files.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-amber-100">
              <Building2 className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Institutional</h3>
            <p className="text-gray-600">
              We've provided our services to thousands of reputable financial, accounting and legal firms.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-rose-100">
              <Target className="h-8 w-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Accurate</h3>
            <p className="text-gray-600">
              We're continually improving our algorithms. If a file doesn't convert to your expectations, <a href="mailto:support@example.com" className="text-blue-600 hover:underline">email us</a> and we'll fix it.
            </p>
          </div>
        </div>
      </div>
      <Toaster />
    </main>
  );
}

export default App;
