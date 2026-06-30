import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/async-handler';
import { ApiError } from '../../lib/api-error';
import * as service from './import.service';
import { getProgress, importProgressKey, type ColumnMapping } from './import.service';
import { redis } from '../../config/redis';

export const importRouter = Router();
importRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!['text/csv', 'application/vnd.ms-excel', 'application/octet-stream'].includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
});

const mappingSchema = z.object({
  date: z.string().min(1),
  amount: z.string().min(1),
  merchant: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  typeExpenseValue: z.string().optional(),
});

// POST /import/preview — upload CSV, get headers + sample rows (no DB write)
importRouter.post('/preview', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const preview = service.previewCsv(req.file.buffer);
  res.json(preview);
}));

// POST /import — upload + mapping → create batch + enqueue
importRouter.post('/', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const mappingParsed = mappingSchema.safeParse(JSON.parse(req.body.mapping ?? '{}'));
  if (!mappingParsed.success) throw ApiError.badRequest('Invalid column mapping');
  // Schema requires date+amount, but Zod's inferred type can resolve to
  // all-optional under newer TypeScript; assert the validated shape.
  const mapping: ColumnMapping = mappingParsed.data as ColumnMapping;
  const accountId = req.body.accountId || undefined;
  const batch = await service.createImportBatch(req.user!.id, req.file.originalname, req.file.buffer, mapping, accountId);
  res.status(202).json({ batchId: batch.id, status: batch.status, totalRows: batch.totalRows });
}));

// GET /import — list all batches for user
importRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listBatches(req.user!.id));
}));

// GET /import/:id — batch status + transactions
importRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getBatch(req.user!.id, req.params.id));
}));

// DELETE /import/:id — delete batch + its transactions
importRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await service.deleteBatch(req.user!.id, req.params.id);
  res.json({ message: 'Import batch deleted' });
}));

// GET /import/:id/stream — SSE real-time progress
importRouter.get('/:id/stream', (req: Request, res: Response) => {
  const batchId = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let done = false;
  const interval = setInterval(async () => {
    try {
      const progress = await getProgress(batchId);
      if (!progress) return;
      send(progress);
      if (progress.status === 'completed' || progress.status === 'failed') {
        done = true;
        clearInterval(interval);
        res.end();
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 800);

  req.on('close', () => {
    if (!done) clearInterval(interval);
  });
});
