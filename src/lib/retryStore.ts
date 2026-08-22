import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ExtractedDataRecord {
  requestId: string;
  extractedText: string;
  filename: string;
  fileType: string;
  meta: {
    extraction_method: 'native_pdf' | 'ocr_image' | 'ocr_scanned_pdf';
    ocr_confidence: number | null;
    word_count: number;
    page_count: number | null;
    hierarchical_summary_used: boolean;
  };
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes TTL
const RETRY_DIR = path.join(os.tmpdir(), 'ink_signal_retry');

function ensureDirExists() {
  if (!fs.existsSync(RETRY_DIR)) {
    try {
      fs.mkdirSync(RETRY_DIR, { recursive: true });
    } catch (e) {}
  }
}

function cleanupExpiredFiles() {
  ensureDirExists();
  const now = Date.now();
  try {
    const files = fs.readdirSync(RETRY_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(RETRY_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > TTL_MS) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
}

export function saveExtractedRecord(
  extractedText: string,
  filename: string,
  fileType: string,
  meta: ExtractedDataRecord['meta']
): string {
  cleanupExpiredFiles();
  const requestId = randomUUID();
  const record: ExtractedDataRecord = {
    requestId,
    extractedText,
    filename,
    fileType,
    meta,
    createdAt: Date.now(),
  };

  ensureDirExists();
  const filePath = path.join(RETRY_DIR, `${requestId}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(record), 'utf-8');
  } catch (e) {
    console.error('Failed to write retry record to tmp storage:', e);
  }

  return requestId;
}

export function getExtractedRecord(requestId: string): ExtractedDataRecord | null {
  cleanupExpiredFiles();
  if (!requestId || typeof requestId !== 'string') return null;

  ensureDirExists();
  const filePath = path.join(RETRY_DIR, `${requestId}.json`);

  if (!fs.existsSync(filePath)) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const record: ExtractedDataRecord = JSON.parse(content);

    if (Date.now() - record.createdAt > TTL_MS) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
      return null;
    }

    return record;
  } catch (e) {
    return null;
  }
}

export function deleteExtractedRecord(requestId: string): void {
  if (!requestId) return;
  ensureDirExists();
  const filePath = path.join(RETRY_DIR, `${requestId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}
  }
}
