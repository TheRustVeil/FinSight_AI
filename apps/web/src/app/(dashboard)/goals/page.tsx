'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Target, CheckCircle2, PlusCircle, History } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useAddContribution, useDeleteContribution,
  type CreateGoalInput, type AddContributionInput,
} from '@/hooks/useGoals';
import { formatCurrency, formatDate, formatRelative } from '@/lib/formatters';

// ── Goal form modal ───────────────────────────────────────────────────────────

const goalSchema = z.object({
  name: z.string().min(1, 'Name required'),
  targetAmount: z.coerce.number().positive('Must be > 0'),
  targetDate: z.string().optional(),
  category: z.string().optional(),
});
type GoalFormValues = z.infer<typeof goalSchema>;

const GOAL_CATEGORIES = ['Emergency Fund', 'Vacation', 'Home', 'Vehicle', 'Education', 'Wedding', 'Retirement', 'Investment', 'Other'];

function GoalModal({ initial, onClose }: { initial?: Record<string, unknown>; onClose: () => void }) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const { register, handleSubmit, formState: { errors } } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: initial ? {
      name: initial.name as string,
      targetAmount: initial.targetAmount as number,
      targetDate: initial.targetDate ? (initial.targetDate as string).split('T')[0] : '',
      category: initial.category as string ?? '',
    } : {},
  });

  async function onSubmit(values: GoalFormValues) {
    const data: CreateGoalInput = {
      name: values.name,
      targetAmount: values.targetAmount,
      targetDate: values.targetDate || undefined,
      category: values.category || undefined,
    };
    if (initial) await updateGoal.mutateAsync({ id: initial.id as string, data });
    else await createGoal.mutateAsync(data);
    onClose();
  }

  const isLoading = createGoal.isPending || updateGoal.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{initial ? 'Edit Goal' : 'New Savings Goal'}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Goal Name</label>
            <input {...register('name')} placeholder="e.g. Emergency Fund" className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Target Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <input type="number" {...register('targetAmount')} placeholder="0" className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
            {errors.targetAmount && <p className="text-xs text-red-500 mt-1">{errors.targetAmount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Target Date <span className="text-muted-foreground">(optional)</span></label>
              <input type="date" {...register('targetDate')} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <select {...register('category')} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
                <option value="">None</option>
                {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Contribution modal ────────────────────────────────────────────────────────

const contribSchema = z.object({
  amount: z.coerce.number().positive('Must be > 0'),
  notes: z.string().optional(),
  contributedAt: z.string().optional(),
});
type ContribFormValues = z.infer<typeof contribSchema>;

function ContributionModal({ goalId, goalName, remaining, onClose }: { goalId: string; goalName: string; remaining: number; onClose: () => void }) {
  const addContribution = useAddContribution();
  const { register, handleSubmit, formState: { errors } } = useForm<ContribFormValues>({
    resolver: zodResolver(contribSchema),
    defaultValues: { contributedAt: new Date().toISOString().split('T')[0] },
  });

  async function onSubmit(values: ContribFormValues) {
    const data: AddContributionInput = { amount: values.amount, notes: values.notes || undefined, contributedAt: values.contributedAt };
    await addContribution.mutateAsync({ goalId, data });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Add Contribution</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{goalName} · {formatCurrency(remaining)} remaining</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <input type="number" autoFocus {...register('amount')} placeholder="0" className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Date</label>
            <input type="date" {...register('contributedAt')} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground">(optional)</span></label>
            <input {...register('notes')} placeholder="e.g. Salary savings" className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={addContribution.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              {addContribution.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────────

interface Contribution {
  id: string;
  amount: number;
  notes?: string;
  contributedAt: string;
}

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  remaining: number;
  targetDate?: string;
  category?: string;
  isCompleted: boolean;
  contributions: Contribution[];
}

function GoalCard({ goal, onEdit, onDelete, onContribute }: {
  goal: GoalItem;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const deleteContrib = useDeleteContribution();

  const daysLeft = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${goal.isCompleted ? 'border-green-500/30' : 'border-border'}`}>
      {goal.isCompleted && (
        <div className="bg-green-500/10 px-5 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">Goal Achieved! ðŸŽ‰</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{goal.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {goal.category && <span className="text-xs text-muted-foreground">{goal.category}</span>}
              {daysLeft !== null && !goal.isCompleted && (
                <span className={`text-xs ${daysLeft < 30 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  {daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(goal.currentAmount)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(goal.targetAmount)}</p>
          </div>
          <p className={`text-xl font-bold ${goal.isCompleted ? 'text-green-500' : 'text-primary'}`}>{goal.percentage}%</p>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 mb-1">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${goal.isCompleted ? 'bg-green-500' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, goal.percentage)}%` }}
          />
        </div>
        {!goal.isCompleted && <p className="text-xs text-muted-foreground">{formatCurrency(goal.remaining)} to go</p>}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {!goal.isCompleted && (
            <button onClick={onContribute} className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg transition-colors">
              <PlusCircle className="w-3.5 h-3.5" /> Add Money
            </button>
          )}
          <button onClick={() => setShowHistory((s) => !s)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <History className="w-3.5 h-3.5" /> History ({goal.contributions.length})
          </button>
        </div>
      </div>

      {/* Contribution history */}
      {showHistory && goal.contributions.length > 0 && (
        <div className="border-t border-border px-5 pb-4 pt-3 space-y-2">
          {goal.contributions.map((c) => (
            <div key={c.id} className="flex items-center gap-3 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground text-xs">{formatDate(c.contributedAt, 'dd MMM yyyy')}</span>
              <span className="font-medium text-green-500 ml-auto">+{formatCurrency(c.amount)}</span>
              {c.notes && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{c.notes}</span>}
              <button
                onClick={() => deleteContrib.mutate({ goalId: goal.id, contributionId: c.id })}
                className="p-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                title="Remove contribution"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showHistory && goal.contributions.length === 0 && (
        <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">No contributions yet</div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [contributeTarget, setContributeTarget] = useState<GoalItem | null>(null);

  const active = (goals as GoalItem[]).filter((g) => !g.isCompleted);
  const completed = (goals as GoalItem[]).filter((g) => g.isCompleted);

  const totalSaved = active.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Savings Goals</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track progress toward your financial milestones</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowGoalModal(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Summary strip */}
      {active.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-4 sm:gap-8">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Saved (active goals)</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSaved)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Target</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalTarget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Still Needed</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(Math.max(0, totalTarget - totalSaved))}</p>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-full bg-muted rounded-full h-3">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: totalTarget > 0 ? `${Math.min(100, (totalSaved / totalTarget) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : active.length === 0 && completed.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No goals yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Create a savings goal and track progress toward it</p>
          <button onClick={() => setShowGoalModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Create your first goal
          </button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onEdit={() => { setEditTarget(g as unknown as Record<string, unknown>); setShowGoalModal(true); }}
                  onDelete={() => setDeleteTarget(g.id)}
                  onContribute={() => setContributeTarget(g)}
                />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed Goals ({completed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onEdit={() => { setEditTarget(g as unknown as Record<string, unknown>); setShowGoalModal(true); }}
                    onDelete={() => setDeleteTarget(g.id)}
                    onContribute={() => setContributeTarget(g)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showGoalModal && (
        <GoalModal initial={editTarget ?? undefined} onClose={() => { setShowGoalModal(false); setEditTarget(null); }} />
      )}

      {contributeTarget && (
        <ContributionModal
          goalId={contributeTarget.id}
          goalName={contributeTarget.name}
          remaining={contributeTarget.remaining}
          onClose={() => setContributeTarget(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Goal?</h3>
            <p className="text-muted-foreground text-sm mb-6">This will delete the goal and all contribution history.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => deleteGoal.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {deleteGoal.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
