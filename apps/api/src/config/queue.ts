import { Queue } from 'bullmq';
import { redis } from './redis';

const connection = redis;

export const ocrQueue = new Queue('ocr-processing', { connection });
export const aiCategorizationQueue = new Queue('ai-categorization', { connection });
export const insightsQueue = new Queue('ai-insights', { connection });
export const notificationsQueue = new Queue('notifications', { connection });
export const reportsQueue = new Queue('report-generation', { connection });
