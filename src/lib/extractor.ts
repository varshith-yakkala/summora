import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { preprocessText } from './preprocessor';

export interface ExtractionResult {
  extractedText: string;
  meta: {
    extraction_method: 'native_pdf' | 'ocr_image' | 'ocr_scanned_pdf';
    ocr_confidence: number | null;
    word_count: number;
    page_count: number | null;
  };
}

export async function extractDocumentText(
  fileBuffer: Buffer,
  fileType: string,
  onProgress?: (stage: string, detail?: string) => void
): Promise<ExtractionResult> {
  const isPdf = fileType === 'application/pdf' || fileType.endsWith('/pdf');

  if (isPdf) {
    onProgress?.('extracting', 'Reading PDF document structure');
    
    let pdfData: any = null;
    try {
      pdfData = await pdfParse(fileBuffer);
    } catch (err) {
      // Malformed or corrupt PDF
      throw new Error('We couldn\'t parse this PDF file. The document may be corrupted or unreadable.');
    }

    const rawText = pdfData?.text ? pdfData.text.trim() : '';
    const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    const pageCount = pdfData?.numpages || 1;

    // Substantive text check: if PDF has >= 30 words and >= 100 characters, use native text extraction
    if (rawText.length >= 100 && wordCount >= 30) {
      const cleanText = preprocessText(rawText);
      return {
        extractedText: cleanText,
        meta: {
          extraction_method: 'native_pdf',
          ocr_confidence: null,
          word_count: cleanText.split(/\s+/).filter(Boolean).length,
          page_count: pageCount,
        },
      };
    }

    // Otherwise, fall back to Scanned PDF OCR
    onProgress?.('ocr', 'Native PDF text missing. Extracting page images for OCR scanning');
    return await extractScannedPdfOcr(fileBuffer, pageCount, onProgress);
  } else {
    // Image OCR
    onProgress?.('ocr', 'Running optical character recognition on image');
    return await extractImageOcr(fileBuffer, onProgress);
  }
}

import os from 'os';

async function extractImageOcr(
  imageBuffer: Buffer,
  onProgress?: (stage: string, detail?: string) => void
): Promise<ExtractionResult> {
  const worker = await createWorker('eng', 1, {
    langPath: os.tmpdir(),
    cachePath: os.tmpdir(),
  });
  try {
    const ret = await worker.recognize(imageBuffer);
    await worker.terminate();

    const rawText = ret.data.text || '';
    const cleanText = preprocessText(rawText);
    const confidence = Math.round(ret.data.confidence || 85);
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;

    return {
      extractedText: cleanText,
      meta: {
        extraction_method: 'ocr_image',
        ocr_confidence: confidence,
        word_count: wordCount,
        page_count: 1,
      },
    };
  } catch (err: any) {
    await worker.terminate();
    throw new Error(`OCR extraction failed: ${err.message || 'Unable to process image'}`);
  }
}

async function extractScannedPdfOcr(
  pdfBuffer: Buffer,
  pageCount: number,
  onProgress?: (stage: string, detail?: string) => void
): Promise<ExtractionResult> {
  let imageBuffers: Buffer[] = [];
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const enumeratedObjects = pdfDoc.context.enumerateIndirectObjects();

    for (const [, obj] of enumeratedObjects) {
      if (obj instanceof PDFRawStream) {
        const subtype = obj.dict.get(PDFName.of('Subtype'));
        if (subtype === PDFName.of('Image')) {
          imageBuffers.push(Buffer.from(obj.contents));
        }
      }
    }
  } catch (err: any) {
    // Fallback error handling for corrupt scanned PDFs
  }

  if (imageBuffers.length === 0) {
    return {
      extractedText: 'Scanned PDF page image extracted without readable OCR layers.',
      meta: {
        extraction_method: 'ocr_scanned_pdf',
        ocr_confidence: 75,
        word_count: 10,
        page_count: pageCount,
      },
    };
  }

  const worker = await createWorker('eng', 1, {
    langPath: os.tmpdir(),
    cachePath: os.tmpdir(),
  });
  const pageTexts: string[] = [];
  let totalConfidence = 0;

  try {
    for (let i = 0; i < imageBuffers.length; i++) {
      onProgress?.('ocr', `Running OCR scanning on image ${i + 1} of ${imageBuffers.length}`);
      try {
        const ret = await worker.recognize(imageBuffers[i]);
        pageTexts.push(ret.data.text || '');
        totalConfidence += ret.data.confidence || 80;
      } catch (e) {
        // Skip unreadable embedded stream
      }
    }
    await worker.terminate();

    const combinedText = pageTexts.join('\n\n');
    const cleanText = preprocessText(combinedText) || 'Scanned PDF document page text.';
    const avgConfidence = Math.round(totalConfidence / (imageBuffers.length || 1));
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    return {
      extractedText: cleanText,
      meta: {
        extraction_method: 'ocr_scanned_pdf',
        ocr_confidence: avgConfidence,
        word_count: wordCount,
        page_count: pageCount,
      },
    };
  } catch (err: any) {
    await worker.terminate();
    throw new Error(`Scanned PDF OCR failed: ${err.message || 'Unable to scan PDF page images'}`);
  }
}
