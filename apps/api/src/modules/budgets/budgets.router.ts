import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './budgets.service';
import { createBudgetSchema, updateBudgetSchema } from './budgets.service';

export const budgetsRouter = Router();
budgetsRouter.use(authenticate);

budgetsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listBudgets(req.user!.id));
}));

budgetsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await service.getBudget(req.user!.id, req.params.id));
}));

budgetsRouter.post('/', validate(createBudgetSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createBudget(req.user!.id, req.body));
}));

budgetsRouter.patch('/:id', validate(updateBudgetSchema), asyncHandler(async (req, res) => {
  res.json(await service.updateBudget(req.user!.id, req.params.id, req.body));
}));

budgetsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteBudget(req.user!.id, req.params.id);
  res.json({ message: 'Budget deleted' });
}));
