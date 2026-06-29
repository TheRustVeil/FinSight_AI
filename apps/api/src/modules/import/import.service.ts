import { parse } from 'csv-parse/sync';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { ocrQueue } from '../../config/queue';
import { categorizeByRules } from '../ai/categorization/rules-engine';
import { ApiError } from '../../lib/api-error';

export interface ColumnMapping {
  date: string;
  amount: string;
  merchant?: string;
  description?: string;
  type?: string;   // column that determines income vs expense
  typeExpenseValue?: string; // value in type column that means "expense" e.g. "debit"
}

export interface ImportRow {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  merchant: string | null;
  description: string | null;
  rawRow: Record<string, string>;
  categorySlug: string | null;
  confidence: number;
  error?: string;
}

// ── Progress helpers via Redis ─────────────────────────────────────────────────

export function importProgressKey(batchId: string) {
  return `import:progress:${batchId}`;
}

export async function setProgress(batchId: string, data: Record<string, unknown>) {
  await redis.set(importProgressKey(batchId), JSON.stringify(data), 'EX', 3600);
}

export async function getProgress(batchId: string) {
  const raw = await redis.get(importProgressKey(batchId));
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

// ── CSV preview (first 5 data rows + headers) ─────────────────────────────────

export function previewCsv(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, to: 6 }) as Record<string, string>[];
  if (!records.length) throw ApiError.badRequest('CSV is empty or has no data rows');
  return { headers: Object.keys(records[0]), rows: records.slice(0, 5) };
}

// ── Create batch + enqueue job ─────────────────────────────────────────────────

export async function createImportBatch(userId: string, filename: string, buffer: Buffer, mapping: ColumnMapping, accountId?: string) {
  // Quick structural validation
  const firstRow = (parse(buffer, { columns: true, skip_empty_lines: true, trim: true, to: 1 }) as Record<string, string>[])[0];
  if (!firstRow) throw ApiError.badRequest('CSV has no data rows');
  if (!firstRow[mapping.date]) throw ApiError.badRequest(`Date column "${mapping.date}" not found in CSV`);
  if (!firstRow[mapping.amount]) throw ApiError.badRequest(`Amount column "${mapping.amount}" not found in CSV`);

  const totalRows = (parse(buffer, { skip_empty_lines: true, trim: true, from_line: 2 }) as unknown[]).length;

  const batch = await prisma.importBatch.create({
    data: {
      userId,
      sourceType: 'csv',
      fileKey: `inline:${filename}`,
      fileName: filename,
      status: 'pending',
      totalRows,
      importedRows: 0,
      metadata: JSON.parse(JSON.stringify({ mapping, accountId: accountId ?? null })),
    },
  });

  await setProgress(batch.id, { status: 'pending', processed: 0, total: totalRows, errors: [] });

  await ocrQueue.add(
    'process-csv-import',
    { batchId: batch.id, userId, buffer: buffer.toString('base64'), mapping, accountId },
    { jobId: `import-${batch.id}`, attempts: 2, backoff: { type: 'fixed', delay: 5000 } },
  );

  return batch;
}

// ── Core parse + insert (called by worker) ────────────────────────────────────

export async function processImportBatch(batchId: string, userId: string, bufferB64: string, mapping: ColumnMapping, accountId?: string) {
  const buffer = Buffer.from(bufferB64, 'base64');
  await prisma.importBatch.update({ where: { id: batchId }, data: { status: 'processing' } });
  await setProgress(batchId, { status: 'processing', processed: 0, total: 0, errors: [] });

  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const total = records.length;
  const errors: { row: number; error: string }[] = [];
  let successRows = 0;

  const CHUNK = 50;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const parsed = chunk.map((row, idx) => parseRow(row, mapping, i + idx));

    const valid = parsed.filter((r) => !r.error);
    const invalid = parsed.filter((r) => r.error);

    for (const inv of invalid) {
      errors.push({ row: i + inv.row! + 2, error: inv.error! });
    }

    if (valid.length) {
      await prisma.transaction.createMany({
        data: valid.map((r) => ({
          userId,
          accountId: accountId ?? null,
          importBatchId: batchId,
          source: 'csv' as const,
          type: r.type as 'income' | 'expense',
          amount: r.amount,
          merchant: r.merchant,
          description: r.description,
          date: new Date(r.date),
          categoryId: null,
          aiCategoryId: null,
          aiConfidence: null,
        })),
        skipDuplicates: true,
      });
      successRows += valid.length;
    }

    await setProgress(batchId, { status: 'processing', processed: Math.min(i + CHUNK, total), total, errors });
  }

  // Auto-categorize all inserted transactions for this batch
  const txns = await prisma.transaction.findMany({
    where: { importBatchId: batchId, categoryId: null, deletedAt: null },
    select: { id: true, merchant: true, description: true },
  });

  const systemCats = await prisma.category.findMany({
    where: { isSystem: true }, select: { id: true, slug: true },
  });
  const slugToId = Object.fromEntries(systemCats.map((c) => [c.slug, c.id]));

  for (const t of txns) {
    const match = categorizeByRules(t.merchant ?? '', t.description);
    if (match && slugToId[match.categorySlug]) {
      const update: Record<string, unknown> = { aiCategoryId: slugToId[match.categorySlug], aiConfidence: match.confidence };
      if (match.confidence >= 0.85) update.categoryId = slugToId[match.categorySlug];
      await prisma.transaction.update({ where: { id: t.id }, data: update });
    }
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: errors.length === total ? 'failed' : 'completed',
      importedRows: successRows,
      completedAt: new Date(),
      errorMessage: errors.length ? `${errors.length} row(s) failed to import` : null,
    },
  });

  await setProgress(batchId, { status: 'completed', processed: total, total, errors, successRows, failedRows: errors.length });
}

function parseRow(row: Record<string, string>, mapping: ColumnMapping, rowIndex: number): ImportRow & { row?: number } {
  const rawDate = row[mapping.date]?.trim();
  const rawAmount = row[mapping.amount]?.trim().replace(/[₹$,\s]/g, '');
  const merchant = mapping.merchant ? row[mapping.merchant]?.trim() || null : null;
  const description = mapping.description ? row[mapping.description]?.trim() || null : null;

  if (!rawDate) return { date: '', amount: 0, type: 'expense', merchant: null, description: null, rawRow: row, categorySlug: null, confidence: 0, error: 'Missing date', row: rowIndex };

  const date = parseDate(rawDate);
  if (!date) return { date: '', amount: 0, type: 'expense', merchant: null, description: null, rawRow: row, categorySlug: null, confidence: 0, error: `Cannot parse date: ${rawDate}`, row: rowIndex };

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) return { date, amount: 0, type: 'expense', merchant: null, description: null, rawRow: row, categorySlug: null, confidence: 0, error: `Invalid amount: ${rawAmount}`, row: rowIndex };

  let type: 'income' | 'expense' = 'expense';
  if (mapping.type && row[mapping.type]) {
    const tv = row[mapping.type].trim().toLowerCase();
    const expenseVal = (mapping.typeExpenseValue ?? 'debit').toLowerCase();
    type = tv === expenseVal ? 'expense' : 'income';
  }

  return { date, amount: Math.abs(amount), type, merchant, description, rawRow: row, categorySlug: null, confidence: 0, row: rowIndex };
}

function parseDate(raw: string): string | null {
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,            // 2024-01-15
    /^(\d{2})\/(\d{2})\/(\d{4})$/,           // 01/15/2024
    /^(\d{2})-(\d{2})-(\d{4})$/,             // 01-15-2024
    /^(\d{2})\/(\d{2})\/(\d{2})$/,           // 01/15/24
  ];

  for (const fmt of formats) {
    const m = raw.match(fmt);
    if (m) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

// ── Batch queries ─────────────────────────────────────────────────────────────

export async function listBatches(userId: string) {
  return prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, fileName: true, status: true, totalRows: true, importedRows: true, createdAt: true },
  });
}

export async function getBatch(userId: string, batchId: string) {
  const batch = await prisma.importBatch.findFirst({ where: { id: batchId, userId } });
  if (!batch) throw ApiError.notFound('Import batch not found');

  const transactions = await prisma.transaction.findMany({
    where: { importBatchId: batchId, deletedAt: null },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    orderBy: { date: 'desc' },
    take: 200,
  });

  const progress = await getProgress(batchId);
  return { batch, transactions, progress };
}

export async function deleteBatch(userId: string, batchId: string) {
  const batch = await prisma.importBatch.findFirst({ where: { id: batchId, userId } });
  if (!batch) throw ApiError.notFound('Import batch not found');
  await prisma.transaction.deleteMany({ where: { importBatchId: batchId } });
  await prisma.importBatch.delete({ where: { id: batchId } });
  await redis.del(importProgressKey(batchId));
}
