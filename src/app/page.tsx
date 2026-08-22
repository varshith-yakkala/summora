'use client';

import React, { useState, useRef } from 'react';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ProcessingPipeline, { StageState } from '@/components/ProcessingPipeline';
import ResultsView from '@/components/ResultsView';
import ErrorCard from '@/components/ErrorCard';

type AppState = 'idle' | 'processing' | 'results' | 'error';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [stages, setStages] = useState<StageState[]>([
    { stage: 'uploading', status: 'pending' },
    { stage: 'extracting', status: 'pending' },
    { stage: 'ocr', status: 'skipped' },
    { stage: 'analyzing', status: 'pending' },
    { stage: 'summarizing', status: 'pending' },
  ]);
  const [currentStageName, setCurrentStageName] = useState<string>('uploading');
  const [resultData, setResultData] = useState<any>(null);
  const [errorData, setErrorData] = useState<{
    code: string;
    message: string;
    recoverable?: boolean;
    requestId?: string | null;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const resetAll = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAppState('idle');
    setResultData(null);
    setErrorData(null);
    setStages([
      { stage: 'uploading', status: 'pending' },
      { stage: 'extracting', status: 'pending' },
      { stage: 'ocr', status: 'skipped' },
      { stage: 'analyzing', status: 'pending' },
      { stage: 'summarizing', status: 'pending' },
    ]);
  };

  const handleAbort = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAppState('idle');
    setResultData(null);
    setErrorData(null);
    setStages([
      { stage: 'uploading', status: 'pending' },
      { stage: 'extracting', status: 'pending' },
      { stage: 'ocr', status: 'skipped' },
      { stage: 'analyzing', status: 'pending' },
      { stage: 'summarizing', status: 'pending' },
    ]);
  };

  const handleFileProcess = async (file: File) => {
    setAppState('processing');
    setErrorData(null);
    setResultData(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isImage = !isPdf;

    setStages([
      { stage: 'uploading', status: 'active', detail: 'Uploading document' },
      { stage: 'extracting', status: 'pending' },
      { stage: 'ocr', status: isImage ? 'pending' : 'skipped' },
      { stage: 'analyzing', status: 'pending' },
      { stage: 'summarizing', status: 'pending' },
    ]);

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
        const errJson = await response.json().catch(() => ({}));
        setAppState('error');
        setErrorData({
          code: errJson.code || 'HTTP_ERROR',
          message: errJson.message || `Server returned error status ${response.status}`,
          recoverable: false,
        });
        return;
      }

      if (!response.body) {
        throw new Error('No response stream available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep trailing incomplete block in buffer

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;

          let eventName = 'message';
          let dataStr = '';

          const lines = rawEvent.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.substring(5).trim();
            }
          }

          if (!dataStr) continue;
          let parsedData: any = null;
          try {
            parsedData = JSON.parse(dataStr);
          } catch (e) {
            continue;
          }

          if (eventName === 'stage') {
            const { stage, status, detail } = parsedData;
            setCurrentStageName(stage);
            setStages((prevStages) => {
              const updated = [...prevStages];
              const idx = updated.findIndex((s) => s.stage === stage);
              if (idx !== -1) {
                updated[idx] = { stage, status, detail };
              } else {
                updated.push({ stage, status, detail });
              }
              return updated;
            });
          } else if (eventName === 'complete') {
            setResultData(parsedData);
            setAppState('results');
          } else if (eventName === 'error') {
            setAppState('error');
            setErrorData({
              code: parsedData.code || 'UNKNOWN',
              message: parsedData.message || 'Something went wrong processing your document.',
              recoverable: parsedData.recoverable,
              requestId: parsedData.requestId,
            });
          }
        }
      }
    } catch (err: any) {
      // User deliberately cancelled — silently return to idle
      if (err.name === 'AbortError') return;
      setAppState('error');
      setErrorData({
        code: 'NETWORK',
        message: err.message || 'Upload interrupted — check your network connection.',
        recoverable: false,
      });
    }
  };

  const handleRetrySummary = async () => {
    if (!errorData?.requestId) return;

    setAppState('processing');
    setCurrentStageName('summarizing');
    setStages([
      { stage: 'uploading', status: 'done', detail: 'Upload completed' },
      { stage: 'extracting', status: 'done', detail: 'Text extracted from session' },
      { stage: 'analyzing', status: 'done', detail: 'Analysis complete' },
      { stage: 'summarizing', status: 'active', detail: 'Retrying AI summarization' },
    ]);

    try {
      const res = await fetch('/api/process/retry-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: errorData.requestId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAppState('error');
        setErrorData({
          code: data.code || 'RETRY_FAILED',
          message: data.message || 'Summary retry failed.',
          recoverable: data.recoverable,
          requestId: data.requestId || errorData.requestId,
        });
        return;
      }

      setResultData(data);
      setAppState('results');
    } catch (err: any) {
      setAppState('error');
      setErrorData({
        code: 'NETWORK',
        message: err.message || 'Network error during retry.',
        recoverable: true,
        requestId: errorData.requestId,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Header />

      <main className="flex-1 py-8 md:py-12 px-4 md:px-8 flex flex-col justify-start items-center">
        {appState === 'idle' && (
          <div className="w-full max-w-4xl mx-auto space-y-8 text-center my-auto py-6">
            <div className="space-y-3 max-w-xl mx-auto">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold px-3 py-1 rounded-full bg-accent-tint border border-accent/20">
                Ink & Signal
              </span>
              <h1 className="font-sans font-semibold text-3xl md:text-5xl text-text tracking-tight leading-tight">
                Summora
              </h1>
              <p className="font-sans text-base md:text-lg text-text-muted leading-relaxed">
                A calm, editorial reading instrument. Upload a PDF or image to extract grounded summaries, key points, and structural suggestions.
              </p>
            </div>

            <UploadZone onFileSelected={handleFileProcess} />
          </div>
        )}

        {appState === 'processing' && (
          <div className="w-full my-auto py-8">
            <ProcessingPipeline stages={stages} currentStage={currentStageName} onAbort={handleAbort} />
          </div>
        )}

        {appState === 'results' && resultData && (
          <ResultsView result={resultData} onReset={resetAll} />
        )}

        {appState === 'error' && errorData && (
          <div className="w-full my-auto py-8">
            <ErrorCard
              code={errorData.code}
              message={errorData.message}
              recoverable={errorData.recoverable}
              requestId={errorData.requestId}
              onRetrySummary={handleRetrySummary}
              onReset={resetAll}
            />
          </div>
        )}
      </main>
    </div>
  );
}
