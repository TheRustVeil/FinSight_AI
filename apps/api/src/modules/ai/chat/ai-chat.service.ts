import OpenAI from 'openai';
import { Response } from 'express';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../lib/api-error';
import { buildFinancialContext } from './context-builder';
import { env } from '../../../config/env';

// Google Gemini exposes an OpenAI-compatible endpoint, so we use the OpenAI SDK
// pointed at Gemini's base URL. Get a free key at https://aistudio.google.com/apikey
const gemini = new OpenAI({
  apiKey: env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

// gemini-2.0-flash has no free-tier quota on new API keys (limit: 0 → 429).
// gemini-2.5-flash still has free-tier quota. Override via env if needed.
const MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are FinSight AI, a knowledgeable and empathetic personal finance advisor.
You help users understand their spending patterns, optimize their budgets, and work toward their financial goals.

Guidelines:
- Be concise, warm, and practical — avoid financial jargon unless explaining it
- When you see the user's financial data, reference specific numbers to make advice concrete
- Always frame insights constructively — focus on what they can improve, not just what's wrong
- For investment advice, remind them to consult a licensed advisor for specific securities
- Format responses with clear structure when listing multiple points (use markdown)
- Keep responses focused — if a question has a simple answer, give a simple answer`;

export async function listConversations(userId: string) {
  return prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: { id: true, title: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
  });
}

export async function getConversation(userId: string, conversationId: string) {
  const conv = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conv) throw ApiError.notFound('Conversation not found');
  return conv;
}

export async function createConversation(userId: string, firstMessage: string) {
  const title = firstMessage.length > 60 ? firstMessage.slice(0, 57) + '...' : firstMessage;
  return prisma.aIConversation.create({
    data: { userId, title },
  });
}

export async function deleteConversation(userId: string, conversationId: string) {
  const conv = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
  if (!conv) throw ApiError.notFound('Conversation not found');
  await prisma.aIConversation.delete({ where: { id: conversationId } });
}

export async function streamMessage(userId: string, conversationId: string, userContent: string, res: Response) {
  const conv = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
  });
  if (!conv) throw ApiError.notFound('Conversation not found');

  // Save user message
  await prisma.aIMessage.create({
    data: { conversationId, role: 'user', content: userContent },
  });

  // Build financial context (injected into the system message)
  const financialContext = await buildFinancialContext(userId);

  // Build message history for Gemini (OpenAI chat format: system prompt is the first message)
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n${financialContext}` },
    ...conv.messages.slice(-18).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userContent },
  ];

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let fullContent = '';

  try {
    const stream = await gemini.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        send({ type: 'chunk', content: delta });
      }
    }

    // Save assistant message
    const saved = await prisma.aIMessage.create({
      data: { conversationId, role: 'assistant', content: fullContent },
    });

    // Update conversation timestamp + auto-update title if it's the first exchange
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    send({ type: 'done', messageId: saved.id });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message =
      status === 429
        ? 'The AI is temporarily rate-limited. Please wait a moment and try again.'
        : err instanceof Error
          ? err.message
          : 'AI unavailable';
    send({ type: 'error', message });
  } finally {
    res.end();
  }
}
