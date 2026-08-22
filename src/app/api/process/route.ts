import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentText } from '@/lib/extractor';
import { summarizeDocument } from '@/lib/ai';
import { saveExtractedRecord } from '@/lib/retryStore';

export const maxDuration = 60; // 60s timeout for OCR/AI processing

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { code: 'NO_FILE', message: 'No document file provided.' },
        { status: 400 }
      );
    }

    if (files.length > 1) {
      return NextResponse.json(
        {
          code: 'MULTIPLE_FILES',
          message: 'One document at a time — drop a single PDF or image.',
        },
        { status: 400 }
      );
    }

    const file = files[0];

    // Validate MIME type & file extension
    const fileType = file.type || '';
    const fileName = file.name || '';
    const lowerName = fileName.toLowerCase();

    const isPdf = fileType === 'application/pdf' || lowerName.endsWith('.pdf');
    const isPng = fileType === 'image/png' || lowerName.endsWith('.png');
    const isJpg =
      fileType === 'image/jpeg' ||
      fileType === 'image/jpg' ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg');

    if (!isPdf && !isPng && !isJpg) {
      return NextResponse.json(
        {
          code: 'UNSUPPORTED_TYPE',
          message: "That file type isn't supported yet. Upload a PDF, PNG, or JPG.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          code: 'FILE_TOO_LARGE',
          message: 'That file is too large (max 20MB). Try a smaller file or lower-resolution scan.',
        },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          code: 'CORRUPT_FILE',
          message: 'This file is empty (0 bytes). Choose a valid document file.',
        },
        { status: 422 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Create stream for SSE processing events
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
        };

        let requestId: string | null = null;
        let extractionSucceeded = false;

        try {
          // Stage 1: Uploading complete
          sendEvent('stage', {
            stage: 'uploading',
            status: 'done',
            detail: 'Document upload received',
          });

          // Stage 2: Extracting
          sendEvent('stage', {
            stage: 'extracting',
            status: 'active',
            detail: isPdf ? 'Extracting text from PDF' : 'Reading image file',
          });

          const extractionResult = await extractDocumentText(
            fileBuffer,
            isPdf ? 'application/pdf' : fileType,
            (stage, detail) => {
              sendEvent('stage', { stage, status: 'active', detail });
            }
          );

          if (!extractionResult.extractedText || extractionResult.extractedText.trim().length === 0) {
            sendEvent('error', {
              code: 'EXTRACTION_FAILED',
              message: "We couldn't extract readable text from this document.",
              recoverable: false,
            });
            controller.close();
            return;
          }

          extractionSucceeded = true;

          // Save extracted text to short-lived retry store
          requestId = saveExtractedRecord(
            extractionResult.extractedText,
            fileName,
            fileType,
            {
              ...extractionResult.meta,
              hierarchical_summary_used: false,
            }
          );

          sendEvent('stage', {
            stage: 'extracting',
            status: 'done',
            detail: `Extracted ${extractionResult.meta.word_count} words`,
          });

          // Stage 3: Analyzing
          sendEvent('stage', {
            stage: 'analyzing',
            status: 'active',
            detail: 'Analyzing document structure & context',
          });

          // Stage 4: Summarizing
          sendEvent('stage', {
            stage: 'summarizing',
            status: 'active',
            detail: 'Preparing grounded Short, Medium, and Long summaries',
          });

          const summaryResult = await summarizeDocument(
            extractionResult.extractedText,
            extractionResult.meta
          );

          sendEvent('stage', {
            stage: 'summarizing',
            status: 'done',
            detail: 'Summaries ready',
          });

          // Emit complete event with full result + requestId
          sendEvent('complete', {
            ...summaryResult,
            requestId,
            filename: fileName,
            fileType: isPdf ? 'PDF Document' : 'Image Document',
          });

          controller.close();
        } catch (err: any) {
          const isSetupError = err.code === 'SETUP_REQUIRED';
          const isRateLimit = err.status === 429 || (err.message && err.message.toLowerCase().includes('quota'));
          const isTimeout = err.message && err.message.toLowerCase().includes('timeout');
          const isKeyError = err.status === 400 || (err.message && err.message.toLowerCase().includes('api key'));

          let code = 'UNKNOWN';
          let message = err.message || 'Something went wrong processing your document.';

          if (isSetupError) {
            code = 'SETUP_REQUIRED';
            message = 'AI API key is missing. Please configure AI_API_KEY on the server.';
          } else if (isKeyError) {
            code = 'API_KEY_INVALID';
            message = 'The configured AI API Key is invalid or rejected by Google Gemini.';
          } else if (isRateLimit) {
            code = 'AI_RATE_LIMITED';
            message = "We're processing a lot of documents right now — try again in a moment.";
          } else if (isTimeout) {
            code = 'AI_TIMEOUT';
            message = 'The summary is taking longer than expected.';
          } else if (!extractionSucceeded) {
            code = 'EXTRACTION_FAILED';
            message = err.message || "We couldn't extract readable text from this document.";
          }

          sendEvent('error', {
            code,
            message,
            recoverable: extractionSucceeded && !!requestId,
            requestId: extractionSucceeded ? requestId : null,
            retry_stage: extractionSucceeded ? 'summarizing' : 'uploading',
          });

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
