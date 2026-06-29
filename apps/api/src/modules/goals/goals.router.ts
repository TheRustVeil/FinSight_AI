import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './goals.service';
import { createGoalSchema, updateGoalSchema, addContributionSchema } from './goals.service';

export const goalsRouter = Router();
goalsRouter.use(authenticate);

goalsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listGoals(req.user!.id));
}));

goalsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await service.getGoal(req.user!.id, req.params.id));
}));

goalsRouter.post('/', validate(createGoalSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createGoal(req.user!.id, req.body));
}));

goalsRouter.patch('/:id', validate(updateGoalSchema), asyncHandler(async (req, res) => {
  res.json(await service.updateGoal(req.user!.id, req.params.id, req.body));
}));

goalsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteGoal(req.user!.id, req.params.id);
  res.json({ message: 'Goal deleted' });
}));

goalsRouter.post('/:id/contributions', validate(addContributionSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.addContribution(req.user!.id, req.params.id, req.body));
}));

goalsRouter.delete('/:id/contributions/:cid', asyncHandler(async (req, res) => {
  await service.deleteContribution(req.user!.id, req.params.id, req.params.cid);
  res.json({ message: 'Contribution removed' });
}));
