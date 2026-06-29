import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './transactions.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  confirmCategorySchema,
  listTransactionsSchema,
  statsQuerySchema,
  heatmapQuerySchema,
} from './transactions.validation';

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

// ─── Stats (before :id to avoid param clash) ─────────────────────────────────
transactionsRouter.get('/stats/summary', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { startDate, endDate, accountId } = req.query as Record<string, string>;
  res.json(await service.getSummary(req.user!.id, startDate, endDate, accountId));
}));

transactionsRouter.get('/stats/by-category', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  res.json(await service.getByCategory(req.user!.id, startDate, endDate));
}));

transactionsRouter.get('/stats/by-merchant', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const limit = Number(req.query.limit) || 10;
  res.json(await service.getByMerchant(req.user!.id, startDate, endDate, limit));
}));

transactionsRouter.get('/stats/heatmap', validate(heatmapQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { year, month } = req.query as Record<string, string>;
  res.json(await service.getHeatmap(req.user!.id, year ? Number(year) : undefined, month ? Number(month) : undefined));
}));

transactionsRouter.get('/stats/trend', asyncHandler(async (req, res) => {
  const months = Number(req.query.months) || 6;
  res.json(await service.getSpendingTrend(req.user!.id, months));
}));

// ─── CRUD ─────────────────────────────────────────────────────────────────────
transactionsRouter.get('/', validate(listTransactionsSchema, 'query'), asyncHandler(async (req, res) => {
  res.json(await service.listTransactions(req.user!.id, req.query as never));
}));

transactionsRouter.post('/', validate(createTransactionSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createTransaction(req.user!.id, req.body));
}));

transactionsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await service.getTransaction(req.user!.id, req.params.id));
}));

transactionsRouter.patch('/:id', validate(updateTransactionSchema), asyncHandler(async (req, res) => {
  res.json(await service.updateTransaction(req.user!.id, req.params.id, req.body));
}));

transactionsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteTransaction(req.user!.id, req.params.id);
  res.json({ message: 'Transaction deleted' });
}));

transactionsRouter.post('/:id/confirm-category', validate(confirmCategorySchema), asyncHandler(async (req, res) => {
  res.json(await service.confirmCategory(req.user!.id, req.params.id, req.body.categoryId));
}));
