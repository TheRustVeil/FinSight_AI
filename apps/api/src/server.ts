import './config/env';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import './workers/import.worker';
import { scheduleInsightsCron } from './workers/insights.worker';

async function bootstrap() {
  const app = createApp();

  scheduleInsightsCron().catch((err) => logger.error({ err }, 'Failed to schedule insights cron'));

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 FinSight API running on http://localhost:${env.PORT}`);
    logger.info(`📦 Environment: ${env.NODE_ENV}`);
  });

  async function shutdown() {
    logger.info('Shutting down...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
