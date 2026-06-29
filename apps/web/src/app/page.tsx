import Link from 'next/link';
import type { Metadata } from 'next';
import { LogoMark } from '@/components/layout/Logo';
import { Reveal } from '@/components/landing/Reveal';
import { CountUp } from '@/components/landing/CountUp';
import { HeroPreview } from '@/components/landing/HeroPreview';

export const metadata: Metadata = {
  title: 'FinSight AI — Your AI-Powered Personal Finance Copilot',
};

const navLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Platform', href: '#platform' },
  { label: 'FAQ', href: '#faq' },
];

const marquee = ['Groceries', 'Rent', 'Transport', 'Subscriptions', 'Dining', 'Travel', 'Utilities', 'Health', 'Shopping', 'Income', 'Savings', 'Investments'];

const capabilities = [
  { tag: 'Proactive', title: 'Track', desc: 'Every transaction across accounts is captured, deduplicated, and reconciled the moment it lands.' },
  { tag: 'Reactive', title: 'Categorize', desc: 'A rules engine and AI classify spending in real time — no manual tagging, no spreadsheets.' },
  { tag: 'Intelligence', title: 'Forecast', desc: 'A model of your cash flow projects next month by category and flags drift before it happens.' },
  { tag: 'Platform', title: 'Advise', desc: 'Ask anything in natural language and get data-backed answers grounded in your real numbers.' },
];

const faqs = [
  { q: 'How does FinSight categorize my spending?', a: 'A keyword rules engine handles high-confidence matches instantly; anything ambiguous is passed to the AI and surfaced for a one-tap review.' },
  { q: 'Can I import existing statements?', a: 'Yes — upload CSV exports or bank statements and FinSight parses, categorizes, and reconciles them automatically.' },
  { q: 'Is my financial data secure?', a: 'Access tokens live only in memory, refresh tokens are stored hashed in HttpOnly cookies, and every query is parameterized. Your data is never sold.' },
  { q: 'What can the AI advisor actually do?', a: 'It reads a live snapshot of your income, budgets, goals, and top categories, then answers questions and builds plans against your real situation.' },
];

function SectionLabel({ num, eyebrow, title }: { num: string; eyebrow: string; title: string }) {
  return (
    <Reveal className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <span className="section-num">{num}</span>
        <span className="h-px w-8 bg-border" />
        <span className="label-mono">{eyebrow}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground max-w-2xl">{title}</h2>
    </Reveal>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <span className="font-semibold tracking-tight">FinSight AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div
          className="pointer-events-none absolute inset-0 animate-gradient-pan"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% -10%, hsl(173 80% 90%), transparent 55%)',
            backgroundSize: '200% 200%',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 mb-8 bg-background animate-fade-up">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="label-mono !text-[10px]">AI-Powered Finance Copilot</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05] mb-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
            Finance that
            <br />
            runs itself.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '180ms' }}>
            FinSight is the autonomous system for your money — continuously tracking,
            categorizing, and improving how you spend, save, and plan.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up" style={{ animationDelay: '280ms' }}>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all text-sm"
            >
              Start for free
            </Link>
            <Link
              href="/login"
              className="border border-border bg-background text-foreground font-medium px-6 py-3 rounded-lg hover:bg-muted hover:-translate-y-0.5 transition-all text-sm"
            >
              Explore the demo
            </Link>
          </div>

          {/* Stat strip with count-up */}
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 mt-16 pt-10 border-t border-border animate-fade-up" style={{ animationDelay: '380ms' }}>
            {[
              { node: <CountUp to={12000} suffix="+" />, label: 'transactions tracked' },
              { node: <CountUp to={98} suffix="%" />, label: 'auto-categorized' },
              { node: <CountUp to={2} prefix="<" suffix="s" />, label: 'AI response time' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-semibold tracking-tight tabular-nums">{s.node}</div>
                <div className="label-mono mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Animated dashboard preview */}
        <div className="relative max-w-4xl mx-auto px-6 pb-16">
          <HeroPreview />
        </div>

        {/* Marquee of categories */}
        <div className="relative border-t border-border py-5 overflow-hidden">
          <div className="flex w-max animate-marquee gap-3">
            {[...marquee, ...marquee].map((c, i) => (
              <span key={i} className="label-mono border border-border rounded-full px-4 py-1.5 whitespace-nowrap">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 02 · Product ── */}
      <section id="product" className="max-w-6xl mx-auto px-6 py-24 border-b border-border">
        <SectionLabel num="02" eyebrow="A new layer of your finances" title="Your money, understood." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Continuous tracking', desc: 'Transactions reconcile themselves the moment they post — no spreadsheets, no end-of-month cleanup.' },
            { title: 'A model of your money', desc: 'FinSight builds a live picture of income, budgets, and goals that every feature reasons over.' },
            { title: 'It operates, you decide', desc: 'Spending spikes, subscription creep, and budget drift are flagged before they cost you.' },
          ].map((c, i) => (
            <Reveal
              key={c.title}
              delay={i * 120}
              className="rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-black/[0.04]"
            >
              <h3 className="font-semibold text-lg mb-2 tracking-tight">{c.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 04 · Platform ── */}
      <section id="platform" className="max-w-6xl mx-auto px-6 py-24 border-b border-border">
        <SectionLabel num="04" eyebrow="One platform. An army of agents." title="Your stack is our stack." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {capabilities.map((c, i) => (
            <Reveal
              key={c.title}
              delay={i * 110}
              className="group rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-black/[0.04]"
            >
              <div className="label-mono text-primary/80 mb-4">{c.tag}</div>
              <h3 className="text-2xl font-semibold tracking-tight mb-2 group-hover:text-primary transition-colors">{c.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Quote ── */}
      <section className="max-w-4xl mx-auto px-6 py-24 border-b border-border text-center">
        <Reveal>
          <p className="text-2xl sm:text-3xl font-medium tracking-tight leading-snug">
            “You may be able to track your spending, but if you can&apos;t see what&apos;s coming,
            you can&apos;t actually plan. FinSight closes that gap.”
          </p>
          <div className="mt-6 label-mono">Built for students, professionals &amp; families</div>
        </Reveal>
      </section>

      {/* ── 05 · FAQ ── */}
      <section id="faq" className="max-w-6xl mx-auto px-6 py-24 border-b border-border">
        <SectionLabel num="05" eyebrow="Operating your finances" title="Frequently asked." />
        <div className="border-t border-border">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 80} className="grid md:grid-cols-2 gap-4 py-6 border-b border-border">
              <h3 className="font-medium tracking-tight">{f.q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.a}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 06 · CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <Reveal className="relative overflow-hidden rounded-2xl border border-border bg-muted/40 px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-grid-sm opacity-50" />
          <div className="relative">
            <div className="label-mono mb-5">Get started today</div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Ready to put your finances on autopilot?</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto leading-relaxed">
              Join thousands who trust FinSight AI to track, categorize, and grow their money.
            </p>
            <Link
              href="/register"
              className="inline-block bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all text-sm"
            >
              Create your free account
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <LogoMark size={24} />
              <span className="font-semibold tracking-tight text-sm">FinSight AI</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-[200px]">
              The autonomous system for your personal finances.
            </p>
          </div>
          {[
            { head: 'Product', links: ['Dashboard', 'Budgets', 'AI Advisor'] },
            { head: 'Company', links: ['About', 'Careers'] },
            { head: 'Resources', links: ['Docs', 'Privacy', 'Terms'] },
          ].map((col) => (
            <div key={col.head}>
              <div className="label-mono mb-4">{col.head}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}><span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted-foreground">
            © 2025 FinSight AI — Built with Next.js &amp; Claude.
          </div>
        </div>
      </footer>
    </div>
  );
}
