import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './notifications.service';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// GET /notifications
notificationsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listNotifications(req.user!.id));
}));

// GET /notifications/unread-count
notificationsRouter.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.user!.id);
  res.json({ count });
}));

// PATCH /notifications/read-all — before /:id
notificationsRouter.patch('/read-all', asyncHandler(async (req, res) => {
  await service.markAllRead(req.user!.id);
  res.json({ message: 'All marked as read' });
}));

// DELETE /notifications/clear-all — before /:id
notificationsRouter.delete('/clear-all', asyncHandler(async (req, res) => {
  await service.clearAll(req.user!.id);
  res.json({ message: 'All notifications cleared' });
}));

// PATCH /notifications/:id/read
notificationsRouter.patch('/:id/read', asyncHandler(async (req, res) => {
  res.json(await service.markRead(req.user!.id, req.params.id));
}));

// DELETE /notifications/:id
notificationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteNotification(req.user!.id, req.params.id);
  res.json({ message: 'Notification deleted' });
}));
