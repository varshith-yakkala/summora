'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Suggestion {
  headline: string;
  explanation: string;
  citation?: string | null;
}

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
}

export default function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <section aria-labelledby="suggestions-heading" className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 id="suggestions-heading" className="font-sans font-semibold text-xl md:text-2xl text-text tracking-tight">
          Improvement Suggestions
        </h2>
        <p className="font-sans text-sm text-text-muted mt-1">
          Analysis of document structure, clarity, and completeness
        </p>
      </div>

      <div className="bg-surface border border-border rounded-md p-6 shadow-rest">
        {!hasSuggestions ? (
          <div className="flex items-start gap-3.5 text-success">
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-sans font-semibold text-base text-text">
                No structural gaps detected
              </p>
              <p className="font-sans text-sm text-text-muted mt-1 leading-relaxed">
                This document is clearly organized and includes expected context and details without obvious ambiguities.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-border">
            {suggestions.map((item, idx) => (
              <div key={idx} className="first:pt-0 pt-5 space-y-1.5 flex items-start gap-3.5">
                <div className="mt-1 text-warning shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-sans font-semibold text-base text-text">
                      {item.headline}
                    </h3>
                    {item.citation && (
                      <span className="shrink-0 px-2 py-0.5 rounded-sm bg-surface-sunken border border-border font-mono text-[11px] text-text-muted">
                        {item.citation}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-sm text-text-muted leading-relaxed">
                    {item.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
