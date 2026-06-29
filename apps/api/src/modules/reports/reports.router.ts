import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import * as service from './reports.service';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

const rangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().uuid().optional(),
});

function getDefaultRange() {
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

// GET /reports/summary — JSON summary report
reportsRouter.get('/summary', validate(rangeSchema, 'query'), asyncHandler(async (req, res) => {
  const range = req.query as unknown as { startDate: string; endDate: string; accountId?: string };
  res.json(await service.generateSummaryReport(req.user!.id, range));
}));

// GET /reports/export/csv — download transactions as CSV
reportsRouter.get('/export/csv', asyncHandler(async (req, res) => {
  const defaults = getDefaultRange();
  const range = {
    startDate: (req.query.startDate as string) || defaults.startDate,
    endDate: (req.query.endDate as string) || defaults.endDate,
    accountId: req.query.accountId as string | undefined,
  };
  const csv = await service.exportTransactionsCsv(req.user!.id, range);
  const filename = `finsight-transactions-${range.startDate}-to-${range.endDate}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}));

// GET /reports/export/json — download summary report as JSON
reportsRouter.get('/export/json', asyncHandler(async (req, res) => {
  const defaults = getDefaultRange();
  const range = {
    startDate: (req.query.startDate as string) || defaults.startDate,
    endDate: (req.query.endDate as string) || defaults.endDate,
    accountId: req.query.accountId as string | undefined,
  };
  const report = await service.generateSummaryReport(req.user!.id, range);
  const filename = `finsight-report-${range.startDate}-to-${range.endDate}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(report, null, 2));
}));
