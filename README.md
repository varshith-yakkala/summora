# Summora — Ink & Signal

A calm, editorial, technically credible document-intelligence utility that accepts a PDF or image and returns grounded Short, Medium, and Long summaries, Key Points, and Improvement Suggestions.

Product Identity: **Summora (Ink & Signal)**

---

## Architecture & How It Works

```
Upload
  ↓
PDF / Image Detection
  ↓
PDF Text Extraction OR Image/Scanned PDF OCR
  ↓
Text Preprocessing
  ↓
AI Grounded Analysis (Google Gemini gemini-3.6-flash)
  ↓
Short / Medium / Long Summaries
  ↓
Key Points + Improvement Suggestions
```

### Key Engineering Highlights

1. **Native PDF & OCR Fallback**:
   - Native text PDFs extract page content directly via `pdf-parse`.
   - Images (`PNG`, `JPG`, `JPEG`) run optical character recognition via `tesseract.js`.
   - Scanned PDFs without an embedded text layer extract image streams via `pdf-lib` and fall back to OCR via `tesseract.js`.

2. **Grounded AI Output**:
   - Grounded strictly in extracted text—no outside facts or hallucinated document flaws.
   - Powered by **Google Gemini (`gemini-3.6-flash`)** via the `@google/generative-ai` SDK.
   - Long documents (>6,000 words) automatically trigger a Map-Reduce / Hierarchical summarization pipeline.

3. **Short-Lived Retry Context**:
   - If AI summarization fails after successful extraction, users can retry summarization without re-uploading.
   - Original uploaded files are immediately deleted after text extraction.
   - Extracted text is temporarily held in a short-lived `os.tmpdir()` filesystem store (10-minute TTL) and purged after completion. (For horizontal multi-instance scaling, a distributed store such as Redis would be used).

4. **Zero-Latency Length Switching**:
   - All three summary lengths (`Short`, `Medium`, `Long`) are generated together in the initial payload.
   - Mode switching is client-side only (0 additional network requests).

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS with custom CSS variable design tokens
- **Typography**: Geist & Geist Mono
- **PDF Extraction**: `pdf-parse`, `pdf-lib`
- **OCR Engine**: `tesseract.js`
- **AI Engine**: `@google/generative-ai` (`gemini-3.6-flash`)
- **Testing**: Playwright E2E Test Suite (18 passing test scenarios)

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
AI_API_KEY=your_api_key_here
AI_MODEL=gemini-3.6-flash
MAX_UPLOAD_MB=20
NODE_ENV=development
```

---

## Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Test Fixtures**:
   ```bash
   node scripts/generate_fixtures.js
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Run End-to-End Tests**:
   ```bash
   npx playwright test
   ```
