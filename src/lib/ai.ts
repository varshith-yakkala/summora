import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SummaryResult {
  summary: {
    short: string;
    medium: string;
    long: string;
  };
  key_points: Array<{
    point: string;
    why_it_matters: string | null;
    citation: string | null;
  }>;
  improvement_suggestions: Array<{
    headline: string;
    explanation: string;
    citation: string | null;
  }>;
  reading_level: 'General' | 'Technical' | 'Academic' | 'Legal' | 'Medical' | null;
  meta: {
    extraction_method: 'native_pdf' | 'ocr_image' | 'ocr_scanned_pdf';
    ocr_confidence: number | null;
    word_count: number;
    page_count: number | null;
    hierarchical_summary_used: boolean;
  };
}

export interface DocumentExtractionMeta {
  extraction_method: 'native_pdf' | 'ocr_image' | 'ocr_scanned_pdf';
  ocr_confidence: number | null;
  word_count: number;
  page_count: number | null;
}

const SYSTEM_PROMPT = `You are Ink & Signal, an elite, calm, editorial document-intelligence system.
Your mission is to produce strictly grounded document summaries, key points, and structural improvement suggestions with page/section citations.

CRITICAL GROUNDING RULES:
1. Use ONLY facts explicitly contained in the provided document text.
2. DO NOT introduce outside information, external facts, or plausible inventions.
3. If information is absent from the text, do not assume or invent it.

CITATIONS REQUIREMENT:
Where possible, include page or section citations (e.g. "p. 1", "p. 3", "Section 2") for key points and improvement suggestions based on the page markers in the text. If the document has only 1 page or image, use "p. 1" or null.

OUTPUT REQUIREMENTS:
Return ONLY valid JSON matching this schema exactly:
{
  "summary": {
    "short": "1-2 sentences, ~30-50 words capturing the essential core concept.",
    "medium": "1 short paragraph, ~100-150 words covering key contexts and details.",
    "long": "2-4 paragraphs, ~250-400 words detailing background, arguments, specifics, and conclusions."
  },
  "key_points": [
    {
      "point": "Clear, grounded key takeaway from the document.",
      "why_it_matters": "Brief statement on significance grounded in document context, or null.",
      "citation": "Page or section citation e.g. 'p. 1' or 'p. 3', or null."
    }
  ],
  "improvement_suggestions": [
    {
      "headline": "Specific structural or clarity issue identified directly in the text.",
      "explanation": "Concrete detail explaining why this gap exists in the source text.",
      "citation": "Page or section citation where this issue occurs e.g. 'p. 2', or null."
    }
  ],
  "reading_level": "One of: General, Technical, Academic, Legal, Medical — based strictly on the vocabulary, structure, and domain of the document. Return null if undeterminable."
}

SPECIFIC RULES:
- Short, Medium, and Long summaries MUST genuinely differ in depth and word count.
- Key Points: Provide ~5-8 key points. Each must be strictly grounded with an accurate citation where detectable.
- Improvement Suggestions: Only include genuine structural gaps. If well-structured, return []. NEVER introduce generic AI boilerplate.
- reading_level: Classify the document's audience/domain from the content only.`;

function chunkText(text: string, maxWordsChunk = 3000): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxWordsChunk) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    const currentCount = currentChunk.split(/\s+/).filter(Boolean).length;
    const paraCount = para.split(/\s+/).filter(Boolean).length;

    if (currentCount + paraCount > maxWordsChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function parseAndValidateJSON(jsonString: string): Omit<SummaryResult, 'meta'> {
  let cleaned = jsonString.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  if (
    !parsed.summary ||
    typeof parsed.summary.short !== 'string' ||
    typeof parsed.summary.medium !== 'string' ||
    typeof parsed.summary.long !== 'string' ||
    !Array.isArray(parsed.key_points) ||
    !Array.isArray(parsed.improvement_suggestions)
  ) {
    throw new Error('JSON response does not match expected schema');
  }

  return parsed;
}

export async function summarizeDocument(
  extractedText: string,
  extractionMeta: DocumentExtractionMeta
): Promise<SummaryResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error = new Error('AI_API_KEY environment variable is missing.');
    (error as any).code = 'SETUP_REQUIRED';
    throw error;
  }

  const modelName = process.env.AI_MODEL || 'gemini-3.6-flash';
  const isLongDocument = extractionMeta.word_count > 6000;
  let textToProcess = extractedText;
  let hierarchicalUsed = false;

  if (isLongDocument) {
    hierarchicalUsed = true;
    const chunks = chunkText(extractedText, 3000);
    const chunkPromises = chunks.map(async (chunk, i) => {
      const chunkPrompt = `Summarize Section ${i + 1} of ${chunks.length} of the document while preserving key facts, figures, page markers, and structural details:\n\n${chunk}`;
      const chunkRes = await callGeminiAI(
        apiKey,
        modelName,
        'You are a document analyzer. Synthesize key points accurately with citations.',
        chunkPrompt
      );
      return `--- SECTION ${i + 1} SUMMARY ---\n${chunkRes}`;
    });

    const chunkSummaries = await Promise.all(chunkPromises);
    textToProcess = chunkSummaries.join('\n\n');
  }

  const userPrompt = `Synthesize the following document text into structured JSON as requested:\n\nDOCUMENT TEXT:\n${textToProcess}`;

  let attempts = 0;
  let lastError: any = null;

  while (attempts < 2) {
    attempts++;
    try {
      const prompt = attempts === 2
        ? `${userPrompt}\n\nIMPORTANT: Your previous output failed JSON validation. Ensure you return valid JSON strictly adhering to the schema.`
        : userPrompt;

      const rawResponse = await callGeminiAI(apiKey, modelName, SYSTEM_PROMPT, prompt);
      const parsedData = parseAndValidateJSON(rawResponse);

      return {
        ...parsedData,
        reading_level: parsedData.reading_level ?? null,
        meta: {
          ...extractionMeta,
          hierarchical_summary_used: hierarchicalUsed,
        },
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(`AI Summarization failed after retry: ${lastError?.message || 'Invalid output format'}`);
}

async function callGeminiAI(apiKey: string, modelName: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const modelsToTry = [modelName, 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'].filter(
    (value, index, self) => self.indexOf(value) === index
  );

  let lastErr: any = null;
  for (const m of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      if (err.status !== 404 && !err.message?.includes('404')) {
        throw err;
      }
    }
  }

  throw lastErr || new Error('Failed to generate content with available Gemini models');
}
