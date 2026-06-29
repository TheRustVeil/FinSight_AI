import { Worker, Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { generateInsights } from '../modules/insights/insights.service';
import { prisma } from '../config/database';

export const insightsCronQueue = new Queue('insights-cron', { connection: redis });

// Schedule daily at 8 AM — add a repeatable job on startup
export async function scheduleInsightsCron() {
  // Remove existing repeatable jobs to avoid duplicates on restarts
  const jobs = await insightsCronQueue.getRepeatableJobs();
  for (const job of jobs) await insightsCronQueue.removeRepeatableByKey(job.key);

  await insightsCronQueue.add(
    'daily-insights',
    {},
    { repeat: { pattern: '0 8 * * *' }, jobId: 'daily-insights-cron' },
  );
  logger.info('Insights cron scheduled (daily 8 AM)');
}

export const insightsWorker = new Worker(
  'insights-cron',
  async () => {
    logger.info('Running daily insights generation for all users');
    const users = await prisma.user.findMany({ select: { id: true }, where: { deletedAt: null } });
    let total = 0;
    for (const user of users) {
      try {
        const count = await generateInsights(user.id);
        total += count;
      } catch (err) {
        logger.error({ userId: user.id, err }, 'Failed to generate insights for user');
      }
    }
    logger.info({ total }, 'Daily insights generation complete');
  },
  { connection: redis, concurrency: 1 },
);

insightsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Insights worker job failed');
});
