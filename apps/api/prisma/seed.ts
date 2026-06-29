import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemCategories = [
  { name: 'Food & Dining', slug: 'food', icon: '🍔', color: '#ef4444' },
  { name: 'Transport', slug: 'transport', icon: '🚗', color: '#f97316' },
  { name: 'Shopping', slug: 'shopping', icon: '🛍️', color: '#eab308' },
  { name: 'Entertainment', slug: 'entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Health & Medical', slug: 'health', icon: '❤️', color: '#ec4899' },
  { name: 'Utilities', slug: 'utilities', icon: '💡', color: '#06b6d4' },
  { name: 'Housing & Rent', slug: 'housing', icon: '🏠', color: '#3b82f6' },
  { name: 'Education', slug: 'education', icon: '📚', color: '#10b981' },
  { name: 'Travel', slug: 'travel', icon: '✈️', color: '#6366f1' },
  { name: 'Personal Care', slug: 'personal-care', icon: '💄', color: '#f43f5e' },
  { name: 'Business', slug: 'business', icon: '💼', color: '#64748b' },
  { name: 'Investment', slug: 'investment', icon: '📈', color: '#22c55e' },
  { name: 'Income', slug: 'income', icon: '💰', color: '#16a34a' },
  { name: 'Other', slug: 'other', icon: '📌', color: '#94a3b8' },
];

const incomeSubcategories = [
  { name: 'Salary', slug: 'salary', icon: '💵', color: '#16a34a', parentSlug: 'income' },
  { name: 'Freelance', slug: 'freelance', icon: '💻', color: '#16a34a', parentSlug: 'income' },
  { name: 'Business Income', slug: 'business-income', icon: '🏢', color: '#16a34a', parentSlug: 'income' },
  { name: 'Investment Returns', slug: 'investment-returns', icon: '📊', color: '#16a34a', parentSlug: 'income' },
];

// Idempotent create-if-missing for system categories (slug has no unique constraint,
// so we look up by slug + isSystem before inserting). Returns the category id.
async function ensureCategory(data: {
  name: string;
  slug: string;
  icon: string;
  color: string;
  parentId?: string | null;
}): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { slug: data.slug, isSystem: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      icon: data.icon,
      color: data.color,
      isSystem: true,
      userId: null,
      parentId: data.parentId ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  console.log('Seeding system categories...');

  // Top-level categories first; keep a slug → id map for parent resolution
  const slugToId: Record<string, string> = {};
  for (const cat of systemCategories) {
    slugToId[cat.slug] = await ensureCategory(cat);
  }

  // Income subcategories, resolving parentId to the real parent UUID
  for (const sub of incomeSubcategories) {
    const parentId = slugToId[sub.parentSlug] ?? null;
    await ensureCategory({ ...sub, parentId });
  }

  console.log('✅ Seeded', systemCategories.length + incomeSubcategories.length, 'categories');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
