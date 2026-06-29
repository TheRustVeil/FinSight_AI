export interface SystemCategory {
  slug: string;
  name: string;
  icon: string;
  color: string;
  parentSlug?: string;
}

export const SYSTEM_CATEGORIES: SystemCategory[] = [
  { slug: 'food', name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
  { slug: 'transport', name: 'Transport', icon: '🚗', color: '#f97316' },
  { slug: 'shopping', name: 'Shopping', icon: '🛍️', color: '#eab308' },
  { slug: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { slug: 'health', name: 'Health & Medical', icon: '❤️', color: '#ec4899' },
  { slug: 'utilities', name: 'Utilities', icon: '💡', color: '#06b6d4' },
  { slug: 'housing', name: 'Housing & Rent', icon: '🏠', color: '#3b82f6' },
  { slug: 'education', name: 'Education', icon: '📚', color: '#10b981' },
  { slug: 'travel', name: 'Travel', icon: '✈️', color: '#6366f1' },
  { slug: 'personal-care', name: 'Personal Care', icon: '💄', color: '#f43f5e' },
  { slug: 'business', name: 'Business', icon: '💼', color: '#64748b' },
  { slug: 'investment', name: 'Investment', icon: '📈', color: '#22c55e' },
  { slug: 'income', name: 'Income', icon: '💰', color: '#16a34a' },
  { slug: 'salary', name: 'Salary', icon: '💵', color: '#16a34a', parentSlug: 'income' },
  { slug: 'freelance', name: 'Freelance', icon: '💻', color: '#16a34a', parentSlug: 'income' },
  { slug: 'other', name: 'Other', icon: '📌', color: '#94a3b8' },
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['swiggy', 'zomato', 'restaurant', 'hotel', 'cafe', 'food', 'kitchen', 'dhaba', 'biryani', 'pizza', 'mcdonalds', 'dominos', 'kfc'],
  transport: ['uber', 'ola', 'rapido', 'namma yatri', 'metro', 'irctc', 'railways', 'petrol', 'fuel', 'auto'],
  shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'reliance', 'dmart', 'mall'],
  entertainment: ['netflix', 'spotify', 'youtube', 'prime', 'hotstar', 'disney', 'cinema', 'pvr', 'inox', 'bookmyshow'],
  health: ['pharmacy', 'hospital', 'clinic', 'doctor', 'medicine', 'apollo', 'practo', '1mg', 'medplus'],
  utilities: ['electricity', 'bescom', 'tata power', 'gas', 'water', 'broadband', 'jio', 'airtel', 'bsnl', 'recharge'],
  housing: ['rent', 'maintenance', 'housing', 'landlord', 'society'],
  education: ['udemy', 'coursera', 'byju', 'unacademy', 'school', 'college', 'books', 'tuition'],
  travel: ['makemytrip', 'goibibo', 'oyo', 'airbnb', 'flight', 'hotel booking', 'cleartrip', 'yatra'],
  income: ['salary', 'credit', 'cashback', 'refund', 'interest', 'dividend'],
};
