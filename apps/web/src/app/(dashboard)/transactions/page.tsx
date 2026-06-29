'use client';

import { useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, ArrowLeftRight, Loader2, Trash2, Pencil } from 'lucide-react';
import { useTransactions, useDeleteTransaction, type TransactionFilters } from '@/hooks/useTransactions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { TransactionForm } from '@/components/transactions/TransactionForm';

const TYPE_COLORS = {
  income: 'text-green-500 bg-green-500/10',
  expense: 'text-red-500 bg-red-500/10',
  transfer: 'text-blue-500 bg-blue-500/10',
};
const TYPE_ICONS = { income: TrendingUp, expense: TrendingDown, transfer: ArrowLeftRight };

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20, sortBy: 'date', sortOrder: 'desc' });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useTransactions({ ...filters, search: search || undefined });
  const { mutate: deleteTransaction } = useDeleteTransaction();

  const transactions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {meta ? `${meta.total} total transactions` : 'All your transactions'}
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant or description..."
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={filters.type ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, type: (e.target.value as 'income' | 'expense' | 'transfer') || undefined, page: 1 }))}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as ['date' | 'amount', 'asc' | 'desc'];
            setFilters((f) => ({ ...f, sortBy, sortOrder, page: 1 }));
          }}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Highest amount</option>
          <option value="amount-asc">Lowest amount</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No transactions yet</p>
            <p className="text-muted-foreground text-sm mt-1">Add your first transaction to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Add transaction
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Merchant</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Type</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t: Record<string, unknown>) => {
                const Icon = TYPE_ICONS[(t.type as keyof typeof TYPE_ICONS)] ?? ArrowLeftRight;
                const category = t.category as { icon?: string; name?: string } | null;
                return (
                  <tr key={t.id as string} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(t.date as string)}</td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium truncate max-w-[180px]">{(t.merchant as string) || 'Unknown'}</p>
                      {!!t.description && <p className="text-muted-foreground text-xs truncate max-w-[180px]">{t.description as string}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {category ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted">
                          {category.icon} {category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[t.type as keyof typeof TYPE_COLORS]}`}>
                        <Icon className="w-3 h-3" />
                        {(t.type as string).charAt(0).toUpperCase() + (t.type as string).slice(1)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-green-500' : 'text-foreground'}`}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount as number)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingId(t.id as string); setShowForm(true); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this transaction?')) deleteTransaction(t.id as string); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <TransactionForm
          transactionId={editingId}
          onClose={() => { setShowForm(false); setEditingId(null); }}
        />
      )}
    </div>
  );
}
