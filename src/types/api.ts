export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
} 