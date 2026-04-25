import OpenAI from 'openai';
import { AnalyzeResponse } from '../types';

const SYSTEM_PROMPT = `You are a helpful assistant that analyzes blocks of text.

Given any text, you will:
1. Write a concise 2-3 sentence summary that captures the main point.
2. Identify exactly 3 key action items — concrete, specific next steps a reader should take.

Always respond with valid JSON in this exact format, and nothing else:
{
  "summary": "string",
  "action_items": ["string", "string", "string"]
}`;

const MAX_INPUT_CHARS = 12000;

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

export async function analyzeText(
  text: string,
  client: OpenAI = createOpenAIClient(),
): Promise<AnalyzeResponse> {
  const truncatedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: truncatedText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('OpenAI returned an empty response');
  }

  const parsed = JSON.parse(raw) as Partial<AnalyzeResponse>;

  if (
    typeof parsed.summary !== 'string' ||
    !Array.isArray(parsed.action_items) ||
    parsed.action_items.length !== 3 ||
    parsed.action_items.some((item) => typeof item !== 'string')
  ) {
    throw new Error('OpenAI response did not match expected schema');
  }

  return parsed as AnalyzeResponse;
}
