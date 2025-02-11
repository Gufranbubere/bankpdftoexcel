import axios, { AxiosError } from 'axios';
import { FileUploadResponse } from '../types';
import { toast } from 'sonner';

// Use relative URL for development with Vite proxy
const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  }
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  (error: AxiosError) => {
    console.error('Response error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      toast.error('Cannot connect to server. Please ensure the server is running.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found. Please try again.');
    } else if (error.response?.status === 500) {
      const errorMessage = (error.response.data as { message?: string })?.message || 'Server error. Please try again later.';
      toast.error(errorMessage);
    } else {
      toast.error('An error occurred. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

export const testConnection = async () => {
  try {
    const { data } = await api.get('/test');
    console.log('Server connection test:', data);
    return true;
  } catch (error) {
    console.error('Server connection failed:', error);
    return false;
  }
};

export const uploadAndConvertFile = async (
  file: File, 
  outputFormat: 'xlsx' | 'csv'
): Promise<FileUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', outputFormat);

    console.log('Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      outputFormat
    });

    const { data } = await api.post<FileUploadResponse>(
      '/convert',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        maxContentLength: 10 * 1024 * 1024, // 10MB
        timeout: 60000 // 60 seconds for file upload
      }
    );
    
    if (data.success) {
      toast.success('File converted successfully!');
    }
    
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message: string }>;
      console.error('Detailed error:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers
      });
      
      const errorMessage = axiosError.response?.data?.message || 
        axiosError.message || 
        'Failed to upload file';
      
      toast.error(errorMessage);
    } else {
      toast.error('An unexpected error occurred');
    }
    throw error;
  }
};

export const downloadFile = async (url: string, filename: string): Promise<void> => {
  try {
    console.log('Starting file download:', { url, filename });

    const response = await api.get(url, {
      responseType: 'blob',
      timeout: 60000, // 60 seconds for downloads
      headers: {
        'Accept': '*/*'
      }
    });

    console.log('Download response received:', {
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      status: response.status
    });

    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty file');
    }

    const blob = new Blob([response.data], {
      type: filename.endsWith('.xlsx') 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
    });

    // Create and trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    toast.success('File downloaded successfully!');
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}; 