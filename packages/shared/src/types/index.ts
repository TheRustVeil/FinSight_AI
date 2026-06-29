export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'manual' | 'csv' | 'pdf' | 'ocr' | 'api';
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type InsightType =
  | 'spending_spike'
  | 'subscription_detected'
  | 'savings_opportunity'
  | 'anomaly'
  | 'forecast'
  | 'comparison'
  | 'recommendation';
export type InsightSeverity = 'info' | 'warning' | 'alert';
export type UserPlan = 'free' | 'pro' | 'business';
export type UserRole = 'user' | 'admin';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  plan: UserPlan;
  currency: string;
  timezone: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string | null;
  categoryId?: string | null;
  amount: number;
  currency: string;
  type: TransactionType;
  merchant?: string | null;
  description?: string | null;
  notes?: string | null;
  date: string;
  aiCategoryId?: string | null;
  aiConfidence?: number | null;
  aiCategoryConfirmed: boolean;
  source: TransactionSource;
  isRecurring: boolean;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  isSystem: boolean;
}

export interface Budget {
  id: string;
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string | null;
  totalAmount?: number | null;
  isActive: boolean;
}
