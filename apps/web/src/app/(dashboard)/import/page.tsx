'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { usePreviewCsv, useStartImport, useImportBatches, useImportBatch, useDeleteImport, type ColumnMapping, type CsvPreview } from '@/hooks/useImport';
import { formatCurrency, formatDate, formatRelative } from '@/lib/formatters';

// ── Step types ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'processing' | 'review' | 'history';

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['date', 'amount'];
const ALL_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'merchant', label: 'Merchant / Description', required: false },
  { key: 'description', label: 'Notes', required: false },
  { key: 'type', label: 'Transaction Type Column', required: false },
  { key: 'typeExpenseValue', label: 'Value that means "Expense"', required: false },
];

// ── Upload step ───────────────────────────────────────────────────────────────

function UploadStep({ onFile }: { onFile: (f: File, preview: CsvPreview) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = usePreviewCsv();

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) return alert('Only CSV files are supported');
    const result = await preview.mutateAsync(file);
    onFile(file, result);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a CSV export from your bank to bulk import transactions</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          dragging ? 'border-primary/40 bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/40'
        }`}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {preview.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Reading file…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Drop your CSV here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse · Max 10 MB</p>
            </div>
          </div>
        )}
        {preview.isError && (
          <p className="mt-3 text-sm text-red-500">{(preview.error as Error).message}</p>
        )}
      </div>

      <div className="bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground mb-2">Supported CSV formats</p>
        <p>• HDFC Bank · ICICI Bank · SBI · Axis Bank exports</p>
        <p>• Any CSV with Date, Amount, and Description columns</p>
        <p>• Column names are mapped in the next step</p>
      </div>
    </div>
  );
}

// ── Column mapping step ───────────────────────────────────────────────────────

function MapStep({ file, preview, onConfirm, onBack }: { file: File; preview: CsvPreview; onConfirm: (m: ColumnMapping) => void; onBack: () => void }) {
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', amount: '' });

  // Auto-detect common column names
  useEffect(() => {
    const h = preview.headers;
    const find = (...names: string[]) => h.find((c) => names.some((n) => c.toLowerCase().includes(n)));
    setMapping({
      date: find('date', 'txn date', 'value date', 'transaction date') ?? '',
      amount: find('amount', 'debit', 'credit', 'withdrawal', 'deposit') ?? '',
      merchant: find('description', 'narration', 'particulars', 'remarks', 'merchant', 'payee') ?? '',
      description: '',
      type: find('type', 'dr/cr', 'txn type', 'cr/dr') ?? '',
      typeExpenseValue: 'Dr',
    });
  }, [preview.headers]);

  const isValid = REQUIRED_FIELDS.every((f) => mapping[f]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Map Columns</h1>
          <p className="text-muted-foreground text-sm">Tell us which columns in your CSV match our fields</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> {file.name}
            <span className="text-muted-foreground ml-auto">{preview.headers.length} columns detected</span>
          </p>
        </div>

        <div className="p-4 space-y-4">
          {ALL_FIELDS.map(({ key, label, required }) => (
            <div key={key} className="flex items-center gap-4">
              <label className="w-48 text-sm font-medium text-foreground shrink-0">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={mapping[key] ?? ''}
                onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value || undefined }))}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="">— Skip —</option>
                {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">Preview (first 5 rows)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {preview.headers.map((h) => (
                  <th key={h} className={`px-3 py-2 text-left font-medium text-muted-foreground ${Object.values(mapping).includes(h) ? 'text-primary' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {preview.headers.map((h) => (
                    <td key={h} className={`px-3 py-2 text-foreground ${Object.values(mapping).includes(h) ? 'bg-primary/10' : ''}`}>{row[h] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onConfirm(mapping)}
          disabled={!isValid}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          Start Import <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Processing step ───────────────────────────────────────────────────────────

function ProcessingStep({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { data, isLoading } = useImportBatch(batchId);
  const batch = data?.batch;
  const progress = data?.progress;

  useEffect(() => {
    if (batch?.status === 'completed' || batch?.status === 'failed') {
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
  }, [batch?.status, onDone]);

  const pct = progress?.total ? Math.round(((progress.processed as number) / (progress.total as number)) * 100) : 0;

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        {batch?.status === 'completed' ? (
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        ) : batch?.status === 'failed' ? (
          <AlertCircle className="w-10 h-10 text-red-500" />
        ) : (
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">
          {batch?.status === 'completed' ? 'Import Complete!' : batch?.status === 'failed' ? 'Import Failed' : 'Importing…'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {progress?.processed as number ?? 0} of {progress?.total as number ?? batch?.totalRows ?? '?'} rows processed
        </p>
      </div>

      {/* Progress bar */}
      {batch?.status === 'processing' || batch?.status === 'pending' ? (
        <div className="w-full bg-muted rounded-full h-2.5">
          <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {batch?.status === 'completed' && (
        <div className="flex justify-center gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold text-green-500">{batch.successRows}</p>
            <p className="text-muted-foreground">Imported</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{batch.failedRows}</p>
            <p className="text-muted-foreground">Failed</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review step ───────────────────────────────────────────────────────────────

function ReviewStep({ batchId, onNew }: { batchId: string; onNew: () => void }) {
  const { data } = useImportBatch(batchId);
  const deleteImport = useDeleteImport();
  const txns = data?.transactions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Imported Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">{txns.length} transactions imported — categories auto-detected where possible</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => deleteImport.mutate(batchId, { onSuccess: onNew })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Undo Import
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm transition-colors"
          >
            <Upload className="w-4 h-4" /> Import Another
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Merchant</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No transactions found</td>
                </tr>
              ) : (
                txns.map((t: Record<string, unknown>) => {
                  const cat = t.category as { icon?: string; name?: string } | null;
                  return (
                    <tr key={t.id as string} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.date as string, 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{(t.merchant as string) || <span className="text-muted-foreground italic">Unknown</span>}</td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {cat.icon} {cat.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {t.type as string}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-foreground'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount as number)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {txns.length >= 200 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
            Showing first 200 transactions · Go to the <a href="/transactions" className="text-primary hover:underline">Transactions page</a> to see all
          </div>
        )}
      </div>
    </div>
  );
}

// ── History panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ onSelectBatch }: { onSelectBatch: (id: string) => void }) {
  const { data: batches = [], isLoading } = useImportBatches();
  const deleteImport = useDeleteImport();

  if (isLoading) return <div className="h-20 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!batches.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mt-8">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Previous Imports</p>
      </div>
      {(batches as Record<string, unknown>[]).map((b) => (
        <div key={b.id as string} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{b.filename as string}</p>
            <p className="text-xs text-muted-foreground">{formatRelative(b.createdAt as string)} · {b.totalRows as number} rows</p>
          </div>
          <StatusBadge status={b.status as string} />
          {b.status === 'completed' && (
            <button onClick={() => onSelectBatch(b.id as string)} className="text-xs text-primary hover:underline shrink-0">View</button>
          )}
          <button onClick={() => deleteImport.mutate(b.id as string)} className="p-1 hover:text-red-500 text-muted-foreground transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:    { label: 'Pending',    className: 'bg-yellow-500/10 text-yellow-400' },
    processing: { label: 'Processing', className: 'bg-blue-500/10 text-blue-400' },
    completed:  { label: 'Completed',  className: 'bg-green-500/10 text-green-400' },
    failed:     { label: 'Failed',     className: 'bg-red-500/10 text-red-400' },
  };
  const s = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const startImport = useStartImport();

  function handleFileReady(f: File, preview: CsvPreview) {
    setFile(f);
    setCsvPreview(preview);
    setStep('map');
  }

  async function handleMappingConfirmed(mapping: ColumnMapping) {
    if (!file) return;
    const result = await startImport.mutateAsync({ file, mapping });
    setBatchId(result.batchId);
    setStep('processing');
  }

  function reset() {
    setStep('upload');
    setFile(null);
    setCsvPreview(null);
    setBatchId(null);
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Step indicator */}
      {step !== 'upload' && (
        <div className="flex items-center gap-2 mb-8 text-xs text-muted-foreground">
          {(['upload', 'map', 'processing', 'review'] as Step[]).map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`font-medium capitalize ${s === step ? 'text-primary' : ''}`}>{s}</span>
              {i < 3 && <ChevronRight className="w-3 h-3" />}
            </span>
          ))}
        </div>
      )}

      {step === 'upload' && (
        <>
          <UploadStep onFile={handleFileReady} />
          <HistoryPanel onSelectBatch={(id) => { setBatchId(id); setStep('review'); }} />
        </>
      )}
      {step === 'map' && file && csvPreview && (
        <MapStep file={file} preview={csvPreview} onConfirm={handleMappingConfirmed} onBack={() => setStep('upload')} />
      )}
      {step === 'processing' && batchId && (
        <ProcessingStep batchId={batchId} onDone={() => setStep('review')} />
      )}
      {step === 'review' && batchId && (
        <ReviewStep batchId={batchId} onNew={reset} />
      )}

      {startImport.isError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500">
          {(startImport.error as Error).message}
        </div>
      )}
    </div>
  );
}
