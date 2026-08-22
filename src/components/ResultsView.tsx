'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import LengthSelector, { SummaryLength } from './LengthSelector';
import KeyPointsList from './KeyPointsList';
import SuggestionsPanel from './SuggestionsPanel';
import { SummaryResult } from '@/lib/ai';
import { RotateCcw, FileText, Image as ImageIcon, Sparkles, Layers, Copy, Check, Download, BookOpen, Clock } from 'lucide-react';

interface ResultsViewProps {
  result: SummaryResult & {
    filename: string;
    fileType: string;
  };
  onReset: () => void;
}

const READING_LEVEL_COLORS: Record<string, string> = {
  General: 'bg-surface-sunken border-border text-text-muted',
  Technical: 'bg-accent-tint border-accent/20 text-accent',
  Academic: 'bg-accent-tint border-accent/20 text-accent',
  Legal: 'bg-[#FEF3C7] border-[#D97706]/20 text-[#92400E] dark:bg-[#292013] dark:border-[#D97706]/20 dark:text-[#D97706]',
  Medical: 'bg-[#EEF2FF] border-[#6366F1]/20 text-[#4338CA] dark:bg-[#1E1B4B] dark:border-[#6366F1]/20 dark:text-[#818CF8]',
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export default function ResultsView({ result, onReset }: ResultsViewProps) {
  const [length, setLength] = useState<SummaryLength>('medium');
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const prevLength = useRef<SummaryLength>('medium');

  // Crossfade: fade out → swap text → fade in
  const handleLengthChange = useCallback((newLength: SummaryLength) => {
    if (newLength === prevLength.current) return;
    setSummaryVisible(false);
    setTimeout(() => {
      setLength(newLength);
      prevLength.current = newLength;
      setSummaryVisible(true);
    }, 150);
  }, []);

  const { summary, key_points, improvement_suggestions, meta, filename, reading_level } = result;

  const title = filename.replace(/\.[^/.]+$/, '');

  const getExtractionMethodLabel = (method: string) => {
    switch (method) {
      case 'native_pdf': return 'Native PDF text';
      case 'ocr_image': return 'OCR (Image)';
      case 'ocr_scanned_pdf': return 'OCR fallback — scanned PDF';
      default: return method;
    }
  };

  const currentSummaryText = summary[length] || summary.medium;
  const summaryWordCount = countWords(currentSummaryText);
  const readingTime = readingTimeMinutes(summaryWordCount);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentSummaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard API may be unavailable */ }
  }, [currentSummaryText]);

  // Export as Markdown
  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push(`\n_Processed by Summora · ${new Date().toLocaleDateString()}_\n`);
    lines.push(`---\n`);
    lines.push(`## Summary\n`);
    lines.push(`### Short\n${summary.short}\n`);
    lines.push(`### Medium\n${summary.medium}\n`);
    lines.push(`### Long\n${summary.long}\n`);
    lines.push(`---\n`);
    lines.push(`## Key Points\n`);
    key_points.forEach((kp, i) => {
      lines.push(`${i + 1}. **${kp.point}**${kp.citation ? ` _(${kp.citation})_` : ''}`);
      if (kp.why_it_matters) lines.push(`   > ${kp.why_it_matters}`);
    });
    lines.push(`\n---\n`);
    if (improvement_suggestions.length > 0) {
      lines.push(`## Improvement Suggestions\n`);
      improvement_suggestions.forEach((s, i) => {
        lines.push(`${i + 1}. **${s.headline}**${s.citation ? ` _(${s.citation})_` : ''}`);
        lines.push(`   ${s.explanation}`);
      });
    }
    lines.push(`\n---\n`);
    lines.push(`_Extraction: ${getExtractionMethodLabel(meta.extraction_method)} · ${meta.word_count.toLocaleString()} words · ${meta.page_count ? `${meta.page_count} pages · ` : ''}${reading_level ? `Level: ${reading_level}` : ''}_`);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}-summora.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }, [title, summary, key_points, improvement_suggestions, meta, reading_level]);

  const MetaRail = () => (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex justify-between items-center text-text-muted">
        <span>Extraction</span>
        <span className="text-text font-medium text-right max-w-[55%]">{getExtractionMethodLabel(meta.extraction_method)}</span>
      </div>
      {meta.page_count && (
        <div className="flex justify-between items-center text-text-muted">
          <span>Pages</span>
          <span className="text-text font-medium">{meta.page_count}</span>
        </div>
      )}
      <div className="flex justify-between items-center text-text-muted">
        <span>Word Count</span>
        <span className="text-text font-medium">{meta.word_count.toLocaleString()}</span>
      </div>
      {meta.ocr_confidence !== null && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-text-muted">
            <span>OCR Confidence</span>
            <span className="text-accent font-medium">{meta.ocr_confidence}%</span>
          </div>
          {/* OCR Confidence Bar */}
          <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${meta.ocr_confidence}%` }}
            />
          </div>
        </div>
      )}
      {meta.hierarchical_summary_used && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-accent">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-sans font-medium text-xs">Long document sections</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Mobile & Tablet Metadata Header */}
      <div className="block lg:hidden bg-surface border border-border rounded-md p-5 shadow-rest space-y-4 animate-fade-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans font-semibold text-xl md:text-2xl text-text leading-tight">{title}</h1>
            <p className="font-mono text-xs text-text-muted mt-1 truncate">{filename}</p>
          </div>
          <button
            onClick={onReset}
            className="h-9 px-3 border border-border hover:bg-surface-sunken font-sans font-medium text-xs rounded-md transition-colors shrink-0 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Summarize another
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="shrink-0 px-2.5 py-1 rounded-sm bg-surface-sunken border border-border font-mono text-xs text-text-muted">
            {getExtractionMethodLabel(meta.extraction_method)}
          </span>
          {meta.page_count && (
            <span className="shrink-0 px-2.5 py-1 rounded-sm bg-surface-sunken border border-border font-mono text-xs text-text-muted">
              {meta.page_count} {meta.page_count === 1 ? 'page' : 'pages'}
            </span>
          )}
          <span className="shrink-0 px-2.5 py-1 rounded-sm bg-surface-sunken border border-border font-mono text-xs text-text-muted">
            {meta.word_count.toLocaleString()} words
          </span>
          {meta.ocr_confidence !== null && (
            <span className="shrink-0 px-2.5 py-1 rounded-sm bg-surface-sunken border border-border font-mono text-xs text-accent">
              OCR {meta.ocr_confidence}% confidence
            </span>
          )}
          {reading_level && (
            <span className={`shrink-0 px-2.5 py-1 rounded-sm border font-mono text-xs ${READING_LEVEL_COLORS[reading_level] ?? 'bg-surface-sunken border-border text-text-muted'}`}>
              {reading_level}
            </span>
          )}
          {meta.hierarchical_summary_used && (
            <span className="shrink-0 px-2.5 py-1 rounded-sm bg-accent-tint border border-accent/20 font-mono text-xs text-accent">
              Hierarchical summary
            </span>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Document Rail */}
        <aside aria-label="Document Metadata" className="hidden lg:block lg:col-span-3 sticky top-24 space-y-4 animate-fade-slide-up">
          <div className="bg-surface border border-border rounded-md p-5 shadow-rest space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-accent mb-2">
                {filename.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                  Document Info
                </span>
              </div>
              <h1 className="font-sans font-semibold text-lg text-text leading-snug break-words">{title}</h1>
              <p className="font-mono text-xs text-text-muted truncate">{filename}</p>
            </div>

            {/* Reading Level Badge */}
            {reading_level && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                <span className={`px-2 py-0.5 rounded-sm border font-mono text-xs ${READING_LEVEL_COLORS[reading_level] ?? 'bg-surface-sunken border-border text-text-muted'}`}>
                  {reading_level}
                </span>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <MetaRail />
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <button
                onClick={handleExport}
                className="w-full h-9 px-4 border border-border hover:bg-surface-sunken text-text font-sans font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {exported ? <Check className="w-3.5 h-3.5 text-success" /> : <Download className="w-3.5 h-3.5" />}
                {exported ? 'Exported!' : 'Export as Markdown'}
              </button>
              <button
                onClick={onReset}
                className="w-full h-9 px-4 border border-border hover:bg-surface-sunken text-text font-sans font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Summarize another
              </button>
            </div>
          </div>
        </aside>

        {/* Right Dominant Reading Column */}
        <main className="lg:col-span-9 space-y-12 min-w-0">
          {/* Section 1: Summary Panel */}
          <section
            aria-labelledby="summary-heading"
            className="bg-surface border border-border rounded-lg p-6 md:p-8 shadow-raised space-y-6 animate-fade-slide-up"
            style={{ animationDelay: '0ms' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                    Grounded Summary
                  </span>
                </div>
                <h2 id="summary-heading" className="font-sans font-semibold text-xl md:text-2xl text-text">
                  Executive Overview
                </h2>
              </div>
              <LengthSelector currentLength={length} onChangeLength={handleLengthChange} />
            </div>

            {/* Word count & reading time */}
            <div className="flex items-center gap-3 text-text-faint font-mono text-xs">
              <span>{summaryWordCount} words</span>
              <span className="text-border-strong">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{readingTime} min read
              </span>
            </div>

            {/* Summary Text */}
            <div
              id={`summary-panel-${length}`}
              role="tabpanel"
              aria-labelledby={`tab-${length}`}
              className="max-w-[68ch] space-y-4"
              style={{
                opacity: summaryVisible ? 1 : 0,
                transition: 'opacity 150ms ease',
              }}
            >
              {currentSummaryText.split('\n\n').map((paragraph, pIdx) => (
                <p
                  key={pIdx}
                  className="font-sans text-base md:text-lg leading-[1.65] text-text font-normal selection:bg-accent-tint selection:text-accent"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Copy Button */}
            <div className="pt-2 border-t border-border flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-text-faint">
                Press <kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-muted font-mono text-[10px]">S</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-muted font-mono text-[10px]">M</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-muted font-mono text-[10px]">L</kbd>{' '}
                to switch length
              </p>
              <button
                onClick={handleCopy}
                className="h-8 px-3 border border-border hover:bg-surface-sunken font-sans font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent shrink-0"
                aria-label="Copy summary to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </section>

          {/* Section 2: Key Points */}
          <div className="animate-fade-slide-up" style={{ animationDelay: '80ms' }}>
            <KeyPointsList keyPoints={key_points} />
          </div>

          {/* Section 3: Improvement Suggestions */}
          <div className="animate-fade-slide-up" style={{ animationDelay: '160ms' }}>
            <SuggestionsPanel suggestions={improvement_suggestions} />
          </div>

          {/* Mobile Export & Reset */}
          <div className="block lg:hidden border-t border-border pt-6 flex flex-col sm:flex-row gap-3 animate-fade-slide-up" style={{ animationDelay: '240ms' }}>
            <button
              onClick={handleExport}
              className="flex-1 h-10 px-4 border border-border hover:bg-surface-sunken text-text font-sans font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {exported ? <Check className="w-3.5 h-3.5 text-success" /> : <Download className="w-3.5 h-3.5" />}
              {exported ? 'Exported!' : 'Export as Markdown'}
            </button>
            <button
              onClick={onReset}
              className="flex-1 h-10 px-4 border border-border hover:bg-surface-sunken text-text font-sans font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Summarize another
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
