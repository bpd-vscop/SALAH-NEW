// filepath: packages/ui/components/file-upload/VtaDocumentUpload.tsx
// VTA Document Upload Component with drag & drop support

"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { FileUploadService, UploadedFile, VTA_UPLOAD_CONFIG, VTA_DOCUMENT_TYPES, VtaDocumentType } from '../../lib/file-upload';

interface VtaDocumentUploadProps {
  documentType: VtaDocumentType;
  onUploadComplete: (files: UploadedFile[]) => void;
  onUploadError: (error: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  existingFiles?: UploadedFile[];
}

interface FileWithProgress extends File {
  id: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export function VtaDocumentUpload({
  documentType,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  disabled = false,
  existingFiles = []
}: VtaDocumentUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypeName = VTA_DOCUMENT_TYPES[documentType];

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    const newFiles: FileWithProgress[] = [];
    const totalFiles = files.length + existingFiles.length + selectedFiles.length;

    if (totalFiles > maxFiles) {
      onUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    Array.from(selectedFiles).forEach((file) => {
      const validation = FileUploadService.validateFile(file, VTA_UPLOAD_CONFIG);
      
      if (!validation.isValid) {
        onUploadError(validation.error || 'Invalid file');
        return;
      }

      newFiles.push({
        ...file,
        id: Date.now().toString() + Math.random().toString(36),
        progress: 0,
        status: 'uploading'
      });
    });

    setFiles(prev => [...prev, ...newFiles]);
    uploadFiles(newFiles);
  }, [files, existingFiles, maxFiles, disabled, onUploadError]);

  const uploadFiles = async (filesToUpload: FileWithProgress[]) => {
    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    for (const file of filesToUpload) {
      try {
        const uploadedFile = await FileUploadService.uploadFile(file, '/api/vta/upload', {
          ...VTA_UPLOAD_CONFIG,
          onProgress: (progress) => {
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, progress } : f
            ));
          }
        });

        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'completed', uploadedFile }
            : f
        ));

        uploadedFiles.push(uploadedFile);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'error', error: errorMessage }
            : f
        ));

        onUploadError(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }

    setIsUploading(false);
    
    if (uploadedFiles.length > 0) {
      onUploadComplete(uploadedFiles);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeExistingFile = async (file: UploadedFile) => {
    try {
      await FileUploadService.deleteFile(file.id);
      // Notify parent component to update existing files
      onUploadComplete(existingFiles.filter(f => f.id !== file.id));
    } catch (error) {
      onUploadError('Failed to delete file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getFileIcon = (file: File | UploadedFile) => {
    const mimeType = 'type' in file ? file.type : file.mimeType;
    
    if (FileUploadService.isImage(mimeType)) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const canUploadMore = files.length + existingFiles.length < maxFiles;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{documentTypeName}</h3>
        <span className="text-sm text-gray-500">
          {files.length + existingFiles.length}/{maxFiles} files
        </span>
      </div>

      {/* Upload Area */}
      {canUploadMore && (
        <Card 
          className={`border-2 border-dashed transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : disabled 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <CardContent 
            className="p-6 text-center cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${
              disabled ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <p className={`text-sm ${
              disabled ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {disabled 
                ? 'Upload disabled'
                : isDragOver 
                ? 'Drop files here'
                : 'Drag & drop files here or click to browse'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, JPG, PNG up to {FileUploadService.formatFileSize(VTA_UPLOAD_CONFIG.maxSize!)}
            </p>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={VTA_UPLOAD_CONFIG.allowedTypes?.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
          {existingFiles.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium">{file.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {FileUploadService.formatFileSize(file.fileSize)} • 
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExistingFile(file)}
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Uploading Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploading Files</h4>
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {FileUploadService.formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-2" />
                )}
                
                {file.status === 'error' && file.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{file.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Status */}
      {isUploading && (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>
            Uploading files... Please wait.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}