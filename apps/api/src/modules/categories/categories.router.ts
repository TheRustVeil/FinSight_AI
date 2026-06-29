import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './categories.service';

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

categoriesRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listCategories(req.user!.id));
}));

categoriesRouter.post('/', validate(service.createCategorySchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createCategory(req.user!.id, req.body));
}));

categoriesRouter.patch('/:id', validate(service.updateCategorySchema), asyncHandler(async (req, res) => {
  res.json(await service.updateCategory(req.user!.id, req.params.id, req.body));
}));

categoriesRouter.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteCategory(req.user!.id, req.params.id);
  res.json({ message: 'Category deleted' });
}));
