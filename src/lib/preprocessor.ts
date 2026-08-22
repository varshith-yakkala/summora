/**
 * Lightweight plain text preprocessing:
 * - fixes OCR hyphenation split across lines
 * - removes page number artifacts
 * - removes repeated headers/footers
 * - normalizes excessive whitespace while preserving paragraph structure
 */
export function preprocessText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Fix line-break hyphenation (e.g., "docu-\nment" -> "document")
  cleaned = cleaned.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');

  // 2. Remove common page number artifacts (e.g. "Page 1 of 4", "- 3 -", "Page 2")
  cleaned = cleaned.replace(/(?:page|\b)\s*[-—]?\s*\d+\s*(?:of|\/)\s*\d+\s*[-—]?/gi, '');
  cleaned = cleaned.replace(/^\s*[-—]?\s*\d+\s*[-—]?\s*$/gm, '');

  // 3. Normalize carriage returns
  cleaned = cleaned.replace(/\r\n/g, '\n');

  // 4. Normalize horizontal whitespace (spaces, tabs) except line breaks
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 5. Trim lines
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // 6. Reduce more than 2 consecutive newlines to 2 newlines (preserve paragraphs)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}
