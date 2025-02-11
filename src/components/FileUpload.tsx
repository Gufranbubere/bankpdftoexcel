import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TransactionPreview from './TransactionPreview';
import { PreviewResponse } from '@/types';

interface FileUploadProps {
  selectedFormat: string;
  onFormatChange: (format: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ selectedFormat }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setError(null);
        handleUpload(acceptedFiles[0]);
      }
    }
  });

  const handleUpload = async (uploadFile: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('format', selectedFormat);

      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Upload failed: ${response.statusText}`;
        } catch {
          errorMessage = `Upload failed: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: PreviewResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Preview generation failed');
      }

      if (!data.data?.transactions?.length) {
        throw new Error('No transactions found in the PDF. Please check if this is a valid bank statement.');
      }
      
      setPreviewData(data);
      setUploadProgress(100);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
      setPreviewData(null);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDownload = async () => {
    if (!previewData?.downloadUrl) return;

    try {
      const response = await fetch(`/api${previewData.downloadUrl}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_statement.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset state after successful download
      setFile(null);
      setPreviewData(null);
      setUploadProgress(0);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewData(null);
    setUploadProgress(0);
    setError(null);
  };

  if (previewData?.data) {
    return (
      <div className="space-y-6">
        <Card className="w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Selected File</h2>
            <span className="text-sm text-gray-500">{file?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Output Format: <span className="font-medium">{selectedFormat.toUpperCase()}</span>
            </span>
            <span className="text-sm text-gray-600">
              Size: <span className="font-medium">{((file?.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
            </span>
          </div>
        </Card>

        <TransactionPreview
          transactions={previewData.data.transactions}
          onConfirm={handleConfirmDownload}
          onCancel={handleCancel}
          metadata={previewData.data.metadata}
        />
      </div>
    );
  }

  return (
    <Card className="w-full p-6 space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <FileUp className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? "Drop the PDF file here"
            : "Drag and drop a PDF bank statement here, or click to select"}
        </p>
        <p className="text-xs text-gray-500 mt-1">Only PDF files are accepted</p>
      </div>

      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{file.name}</span>
            <span className="text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500 text-center">Processing your bank statement...</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {uploadProgress === 100 && !error && !previewData && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="ml-2">File uploaded successfully! Processing...</AlertDescription>
        </Alert>
      )}
    </Card>
  );
};

export default FileUpload;