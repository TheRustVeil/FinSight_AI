import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
  type: z.enum(['income', 'expense', 'transfer']),
  merchant: z.string().max(255).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).default([]),
});

export const updateTransactionSchema = createTransactionSchema.partial().omit({ tags: true }).extend({
  tags: z.array(z.string().max(50)).optional(),
});

export const confirmCategorySchema = z.object({
  categoryId: z.string().uuid(),
});

export const listTransactionsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  search: z.string().max(100).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  source: z.enum(['manual', 'csv', 'pdf', 'ocr', 'api']).optional(),
  isFlagged: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isRecurring: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sortBy: z.enum(['date', 'amount', 'merchant']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const statsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().uuid().optional(),
});

export const heatmapQuerySchema = z.object({
  year: z.coerce.number().min(2000).max(2100).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>;
