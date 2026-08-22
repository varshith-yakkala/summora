import { NextRequest, NextResponse } from 'next/server';
import { getExtractedRecord, deleteExtractedRecord } from '@/lib/retryStore';
import { summarizeDocument } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId } = body || {};

    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', message: 'requestId is required for summary retry.' },
        { status: 400 }
      );
    }

    const record = getExtractedRecord(requestId);

    if (!record) {
      return NextResponse.json(
        {
          code: 'RETRY_EXPIRED',
          message: 'Document session expired. Please upload the file again to summarize.',
        },
        { status: 422 }
      );
    }

    try {
      const summaryResult = await summarizeDocument(record.extractedText, record.meta);

      // Delete retry data after successful retry
      deleteExtractedRecord(requestId);

      return NextResponse.json({
        ...summaryResult,
        requestId: null,
        filename: record.filename,
        fileType: record.fileType.includes('pdf') ? 'PDF Document' : 'Image Document',
      });
    } catch (err: any) {
      const isSetupError = err.code === 'SETUP_REQUIRED';
      const isRateLimit = err.status === 429 || err.message?.includes('rate');
      const isTimeout = err.message?.includes('timeout');

      let code = 'AI_RETRY_FAILED';
      let message = err.message || 'Retry summarization failed.';

      if (isSetupError) {
        code = 'SETUP_REQUIRED';
        message = 'AI API key is missing. Please configure AI_API_KEY on the server.';
      } else if (isRateLimit) {
        code = 'AI_RATE_LIMITED';
        message = "We're processing a lot of documents right now — try again in a moment.";
      } else if (isTimeout) {
        code = 'AI_TIMEOUT';
        message = 'The summary is taking longer than expected.';
      }

      return NextResponse.json(
        {
          code,
          message,
          recoverable: true,
          requestId,
        },
        { status: isRateLimit ? 429 : 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
