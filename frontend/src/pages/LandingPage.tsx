import { Link } from 'react-router-dom'
import {
  Upload, Zap, TrendingUp, Check, ArrowRight, Star,
  FileText, ChevronRight, Building2, Sparkles,
} from 'lucide-react'

// ─── Static pricing data ─────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out ResumeIQ.',
    features: [
      '3 resume analyses / month',
      'ATS compatibility score',
      'Basic feedback report',
    ],
    cta: 'Get started free',
    ctaTo: '/register',
    highlighted: false,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For serious job seekers who want every edge.',
    features: [
      '50 resume analyses / month',
      'ATS compatibility score',
      'Job description matching',
      'Keyword gap analysis',
      'Detailed improvement tips',
    ],
    cta: 'Start Pro',
    ctaTo: '/register',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For teams, recruiters, and career coaches.',
    features: [
      'Unlimited analyses',
      'All Pro features',
      'API access',
      'Team management',
      'Dedicated support',
    ],
    cta: 'Contact sales',
    ctaTo: '/register',
    highlighted: false,
    badge: null,
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer @ Google',
    avatar: 'SC',
    text: 'I was getting zero callbacks for months. ResumeIQ showed me my ATS score was 34% — I fixed the keywords it flagged and landed 3 interviews within two weeks.',
    stars: 5,
  },
  {
    name: 'Marcus Williams',
    role: 'Product Manager @ Stripe',
    avatar: 'MW',
    text: 'The job description matching is insane. It literally tells you which keywords you\'re missing for a specific role. Worth every cent of the Pro plan.',
    stars: 5,
  },
  {
    name: 'Priya Nair',
    role: 'UX Designer @ Figma',
    avatar: 'PN',
    text: 'Uploaded my resume at 11pm, fixed what ResumeIQ recommended, applied at midnight. Had a recruiter call by 9am. Not joking.',
    stars: 5,
  },
]

// ─── Score mockup data ────────────────────────────────────────────────────────

const MOCK_SCORES = [
  { label: 'Overall', score: 87, color: 'stroke-green-400' },
  { label: 'ATS Match', score: 91, color: 'stroke-green-400' },
  { label: 'Keywords', score: 78, color: 'stroke-yellow-400' },
  { label: 'Formatting', score: 95, color: 'stroke-green-400' },
]

const MOCK_KEYWORDS = ['React', 'TypeScript', 'Node.js', 'REST APIs', 'CI/CD', 'AWS']
const MOCK_MISSING = ['GraphQL', 'Docker', 'Kubernetes']

// ─── Sub-components ───────────────────────────────────────────────────────────

function MockScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#27272a" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
          {score}
        </span>
      </div>
      <span className="text-xs text-zinc-400">{label}</span>
    </div>
  )
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">ResumeIQ</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
            <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="h-[600px] w-[900px] -translate-y-1/4 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          Powered by GPT-4o — instant results
        </div>

        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Get Your Resume Past{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI Filters
          </span>
          {' '}— Instantly
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Upload your resume, get a detailed ATS score, keyword gaps, and actionable fixes in under 10 seconds.
          Stop guessing why you're not getting callbacks.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            <Upload className="h-4 w-4" />
            Analyze my resume free
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-7 py-3.5 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            See how it works
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        <p className="mt-5 text-sm text-zinc-500">Free plan · No credit card required · Results in seconds</p>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight">Three steps to more interviews</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                icon: <Upload className="h-6 w-6 text-indigo-400" />,
                title: 'Upload your resume',
                description: 'Drop your PDF, Word, or text resume. Optionally paste the job description you\'re targeting.',
              },
              {
                step: '02',
                icon: <Zap className="h-6 w-6 text-violet-400" />,
                title: 'AI analyzes everything',
                description: 'GPT-4o scans your resume against ATS patterns, keywords, formatting rules, and industry standards.',
              },
              {
                step: '03',
                icon: <TrendingUp className="h-6 w-6 text-emerald-400" />,
                title: 'Improve and reapply',
                description: 'Get a prioritized list of fixes with exact keywords to add. Apply them, re-upload, watch your score climb.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition-colors hover:border-zinc-700"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                    {item.icon}
                  </div>
                  <span className="text-4xl font-bold text-zinc-800 transition-colors group-hover:text-zinc-700">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Score mockup ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">Results preview</p>
            <h2 className="text-4xl font-bold tracking-tight">
              Everything you need to fix your resume
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-400">
              A full breakdown of where your resume stands — and exactly what to do about it.
            </p>
          </div>

          {/* Mockup card */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40">
            {/* Mockup top bar */}
            <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3.5">
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="ml-3 text-xs text-zinc-500">senior-engineer-resume.pdf — Analysis complete</span>
              <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                ✓ Completed
              </span>
            </div>

            <div className="grid gap-0 lg:grid-cols-5">
              {/* Left: scores */}
              <div className="border-b border-zinc-800 p-8 lg:col-span-2 lg:border-b-0 lg:border-r">
                <h3 className="mb-6 text-sm font-medium uppercase tracking-wider text-zinc-500">Score breakdown</h3>
                <div className="flex flex-wrap justify-center gap-8 lg:justify-start">
                  {MOCK_SCORES.map((s) => (
                    <MockScoreRing key={s.label} {...s} />
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  <h4 className="text-sm font-medium text-zinc-400">Top strengths</h4>
                  {['Strong quantified achievements', 'Consistent formatting', 'Relevant tech stack'].map((s) => (
                    <div key={s} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: keywords & tips */}
              <div className="p-8 lg:col-span-3">
                <div className="mb-8">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">Matched keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_KEYWORDS.map((kw) => (
                      <span key={kw} className="rounded-lg bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                        {kw}
                      </span>
                    ))}
                    {MOCK_MISSING.map((kw) => (
                      <span key={kw} className="rounded-lg bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400 ring-1 ring-red-500/20">
                        {kw} missing
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">Improvement suggestions</h3>
                  <div className="space-y-3">
                    {[
                      { priority: 'High', text: 'Add "Docker" and "Kubernetes" — appear in 89% of target job postings' },
                      { priority: 'High', text: 'Include a "GraphQL" project or experience — listed in job description' },
                      { priority: 'Medium', text: 'Quantify impact in 2 bullet points (e.g., "reduced latency by 40%")' },
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl bg-zinc-800 p-4">
                        <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          tip.priority === 'High'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {tip.priority}
                        </span>
                        <p className="text-sm leading-relaxed text-zinc-300">{tip.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">Pricing</p>
            <h2 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-zinc-400">Start free. Upgrade when you need more analyses.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'border-2 border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10'
                    : 'border border-zinc-800 bg-zinc-900'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-indigo-300' : 'text-zinc-200'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="mb-1 text-sm text-zinc-500">{plan.period}</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                      <Check className={`h-4 w-4 shrink-0 ${plan.highlighted ? 'text-indigo-400' : 'text-emerald-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.ctaTo}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500'
                      : plan.id === 'enterprise'
                      ? 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700'
                      : 'border border-zinc-700 bg-transparent text-zinc-300 hover:border-zinc-500 hover:text-white'
                  }`}
                >
                  {plan.id === 'enterprise' && <Building2 className="h-4 w-4" />}
                  {plan.id === 'pro' && <Zap className="h-4 w-4" />}
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">Testimonials</p>
            <h2 className="text-4xl font-bold tracking-tight">Loved by job seekers</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                <StarRating count={t.stars} />
                <blockquote className="mt-4 flex-1 text-zinc-300 leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 border-t border-zinc-800 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-300">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-violet-950/40 p-12 text-center shadow-2xl shadow-indigo-500/5">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
            </div>
            <Sparkles className="mx-auto mb-4 h-8 w-8 text-indigo-400" />
            <h2 className="text-4xl font-bold tracking-tight">
              Ready to land more interviews?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-zinc-400">
              Join thousands of job seekers who improved their interview rate with ResumeIQ.
              It takes 30 seconds to find out where your resume stands.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
            >
              <Upload className="h-4 w-4" />
              Analyze my resume — it's free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">ResumeIQ</span>
          </div>
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} ResumeIQ. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-zinc-500">
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
