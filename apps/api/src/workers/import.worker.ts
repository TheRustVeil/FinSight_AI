import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { processImportBatch } from '../modules/import/import.service';
import type { ColumnMapping } from '../modules/import/import.service';

interface ImportJobData {
  batchId: string;
  userId: string;
  buffer: string; // base64
  mapping: ColumnMapping;
  accountId?: string;
}

export const importWorker = new Worker<ImportJobData>(
  'ocr-processing', // must match the ocrQueue name defined in config/queue.ts
  async (job: Job<ImportJobData>) => {
    const { batchId, userId, buffer, mapping, accountId } = job.data;
    logger.info({ batchId }, 'Starting CSV import job');

    try {
      await processImportBatch(batchId, userId, buffer, mapping, accountId);
      logger.info({ batchId }, 'CSV import job completed');
    } catch (err) {
      logger.error({ batchId, err }, 'CSV import job failed');
      throw err;
    }
  },
  { connection: redis, concurrency: 2 },
);

importWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Import worker job failed');
});
