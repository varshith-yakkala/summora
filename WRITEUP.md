# Engineering Approach Write-Up — Summora

**Problem**: Distilling complex PDFs and document images into grounded, calm, editorial document intelligence without generic AI dashboard bloat.

**Architecture**: Next.js App Router single-session utility streaming Server-Sent Events (SSE) from a multipart processing endpoint to a reactive React frontend.

**Document Processing**: Dual-path engine using `pdf-parse` for native text PDFs, `tesseract.js` for PNG/JPG images, and `pdf-lib` stream extraction with Tesseract OCR fallback for scanned PDFs lacking embedded text. Lightweight text normalization strips page artifacts and hyphenation.

**AI Approach**: Google Gemini (`gemini-3.6-flash`) orchestrated via `@google/generative-ai` with strict JSON schema validation, enforcing absolute source grounding for Short/Medium/Long summaries, numbered Key Points, and Improvement Suggestions. Documents exceeding 6,000 words trigger map-reduce chunk synthesis.

**Frontend**: Editorial reading utility styled with custom Ink & Signal design tokens (zinc neutrals, emerald accent, Geist typography), featuring instantaneous zero-latency client summary length switching.

**Deployment**: Implementation complete and locally verified on Next.js App Router architecture.

**Engineering Trade-Off**: Using an `os.tmpdir()` filesystem TTL store for post-extraction summary retries keeps single-instance executions fast and zero-dependency, but horizontal multi-instance scaling requires a distributed store like Redis.
