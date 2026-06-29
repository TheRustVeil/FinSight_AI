'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, type CreateBudgetInput } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/lib/formatters';

// ── Form schema ───────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().min(1, 'Start date required'),
  categories: z.array(z.object({
    categoryId: z.string().uuid('Select a category'),
    allocatedAmount: z.coerce.number().positive('Must be > 0'),
    alertAtPercent: z.coerce.number().int().min(1).max(100).default(80),
  })).min(1, 'Add at least one category'),
});
type FormValues = z.infer<typeof formSchema>;

// ── Budget Form Modal ─────────────────────────────────────────────────────────

function BudgetModal({ initial, onClose }: { initial?: Record<string, unknown>; onClose: () => void }) {
  const { data: categoriesData = [] } = useCategories();
  const categories = (categoriesData as Record<string, unknown>[]).filter((c) => !(c.parentId as string | null));
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial ? {
      name: initial.name as string,
      period: initial.period as 'weekly' | 'monthly' | 'yearly',
      startDate: (initial.startDate as string)?.split('T')[0],
      categories: (initial.budgetCategories as Record<string, unknown>[])?.map((bc) => ({
        categoryId: bc.categoryId as string,
        allocatedAmount: bc.allocatedAmount as number,
        alertAtPercent: bc.alertAtPercent as number,
      })) ?? [],
    } : {
      period: 'monthly',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      categories: [{ categoryId: '', allocatedAmount: 0, alertAtPercent: 80 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'categories' });

  async function onSubmit(values: FormValues) {
    const data: CreateBudgetInput = {
      name: values.name,
      period: values.period,
      startDate: values.startDate,
      categories: values.categories,
    };
    if (initial) {
      await updateBudget.mutateAsync({ id: initial.id as string, data });
    } else {
      await createBudget.mutateAsync(data);
    }
    onClose();
  }

  const isLoading = createBudget.isPending || updateBudget.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{initial ? 'Edit Budget' : 'New Budget'}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Budget Name</label>
            <input {...register('name')} placeholder="e.g. Monthly Expenses" className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Period</label>
              <select {...register('period')} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Start Date</label>
              <input type="date" {...register('startDate')} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Category Limits</label>
              <button type="button" onClick={() => append({ categoryId: '', allocatedAmount: 0, alertAtPercent: 80 })} className="text-xs text-primary hover:text-primary/80 font-medium">
                + Add category
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Controller
                    name={`categories.${i}.categoryId`}
                    control={control}
                    render={({ field: f }) => (
                      <select {...f} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
                        <option value="">Select category</option>
                        {(categories as Record<string, unknown>[]).map((c) => (
                          <option key={c.id as string} value={c.id as string}>{c.icon as string} {c.name as string}</option>
                        ))}
                      </select>
                    )}
                  />
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <input type="number" {...register(`categories.${i}.allocatedAmount`)} placeholder="0" className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.categories && <p className="text-xs text-red-500 mt-1">{errors.categories.root?.message ?? errors.categories.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial ? 'Save Changes' : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Utilization bar ───────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-primary';
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

interface BudgetCategoryUtil {
  id: string;
  categoryId: string;
  category: { name: string; icon?: string; color?: string };
  allocatedAmount: number;
  spent: number;
  percentage: number;
  isOverBudget: boolean;
  alertAtPercent: number;
}

interface BudgetItem {
  id: string;
  name: string;
  period: string;
  startDate: string;
  budgetCategories: Record<string, unknown>[];
  utilization: {
    totalSpent: number;
    totalLimit: number;
    totalPercentage: number;
    periodStart: string;
    periodEnd: string;
    categories: BudgetCategoryUtil[];
  };
}

function BudgetCard({ budget, onEdit, onDelete }: { budget: BudgetItem; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const u = budget.utilization;
  const isOver = u.totalPercentage >= 100;
  const isAlert = u.totalPercentage >= 80 && !isOver;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{budget.name}</h3>
              {isOver && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">Over Budget</span>}
              {isAlert && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Alert
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{budget.period} · {u.periodStart} → {u.periodEnd}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex items-end justify-between mb-2">
          <div>
            <p className={`text-2xl font-bold ${isOver ? 'text-red-500' : 'text-foreground'}`}>{formatCurrency(u.totalSpent)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(u.totalLimit)} limit</p>
          </div>
          <p className={`text-xl font-bold ${isOver ? 'text-red-500' : isAlert ? 'text-yellow-500' : 'text-primary'}`}>{u.totalPercentage}%</p>
        </div>
        <UtilBar pct={u.totalPercentage} />
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-2.5 border-t border-border text-xs text-muted-foreground hover:bg-muted/30 text-left flex items-center justify-between transition-colors"
      >
        <span>{u.categories.length} categories</span>
        <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-border pt-3">
          {u.categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{cat.category?.icon} {cat.category?.name}</span>
                <span className={`text-xs font-medium ${cat.isOverBudget ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {formatCurrency(cat.spent)} / {formatCurrency(cat.allocatedAmount)}
                </span>
              </div>
              <UtilBar pct={cat.percentage} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const { data: budgets = [], isLoading } = useBudgets();
  const deleteBudget = useDeleteBudget();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budgets</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track spending limits by category for the current period</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Budget
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : !(budgets as unknown[]).length ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No budgets yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Set spending limits per category to stay on track</p>
          <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(budgets as BudgetItem[]).map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => { setEditTarget(b as unknown as Record<string, unknown>); setShowModal(true); }}
              onDelete={() => setDeleteTarget(b.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <BudgetModal initial={editTarget ?? undefined} onClose={() => { setShowModal(false); setEditTarget(null); }} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Budget?</h3>
            <p className="text-muted-foreground text-sm mb-6">Removes the budget and all category limits. Your transactions are not deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => deleteBudget.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {deleteBudget.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
