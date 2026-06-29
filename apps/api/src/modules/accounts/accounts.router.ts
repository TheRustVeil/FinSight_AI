import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './accounts.service';

export const accountsRouter = Router();
accountsRouter.use(authenticate);

accountsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listAccounts(req.user!.id));
}));

accountsRouter.post('/', validate(service.createAccountSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createAccount(req.user!.id, req.body));
}));

accountsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await service.getAccount(req.user!.id, req.params.id));
}));

accountsRouter.patch('/:id', validate(service.updateAccountSchema), asyncHandler(async (req, res) => {
  res.json(await service.updateAccount(req.user!.id, req.params.id, req.body));
}));

accountsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteAccount(req.user!.id, req.params.id);
  res.json({ message: 'Account deleted' });
}));

accountsRouter.get('/:id/summary', asyncHandler(async (req, res) => {
  res.json(await service.getAccountSummary(req.user!.id, req.params.id));
}));
