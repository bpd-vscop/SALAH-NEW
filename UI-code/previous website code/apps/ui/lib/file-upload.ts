// filepath: packages/ui/lib/file-upload.ts
// File upload utilities for VTA documents and other file handling

export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export class FileUploadService {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  /**
   * Validate file before upload
   */
  static validateFile(file: File, options: FileUploadOptions = {}): { isValid: boolean; error?: string } {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
    const allowedTypes = options.allowedTypes || this.DEFAULT_ALLOWED_TYPES;

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${this.formatFileSize(maxSize)} limit`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Upload file to server (mock implementation)
   */
  static async uploadFile(
    file: File,
    endpoint: string = '/api/upload',
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    // Validate file first
    const validation = this.validateFile(file, options);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options.onProgress) {
          const progress = (event.loaded / event.total) * 100;
          options.onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              id: response.id || this.generateId(),
              fileName: response.fileName || file.name,
              originalName: file.name,
              fileUrl: response.fileUrl || URL.createObjectURL(file),
              fileSize: file.size,
              mimeType: file.type,
              uploadedAt: new Date()
            });
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        const error = 'Upload failed due to network error';
        if (options.onError) {
          options.onError(error);
        }
        reject(new Error(error));
      });

      xhr.open('POST', endpoint);
      xhr.send(formData);
    });
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: FileList | File[],
    endpoint: string = '/api/upload',
    options: FileUploadOptions = {}
  ): Promise<UploadedFile[]> {
    const fileArray = Array.from(files);
    const uploadPromises = fileArray.map(file => this.uploadFile(file, endpoint, options));
    
    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Failed to upload files: ${error}`);
    }
  }

  /**
   * Delete uploaded file
   */
  static async deleteFile(fileId: string, endpoint: string = '/api/upload'): Promise<void> {
    const response = await fetch(`${endpoint}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }

  /**
   * Check if file is an image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   */
  static isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  /**
   * Generate unique file ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Create file preview URL
   */
  static createPreviewUrl(file: File): string {
    if (this.isImage(file.type)) {
      return URL.createObjectURL(file);
    }
    return '';
  }

  /**
   * Revoke preview URL to free memory
   */
  static revokePreviewUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

// VTA Document specific upload configuration
export const VTA_UPLOAD_CONFIG: FileUploadOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],
  multiple: true
};

// Document type mappings for VTA verification
export const VTA_DOCUMENT_TYPES = {
  BUSINESS_LICENSE: 'Business License',
  LOCKSMITH_LICENSE: 'Locksmith License',
  TAX_CERTIFICATE: 'Tax Registration Certificate',
  INSURANCE_PROOF: 'Liability Insurance Proof',
  STATE_REGISTRATION: 'State Business Registration',
  OTHER: 'Other Supporting Documents'
} as const;

export type VtaDocumentType = keyof typeof VTA_DOCUMENT_TYPES;