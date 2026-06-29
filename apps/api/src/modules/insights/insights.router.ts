import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './insights.service';

export const insightsRouter = Router();
insightsRouter.use(authenticate);

// GET /insights — list active (non-dismissed) insights
insightsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listInsights(req.user!.id));
}));

// GET /insights/unread-count
insightsRouter.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.user!.id);
  res.json({ count });
}));

// GET /insights/forecast
insightsRouter.get('/forecast', asyncHandler(async (req, res) => {
  res.json(await service.getSpendingForecast(req.user!.id));
}));

// POST /insights/generate — manually trigger generation (dev/demo use)
insightsRouter.post('/generate', asyncHandler(async (req, res) => {
  const count = await service.generateInsights(req.user!.id);
  res.json({ generated: count });
}));

// PATCH /insights/read-all — must be before /:id routes
insightsRouter.patch('/read-all', asyncHandler(async (req, res) => {
  await service.markAllRead(req.user!.id);
  res.json({ message: 'All marked as read' });
}));

// PATCH /insights/:id/read
insightsRouter.patch('/:id/read', asyncHandler(async (req, res) => {
  res.json(await service.markRead(req.user!.id, req.params.id));
}));

// PATCH /insights/:id/dismiss
insightsRouter.patch('/:id/dismiss', asyncHandler(async (req, res) => {
  res.json(await service.dismissInsight(req.user!.id, req.params.id));
}));
