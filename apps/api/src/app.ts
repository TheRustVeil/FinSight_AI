import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requestLogger } from './middleware/request-logger.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { accountsRouter } from './modules/accounts/accounts.router';
import { categoriesRouter } from './modules/categories/categories.router';
import { transactionsRouter } from './modules/transactions/transactions.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { importRouter } from './modules/import/import.router';
import { budgetsRouter } from './modules/budgets/budgets.router';
import { goalsRouter } from './modules/goals/goals.router';
import { aiChatRouter } from './modules/ai/chat/ai-chat.router';
import { insightsRouter } from './modules/insights/insights.router';
import { reportsRouter } from './modules/reports/reports.router';
import { notificationsRouter } from './modules/notifications/notifications.router';

export function createApp() {
  const app = express();

  // ─── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());
  app.set('trust proxy', 1);

  // ─── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ─── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ─── Logging ────────────────────────────────────────────────────────────────
  app.use(requestLogger);

  // ─── Global rate limit ──────────────────────────────────────────────────────
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  }));

  app.use('/api/v1/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many auth requests' } },
  }));

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/accounts', accountsRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/transactions', transactionsRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/import', importRouter);
  app.use('/api/v1/budgets', budgetsRouter);
  app.use('/api/v1/goals', goalsRouter);
  app.use('/api/v1/ai', aiChatRouter);
  app.use('/api/v1/insights', insightsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/notifications', notificationsRouter);

  // ─── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── 404 ────────────────────────────────────────────────────────────────────
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));

  // ─── Error handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
