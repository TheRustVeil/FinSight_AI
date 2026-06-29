import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as service from './users.service';
import { asyncHandler } from '../../lib/async-handler';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/me', asyncHandler(async (req, res) => {
  res.json(await service.getUser(req.user!.id));
}));

usersRouter.patch('/me', validate(service.updateUserSchema), asyncHandler(async (req, res) => {
  res.json(await service.updateUser(req.user!.id, req.body));
}));

usersRouter.delete('/me', asyncHandler(async (req, res) => {
  await service.deleteUser(req.user!.id);
  res.json({ message: 'Account scheduled for deletion' });
}));

usersRouter.get('/me/preferences', asyncHandler(async (req, res) => {
  res.json(await service.getPreferences(req.user!.id));
}));

usersRouter.patch('/me/preferences', validate(service.updatePreferencesSchema), asyncHandler(async (req, res) => {
  res.json(await service.updatePreferences(req.user!.id, req.body));
}));
