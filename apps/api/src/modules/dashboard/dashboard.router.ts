import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './dashboard.service';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.string().uuid().optional(),
});

function getDefaultRange() {
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

dashboardRouter.get('/summary', validate(dateRangeSchema, 'query'), asyncHandler(async (req, res) => {
  const defaults = getDefaultRange();
  const { startDate = defaults.startDate, endDate = defaults.endDate, accountId } = req.query as Record<string, string>;
  res.json(await service.getDashboardSummary(req.user!.id, startDate, endDate, accountId));
}));

dashboardRouter.get('/spending-trend', asyncHandler(async (req, res) => {
  const months = Number(req.query.months) || 6;
  res.json(await service.getSpendingTrend(req.user!.id, months));
}));

dashboardRouter.get('/category-breakdown', validate(dateRangeSchema, 'query'), asyncHandler(async (req, res) => {
  const defaults = getDefaultRange();
  const { startDate = defaults.startDate, endDate = defaults.endDate } = req.query as Record<string, string>;
  res.json(await service.getCategoryBreakdown(req.user!.id, startDate, endDate));
}));

dashboardRouter.get('/top-merchants', validate(dateRangeSchema, 'query'), asyncHandler(async (req, res) => {
  const defaults = getDefaultRange();
  const { startDate = defaults.startDate, endDate = defaults.endDate } = req.query as Record<string, string>;
  const limit = Number(req.query.limit) || 5;
  res.json(await service.getTopMerchants(req.user!.id, startDate, endDate, limit));
}));

dashboardRouter.get('/recurring-subscriptions', asyncHandler(async (req, res) => {
  res.json(await service.getRecurringSubscriptions(req.user!.id));
}));

dashboardRouter.get('/cash-flow', validate(dateRangeSchema, 'query'), asyncHandler(async (req, res) => {
  const defaults = getDefaultRange();
  const { startDate = defaults.startDate, endDate = defaults.endDate } = req.query as Record<string, string>;
  res.json(await service.getCashFlow(req.user!.id, startDate, endDate));
}));

dashboardRouter.get('/heatmap', asyncHandler(async (req, res) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;
  res.json(await service.getHeatmap(req.user!.id, year, month));
}));
