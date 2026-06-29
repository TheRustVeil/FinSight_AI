'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { User, Bell, Palette, Sparkles, Trash2, Loader2, Check, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { useProfile, usePreferences, useUpdateProfile, useUpdatePreferences, useDeleteAccount } from '@/hooks/useSettings';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';

type Tab = 'profile' | 'notifications' | 'appearance' | 'ai' | 'danger';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI & Automation', icon: Sparkles },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

// ── Reusable toggle ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-500 animate-fade-in">
      <Check className="w-3 h-3" /> Saved
    </span>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { data: profile } = useProfile();
  const { data: prefs } = usePreferences();
  const updateProfile = useUpdateProfile();
  const updatePrefs = useUpdatePreferences();
  const deleteAccount = useDeleteAccount();
  const { theme, setTheme } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  // Profile form local state
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? '');
      setCurrency(profile.currency ?? 'INR');
      setTimezone(profile.timezone ?? 'Asia/Kolkata');
    }
  }, [profile]);

  function saveProfile() {
    updateProfile.mutate({ fullName, currency, timezone });
  }

  function updatePref(key: string, value: boolean | number) {
    updatePrefs.mutate({ [key]: value });
  }

  function handleDeleteAccount() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => { logout(); router.push('/login'); },
    });
  }

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? t.id === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile */}
          {tab === 'profile' && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Profile Information</h2>
                <SavedBadge show={updateProfile.isSuccess} />
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white text-xl font-bold">
                  {fullName.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{profile?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile?.plan ?? 'free'} plan</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                  </select>
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={updateProfile.isPending}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          )}

          {/* Notifications */}
          {tab === 'notifications' && prefs && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-foreground">Notification Preferences</h2>
                <SavedBadge show={updatePrefs.isSuccess} />
              </div>
              <div className="divide-y divide-border">
                <Toggle label="Email notifications" description="Receive budget alerts and reports via email" checked={prefs.notificationEmail} onChange={(v) => updatePref('notificationEmail', v)} />
                <Toggle label="In-app notifications" description="Show alerts in the notification center" checked={prefs.notificationInApp} onChange={(v) => updatePref('notificationInApp', v)} />
              </div>
              <div className="pt-4 mt-2 border-t border-border">
                <label className="text-sm font-medium text-foreground">Budget alert threshold</label>
                <p className="text-xs text-muted-foreground mb-3">Get alerted when a category reaches this % of its budget</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={50} max={100} step={5}
                    value={prefs.budgetAlertThreshold}
                    onChange={(e) => updatePref('budgetAlertThreshold', Number(e.target.value))}
                    className="flex-1 accent-white"
                  />
                  <span className="text-sm font-semibold text-foreground w-12 text-right">{prefs.budgetAlertThreshold}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {tab === 'appearance' && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-4">Appearance</h2>
              <label className="text-sm font-medium text-foreground">Theme</label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {([
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: Monitor },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === t.id ? 'border-primary/40 bg-primary/10' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <t.icon className={`w-5 h-5 ${theme === t.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${theme === t.id ? 'text-primary' : 'text-foreground'}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI */}
          {tab === 'ai' && prefs && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-foreground">AI & Automation</h2>
                <SavedBadge show={updatePrefs.isSuccess} />
              </div>
              <div className="divide-y divide-border">
                <Toggle
                  label="Auto-categorize transactions"
                  description="Let AI automatically assign categories to new transactions"
                  checked={prefs.aiAutoCategorize}
                  onChange={(v) => updatePref('aiAutoCategorize', v)}
                />
              </div>
              <div className="mt-4 p-4 bg-muted/40 rounded-lg">
                <p className="text-sm text-foreground font-medium mb-1">How it works</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  New transactions are first matched against a keyword rules engine. High-confidence matches (≥85%) are auto-applied; lower-confidence ones are suggested for your review.
                </p>
              </div>
            </div>
          )}

          {/* Danger zone */}
          {tab === 'danger' && (
            <div className="bg-card border border-red-500/30 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-red-500">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mt-1">Irreversible account actions</p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Sign out</p>
                  <p className="text-xs text-muted-foreground">Log out of your account on this device</p>
                </div>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete your account?</h3>
            <p className="text-muted-foreground text-sm mb-6">This permanently deletes all your transactions, budgets, goals, and data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {deleteAccount.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
