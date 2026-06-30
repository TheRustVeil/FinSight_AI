import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  parentId: z.string().uuid().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export async function listCategories(userId: string) {
  const categories = await prisma.category.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    include: { children: { select: { id: true, name: true, slug: true, icon: true, color: true } } },
  });
  return categories.filter((c) => !c.parentId); // return top-level; children nested
}

export async function createCategory(userId: string, data: z.infer<typeof createCategorySchema>) {
  const existing = await prisma.category.findFirst({ where: { slug: data.slug, userId } });
  if (existing) throw ApiError.conflict('A category with this slug already exists');
  return prisma.category.create({
    data: { userId, ...data, isSystem: false } as Prisma.CategoryUncheckedCreateInput,
  });
}

export async function updateCategory(userId: string, categoryId: string, data: z.infer<typeof updateCategorySchema>) {
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId, isSystem: false } });
  if (!cat) throw ApiError.notFound('Category');
  return prisma.category.update({ where: { id: categoryId }, data });
}

export async function deleteCategory(userId: string, categoryId: string) {
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId, isSystem: false } });
  if (!cat) throw ApiError.notFound('Category');
  // Null out category on transactions before deleting
  await prisma.transaction.updateMany({ where: { categoryId }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id: categoryId } });
}
