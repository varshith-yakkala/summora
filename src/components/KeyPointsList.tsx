'use client';

import React from 'react';

interface KeyPoint {
  point: string;
  why_it_matters: string | null;
  citation?: string | null;
}

interface KeyPointsListProps {
  keyPoints: KeyPoint[];
}

export default function KeyPointsList({ keyPoints }: KeyPointsListProps) {
  if (!keyPoints || keyPoints.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="key-points-heading" className="space-y-6">
      <div className="border-b border-border pb-3">
        <h2 id="key-points-heading" className="font-sans font-semibold text-xl md:text-2xl text-text tracking-tight">
          Key Points & Main Ideas
        </h2>
        <p className="font-sans text-sm text-text-muted mt-1">
          Grounded takeaways extracted directly from source content
        </p>
      </div>

      <div className="divide-y divide-border">
        {keyPoints.map((kp, idx) => {
          const num = (idx + 1).toString().padStart(2, '0');

          return (
            <div key={idx} className="py-5 first:pt-0 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 items-start">
              <div className="md:col-span-1 font-mono text-sm font-semibold text-accent tracking-wider">
                {num}
              </div>

              <div className="md:col-span-11 space-y-2 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-sans font-medium text-base text-text leading-snug flex-1">
                    {kp.point}
                  </p>
                  {kp.citation && (
                    <span className="shrink-0 px-2 py-0.5 rounded-sm bg-surface-sunken border border-border font-mono text-xs text-text-muted font-normal whitespace-nowrap">
                      {kp.citation}
                    </span>
                  )}
                </div>

                {kp.why_it_matters && (
                  <p className="font-sans text-sm text-text-muted leading-relaxed">
                    <span className="font-mono text-xs uppercase tracking-wider text-text-faint mr-1.5 font-medium">Why it matters —</span>
                    {kp.why_it_matters}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
