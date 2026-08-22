'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Upload, Key } from 'lucide-react';

interface ErrorCardProps {
  code: string;
  message: string;
  recoverable?: boolean;
  requestId?: string | null;
  onRetrySummary?: () => void;
  onReset?: () => void;
}

export default function ErrorCard({
  code,
  message,
  recoverable,
  onRetrySummary,
  onReset,
}: ErrorCardProps) {
  const isRetryable = recoverable && !!onRetrySummary;

  return (
    <div
      role="alert"
      className="w-full max-w-xl mx-auto bg-surface border border-error/40 rounded-md p-6 shadow-rest space-y-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-sm bg-error-tint text-error shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="font-sans font-semibold text-lg text-text">
            {code === 'SETUP_REQUIRED' ? 'Setup Configuration Required' : 'Processing Error'}
          </h2>
          <p className="font-sans text-sm text-text-muted leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        {isRetryable && (
          <button
            onClick={onRetrySummary}
            className="h-10 px-4 bg-accent hover:bg-accent-hover text-white font-sans font-medium text-sm rounded-md shadow-rest transition-colors flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Summary
          </button>
        )}

        {onReset && (
          <button
            onClick={onReset}
            className={`h-10 px-4 border border-border text-text hover:bg-surface-sunken font-sans font-medium text-sm rounded-md transition-colors flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-accent ${
              !isRetryable ? 'bg-accent hover:bg-accent-hover text-white border-transparent' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            {code === 'UNSUPPORTED_TYPE' || code === 'FILE_TOO_LARGE'
              ? 'Choose Another File'
              : 'Try Another Document'}
          </button>
        )}
      </div>
    </div>
  );
}
