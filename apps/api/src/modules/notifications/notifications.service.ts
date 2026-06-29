import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

type NotificationChannel = 'in_app' | 'email' | 'push';

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Prisma.InputJsonValue;
  channel?: NotificationChannel;
}

// ── Create (used internally by other services/workers) ────────────────────────

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? {},
      channel: input.channel ?? 'in_app',
      isRead: false,
      sentAt: new Date(),
    },
  });
}

// ── Read / manage ─────────────────────────────────────────────────────────────

export async function listNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(userId: string, notificationId: string) {
  const n = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
  if (!n) throw ApiError.notFound('Notification not found');
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function deleteNotification(userId: string, notificationId: string) {
  const n = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
  if (!n) throw ApiError.notFound('Notification not found');
  await prisma.notification.delete({ where: { id: notificationId } });
}

export async function clearAll(userId: string) {
  await prisma.notification.deleteMany({ where: { userId } });
}
