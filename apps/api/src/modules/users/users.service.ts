import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';
import { z } from 'zod';

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
});

export const updatePreferencesSchema = z.object({
  notificationEmail: z.boolean().optional(),
  notificationInApp: z.boolean().optional(),
  budgetAlertThreshold: z.number().min(1).max(100).optional(),
  aiAutoCategorize: z.boolean().optional(),
  dashboardWidgets: z.array(z.string()).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true, email: true, fullName: true, avatarUrl: true,
      role: true, plan: true, currency: true, timezone: true, createdAt: true,
    },
  });
  if (!user) throw ApiError.notFound('User');
  return user;
}

export async function updateUser(userId: string, data: z.infer<typeof updateUserSchema>) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, fullName: true, avatarUrl: true, currency: true, timezone: true },
  });
}

export async function deleteUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
}

export async function getPreferences(userId: string) {
  return prisma.userPreference.findUnique({ where: { userId } });
}

export async function updatePreferences(userId: string, data: z.infer<typeof updatePreferencesSchema>) {
  return prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
