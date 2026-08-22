# DESIGN.md — Summora Visual System

Identity:
Ink & Signal

Design direction:
A calm, editorial, technically credible document-intelligence utility that accepts a PDF or image and returns grounded Short, Medium, and Long summaries, Key Points, and Improvement Suggestions.

---

## 1. DESIGN TOKENS

### LIGHT MODE
--color-bg:            #FAFAF9
--color-surface:       #FFFFFF
--color-surface-sunken:#F1F1EF
--color-border:        #E4E4E1
--color-border-strong: #D4D4D0
--color-text:          #16181A
--color-text-muted:    #6B6E70
--color-text-faint:    #9A9C9E
--color-accent:        #0E7A5F
--color-accent-hover:  #0B6A52
--color-accent-tint:   #E7F3EF
--color-success:       #1C8C5B
--color-warning:       #B7791F
--color-error:         #C0362C
--color-error-tint:    #FBEBE9

### DARK MODE
--color-bg:            #0E0F10
--color-surface:       #17181A
--color-surface-sunken:#1F2022
--color-border:        #2A2C2E
--color-border-strong: #38393C
--color-text:          #F2F2F0
--color-text-muted:    #A6A8AA
--color-text-faint:    #707274
--color-accent:        #2FBF8F
--color-accent-hover:  #3FD19E
--color-accent-tint:   #123A2E
--color-success:       #2FBF8F
--color-warning:       #D9A441
--color-error:         #E5675C
--color-error-tint:    #3A1A17

### Theme Behavior
- Respect `prefers-color-scheme` on first load
- User override via ThemeToggle persisted in `localStorage` (`ink_signal_theme`)
- Single root theme class/attribute on `<html>` (`dark` or `light`)
- No mixed-theme rendering or section inversion

---

## 2. TYPOGRAPHY

- Primary font: Geist (fallback: ui-sans-serif, system-ui, sans-serif)
- Metadata font: Geist Mono (fallback: ui-monospace, monospace)

### Hierarchy (Desktop)
- Display: 3rem / 1.05 / -0.02em / 600
- H1: 2rem / 1.15 / -0.015em / 600
- H2: 1.375rem / 1.25 / -0.01em / 600
- H3: 1.0625rem / 1.35 / 600
- Body: 1.0625rem / 1.65 / 400
- Body small: 0.9375rem / 1.55 / 400
- Label: 0.8125rem / 1.3 / 500 / uppercase / letter-spacing 0.04em
- Metadata: 0.8125rem / 1.4 / 400 (Geist Mono)

### Hierarchy (Mobile)
- Display: 2.25rem
- H1: 1.625rem
- H2: 1.1875rem
- Body text never shrunk below 16px (1rem) on mobile.

---

## 3. SPACING & LAYOUT

- Base scale (4px grid): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px
- Reading Measure: max-width 68ch for body text. Text is never centered or justified.
- Desktop layout: 1200px max-width container, 2-column grid (280px sticky document rail + reading column, 40px gap).
- Tablet layout: Single-column results, document metadata above content.
- Mobile layout: Full width, 16px horizontal padding, scrollable metadata chips, 48px touch targets.

---

## 4. RADIUS

- 6px: Small controls and small non-pill elements
- 8px: Cards, panels, primary/secondary buttons, upload zone
- 12px: Major results reading-column container
- 999px (Pill): ONLY Short/Medium/Long selector and Ready/Processing/Failed/Error status chips.

---

## 5. SHADOWS & DIVIDERS

- Rest shadow: `0 1px 2px rgba(22,24,26,0.06)`
- Raised shadow: `0 4px 16px rgba(22,24,26,0.10), 0 1px 2px rgba(22,24,26,0.06)`
- No pure-black shadows.
- Avoid shadows on inline/flat content; rely on restrained borders (`--color-border`).

---

## 6. MOTION

- Micro: 120ms
- Fast: 200ms
- Base: 320ms
- Standard easing: `cubic-bezier(0.2, 0.0, 0, 1.0)`
- `prefers-reduced-motion`: Opacity-only transitions (≤80ms), no transforms, static indicators.

---

## 7. COMPONENT RULES

- **Header**: 64px height, sticky, 1px bottom border, "Summora" left (Geist 600, no logo icon), Theme toggle right.
- **Buttons**: 8px radius, primary accent background, 44px desktop / 48px mobile height. Active state `scale(0.98)`, focus ring `2px accent outline`.
- **Upload Zone**: `surface-sunken` background, 2px dashed border, 8px radius, ~280px min-height desktop. Custom document SVG glyph.
- **Key Points**: Numbered editorial rows `01`, `02`, `03`... separated by subtle borders.
- **Suggestions**: Single card-like container for grounded document suggestions or positive empty state ("No structural gaps detected").
- **Error Pattern**: Inline error cards with clear explanation and explicit recovery action buttons.
