'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useCreateTransaction, useUpdateTransaction, useTransaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

const schema = z.object({
  merchant: z.string().min(1, 'Merchant is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense', 'transfer']),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionForm({ transactionId, onClose }: Props) {
  const isEdit = !!transactionId;
  const { data: existing } = useTransaction(transactionId ?? '');
  const { data: categories = [] } = useCategories();
  const { mutate: create, isPending: creating } = useCreateTransaction();
  const { mutate: update, isPending: updating } = useUpdateTransaction();
  const isPending = creating || updating;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense', date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    if (existing) {
      reset({
        merchant: existing.merchant ?? '',
        amount: existing.amount,
        type: existing.type,
        date: existing.date?.split('T')[0] ?? '',
        categoryId: existing.categoryId ?? '',
        description: existing.description ?? '',
        notes: existing.notes ?? '',
      });
    }
  }, [existing, reset]);

  function onSubmit(data: FormData) {
    const payload = { ...data, categoryId: data.categoryId || undefined };
    if (isEdit) {
      update({ id: transactionId!, ...payload }, { onSuccess: onClose });
    } else {
      create(payload, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{isEdit ? 'Edit transaction' : 'Add transaction'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['expense', 'income', 'transfer'] as const).map((t) => (
                <label key={t} className="cursor-pointer">
                  <input {...register('type')} type="radio" value={t} className="sr-only" />
                  <span className={`block text-center text-xs font-medium py-2 rounded-lg border transition-colors ${
                    t === 'expense' ? 'border-red-500/50 text-red-500 has-[:checked]:bg-red-500/10' :
                    t === 'income' ? 'border-green-500/50 text-green-500 has-[:checked]:bg-green-500/10' :
                    'border-blue-500/50 text-blue-500 has-[:checked]:bg-blue-500/10'
                  }`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Amount (₹)</label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          {/* Merchant */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Merchant / Source</label>
            <input
              {...register('merchant')}
              placeholder="e.g. Swiggy, Salary Credit"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.merchant && <p className="text-red-500 text-xs mt-1">{errors.merchant.message}</p>}
          </div>

          {/* Date + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Date</label>
              <input
                {...register('date')}
                type="date"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
              <select
                {...register('categoryId')}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Auto-detect</option>
                {Array.isArray(categories) && categories.map((c: { id: string; name: string; icon?: string }) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Notes (optional)</label>
            <input
              {...register('notes')}
              placeholder="Any additional notes..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
