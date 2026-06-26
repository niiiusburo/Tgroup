/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/services/ai]
 * @crossref:uses[product-map/domains/patient-portal.yaml, docs/CONTRACTS.md]
 *
 * Provider-agnostic AI chat completion service.
 * Reference implementation for NK Patient Portal chat support.
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GenerateOptions {
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  content: string;
  provider: 'openai' | 'gemini';
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const DEFAULT_PROVIDER = (process.env.AI_PROVIDER as 'openai' | 'gemini') || 'openai';

export async function generateChatResponse(options: GenerateOptions): Promise<GenerateResult> {
  if (DEFAULT_PROVIDER === 'gemini') {
    return generateWithGemini(options);
  }
  return generateWithOpenAI(options);
}

async function generateWithOpenAI(options: GenerateOptions): Promise<GenerateResult> {
  if (!openai) {
    throw new Error('OpenAI client not initialized; set OPENAI_API_KEY');
  }

  const messages: ChatMessage[] = options.system
    ? [{ role: 'system', content: options.system }, ...options.messages]
    : options.messages;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.maxTokens ?? 1024,
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  return {
    content,
    provider: 'openai',
    usage: {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    },
  };
}

async function generateWithGemini(options: GenerateOptions): Promise<GenerateResult> {
  if (!gemini) {
    throw new Error('Gemini client not initialized; set GEMINI_API_KEY');
  }

  // Build a simple prompt for Gemini 2.5 Flash from the message list.
  const history = options.messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  const prompt = options.system
    ? `${options.system}\n\n${history}\n\nAssistant:`
    : `${history}\n\nAssistant:`;

  const result = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: options.temperature ?? 0.5,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  });

  return {
    content: result.text?.trim() || '',
    provider: 'gemini',
  };
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized; set OPENAI_API_KEY');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}
