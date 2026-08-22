'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  error?: string | null;
  onErrorClear?: () => void;
}

export default function UploadZone({ onFileSelected, error, onErrorClear }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      setValidationError(error);
    }
  }, [error]);

  const validateAndSelectFile = (files: FileList | File[]) => {
    setValidationError(null);
    onErrorClear?.();

    if (!files || files.length === 0) return;

    if (files.length > 1) {
      setValidationError('One document at a time — drop a single PDF or image.');
      return;
    }

    const file = files[0];
    const name = file.name.toLowerCase();
    const type = file.type;

    const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
    const isPng = type === 'image/png' || name.endsWith('.png');
    const isJpg =
      type === 'image/jpeg' ||
      type === 'image/jpg' ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg');

    if (!isPdf && !isPng && !isJpg) {
      setValidationError("That file type isn't supported yet. Upload a PDF, PNG, or JPG.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setValidationError('That file is too large (max 20MB). Try a smaller file or a lower-resolution scan.');
      return;
    }

    if (file.size === 0) {
      setValidationError('This file is empty (0 bytes). Choose a valid document file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndSelectFile(e.target.files);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onChange={handleFileInputChange}
        className="hidden"
        id="file-upload-input"
      />

      {!selectedFile ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          aria-label="Upload PDF or image document"
          className={`relative min-h-[220px] md:min-h-[280px] rounded-md border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
            isDragOver
              ? 'border-accent bg-accent-tint scale-[1.005]'
              : 'border-border-strong bg-surface-sunken hover:bg-surface hover:border-accent/60'
          }`}
        >
          {/* Custom Document Glyph */}
          <div className={`w-12 h-12 rounded-sm bg-surface border border-border flex items-center justify-center mb-4 transition-transform ${isDragOver ? 'scale-110 text-accent' : 'text-text-muted'}`}>
            <svg
              className="w-6 h-6 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>

          <p className="font-sans font-semibold text-base md:text-lg text-text mb-1">
            <span className="hidden md:inline">
              {isDragOver ? 'Drop it here.' : 'Drop a PDF or image, or choose a file'}
            </span>
            <span className="inline md:hidden">
              {isDragOver ? 'Drop it here.' : 'Tap to choose a file'}
            </span>
          </p>

          <p className="font-mono text-xs text-text-muted">
            PDF, PNG, JPG or JPEG • 20MB max
          </p>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-surface border border-border rounded-md p-4 shadow-rest space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-sm bg-surface-sunken border border-border flex items-center justify-center shrink-0">
                {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-5 h-5 text-accent" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-sans font-medium text-sm text-text truncate">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-text-muted">
                    {formatFileSize(selectedFile.size)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-accent-tint text-accent">
                    Ready
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={removeFile}
              aria-label="Remove selected file"
              className="p-1.5 rounded-sm border border-border text-text-muted hover:text-error hover:bg-error-tint hover:border-error/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-11 md:h-11 px-5 bg-accent hover:bg-accent-hover active:scale-[0.98] text-white font-sans font-medium text-sm md:text-base rounded-md shadow-rest transition-all flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Summarize Document
          </button>
        </div>
      )}

      {/* Validation Error Message */}
      {validationError && (
        <div className="bg-error-tint border border-error/30 rounded-md p-3.5 flex items-start gap-3 text-error">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="font-sans text-sm font-normal leading-snug">
            {validationError}
          </p>
        </div>
      )}
    </div>
  );
}
