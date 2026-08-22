'use client';

import React, { useEffect, useCallback } from 'react';

export type SummaryLength = 'short' | 'medium' | 'long';

interface LengthSelectorProps {
  currentLength: SummaryLength;
  onChangeLength: (length: SummaryLength) => void;
}

export default function LengthSelector({ currentLength, onChangeLength }: LengthSelectorProps) {
  const options: { id: SummaryLength; label: string; shortcut: string }[] = [
    { id: 'short', label: 'Short', shortcut: 'S' },
    { id: 'medium', label: 'Medium', shortcut: 'M' },
    { id: 'long', label: 'Long', shortcut: 'L' },
  ];

  // Global keyboard shortcut: S / M / L
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 's' || e.key === 'S') onChangeLength('short');
    else if (e.key === 'm' || e.key === 'M') onChangeLength('medium');
    else if (e.key === 'l' || e.key === 'L') onChangeLength('long');
  }, [onChangeLength]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = options.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    onChangeLength(options[nextIndex].id);
    const tabEl = document.getElementById(`tab-${options[nextIndex].id}`);
    tabEl?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Summary length selector (keyboard: S, M, L)"
      className="inline-flex w-full md:w-auto bg-surface-sunken border border-border rounded-full p-1 shadow-rest"
    >
      {options.map((option, index) => {
        const isSelected = currentLength === option.id;

        return (
          <button
            key={option.id}
            id={`tab-${option.id}`}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`summary-panel-${option.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChangeLength(option.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            title={`${option.label} summary (keyboard: ${option.shortcut})`}
            className={`flex-1 md:flex-initial px-5 py-1.5 rounded-full font-mono text-xs font-medium uppercase tracking-wider transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
              isSelected
                ? 'bg-surface text-accent shadow-rest font-semibold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
