'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

export interface StageState {
  stage: 'uploading' | 'extracting' | 'ocr' | 'analyzing' | 'summarizing';
  status: 'pending' | 'active' | 'done' | 'error' | 'skipped';
  detail?: string;
}

interface ProcessingPipelineProps {
  stages: StageState[];
  currentStage: string;
  onAbort?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  uploading: 'Uploading Document',
  extracting: 'Extracting Content',
  ocr: 'Running OCR',
  analyzing: 'Analyzing Structure',
  summarizing: 'Generating Summaries',
};

// Percentage weight each stage contributes when done
const STAGE_WEIGHTS: Record<string, number> = {
  uploading: 10,
  extracting: 30,
  ocr: 15,
  analyzing: 15,
  summarizing: 30,
};

function calcProgress(stages: StageState[]): number {
  let total = 0;
  let earned = 0;

  for (const s of stages) {
    if (s.status === 'skipped') continue;
    const w = STAGE_WEIGHTS[s.stage] ?? 10;
    total += w;
    if (s.status === 'done') {
      earned += w;
    } else if (s.status === 'active') {
      earned += w * 0.4; // Show partial progress for active stage
    }
  }

  if (total === 0) return 0;
  return Math.min(99, Math.round((earned / total) * 100));
}

export default function ProcessingPipeline({ stages, currentStage, onAbort }: ProcessingPipelineProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const targetProgress = calcProgress(stages);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Smooth progress bar animation — eases toward target
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= targetProgress) return prev;
        const step = Math.max(1, Math.ceil((targetProgress - prev) / 6));
        return Math.min(targetProgress, prev + step);
      });
    }, 60);
    return () => clearInterval(id);
  }, [targetProgress]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const visibleStages = stages.filter((s) => s.status !== 'skipped');

  return (
    <div className="w-full max-w-xl mx-auto bg-surface border border-border rounded-md p-6 shadow-rest space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="font-sans font-semibold text-lg text-text">Processing Document</h2>
          <p className="font-sans text-sm text-text-muted mt-0.5">Running document intelligence pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs text-text-muted bg-surface-sunken border border-border px-2.5 py-1 rounded-full">
            {formatTimer(elapsedSeconds)}
          </div>
          {onAbort && (
            <button
              onClick={onAbort}
              aria-label="Cancel processing"
              title="Cancel"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-border text-text-muted hover:text-error hover:bg-error-tint hover:border-error/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar + percentage */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono text-xs text-text-muted">
          <span>Progress</span>
          <span className="text-accent font-semibold tabular-nums">{displayProgress}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-none"
            style={{ width: `${displayProgress}%`, transition: 'width 60ms linear' }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-4">
        {visibleStages.map((s) => {
          const isActive = s.status === 'active';
          const isDone = s.status === 'done';
          const isError = s.status === 'error';

          return (
            <div key={s.stage} className="flex items-start gap-3.5">
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                ) : isActive ? (
                  <div className="w-5 h-5 rounded-full bg-accent-tint text-accent flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : isError ? (
                  <div className="w-5 h-5 rounded-full bg-error text-white flex items-center justify-center font-mono text-xs font-bold">
                    !
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border-strong bg-transparent" />
                )}
              </div>

              <div className="space-y-0.5">
                <p
                  className={`font-sans font-medium text-sm transition-colors ${
                    isActive
                      ? 'text-accent font-semibold'
                      : isDone
                      ? 'text-text'
                      : 'text-text-muted'
                  }`}
                >
                  {STAGE_LABELS[s.stage] || s.stage}
                </p>

                {(isActive || isDone || isError) && s.detail && (
                  <p className="font-mono text-xs text-text-muted">{s.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
