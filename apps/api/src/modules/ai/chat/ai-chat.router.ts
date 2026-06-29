import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../../middleware/auth.middleware';
import { validate } from '../../../middleware/validate.middleware';
import { asyncHandler } from '../../../lib/async-handler';
import { ApiError } from '../../../lib/api-error';
import * as service from './ai-chat.service';
import { env } from '../../../config/env';

export const aiChatRouter = Router();
aiChatRouter.use(authenticate);

const createConvSchema = z.object({ firstMessage: z.string().min(1).max(2000) });
const sendMessageSchema = z.object({ content: z.string().min(1).max(2000) });

// GET /ai/conversations
aiChatRouter.get('/conversations', asyncHandler(async (req, res) => {
  res.json(await service.listConversations(req.user!.id));
}));

// POST /ai/conversations — create new conversation
aiChatRouter.post('/conversations', validate(createConvSchema), asyncHandler(async (req, res) => {
  if (!env.GEMINI_API_KEY) throw ApiError.badRequest('AI features require a Gemini API key. Add GEMINI_API_KEY to .env');
  const conv = await service.createConversation(req.user!.id, req.body.firstMessage);
  res.status(201).json(conv);
}));

// GET /ai/conversations/:id
aiChatRouter.get('/conversations/:id', asyncHandler(async (req, res) => {
  res.json(await service.getConversation(req.user!.id, req.params.id));
}));

// DELETE /ai/conversations/:id
aiChatRouter.delete('/conversations/:id', asyncHandler(async (req, res) => {
  await service.deleteConversation(req.user!.id, req.params.id);
  res.json({ message: 'Conversation deleted' });
}));

// POST /ai/conversations/:id/messages — streaming SSE response
aiChatRouter.post('/conversations/:id/messages', (req: Request, res: Response) => {
  if (!env.GEMINI_API_KEY) {
    res.status(400).json({ error: { code: 'NO_API_KEY', message: 'AI features require a Gemini API key' } });
    return;
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Message content is required' } });
    return;
  }

  service.streamMessage(req.user!.id, req.params.id, parsed.data.content, res).catch((err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
  });
});
