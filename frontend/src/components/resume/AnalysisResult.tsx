import { CheckCircle, XCircle, AlertTriangle, Award, ChevronRight } from 'lucide-react'
import type { ResumeAnalysis } from '@/types'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { cn } from '@/utils/cn'

interface AnalysisResultProps {
  analysis: ResumeAnalysis
}

const priorityConfig = {
  high:   { label: 'High',   className: 'bg-red-50 border-red-200 text-red-700',    dot: 'bg-red-500' },
  medium: { label: 'Medium', className: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
  low:    { label: 'Low',    className: 'bg-blue-50 border-blue-200 text-blue-700',  dot: 'bg-blue-400' },
} as const

function scoreGradient(score: number | null | undefined) {
  const s = score ?? 0
  if (s >= 80) return 'from-emerald-500 to-green-400'
  if (s >= 60) return 'from-amber-500 to-yellow-400'
  return 'from-red-500 to-rose-400'
}

function scoreBg(score: number | null | undefined) {
  const s = score ?? 0
  if (s >= 80) return 'bg-emerald-50 border-emerald-100'
  if (s >= 60) return 'bg-amber-50 border-amber-100'
  return 'bg-red-50 border-red-100'
}

function scoreLabel(score: number | null | undefined) {
  const s = score ?? 0
  if (s >= 80) return { text: 'Excellent', color: 'text-emerald-600' }
  if (s >= 60) return { text: 'Good', color: 'text-amber-600' }
  return { text: 'Needs Work', color: 'text-red-600' }
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  if (analysis.status === 'failed') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-900">Analysis Failed</p>
            <p className="mt-0.5 text-sm text-red-700">{analysis.error_message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (analysis.status !== 'completed') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
        <p className="font-semibold text-gray-900">Analyzing your resume…</p>
        <p className="mt-1 text-sm text-gray-500">Our AI is reviewing your resume against the job requirements</p>
      </div>
    )
  }

  const lbl = scoreLabel(analysis.overall_score)

  return (
    <div className="space-y-5">

      {/* ── Hero: Overall Score ── */}
      <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-8', scoreGradient(analysis.overall_score))}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
              <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - (analysis.overall_score ?? 0) / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-black text-white">
                  {analysis.overall_score != null ? Math.round(analysis.overall_score) : '—'}
                </span>
                <span className="block text-xs font-medium text-white/80">/ 100</span>
              </div>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Award className="h-3.5 w-3.5" />
              Overall Score
            </div>
            <h2 className="mt-2 text-3xl font-black text-white">{lbl.text}</h2>
            {analysis.ai_summary && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">{analysis.ai_summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-scores grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { score: analysis.ats_score,          label: 'ATS' },
          { score: analysis.skills_match_score,  label: 'Skills' },
          { score: analysis.experience_score,    label: 'Experience' },
          { score: analysis.format_score,        label: 'Format' },
        ].map(({ score, label }) => (
          <div key={label} className={cn('flex flex-col items-center gap-3 rounded-2xl border p-5', scoreBg(score))}>
            <ScoreRing score={score} label={label} size="md" />
          </div>
        ))}
      </div>

      {/* ── Strengths & Weaknesses ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-100 px-6 py-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Strengths</h3>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {analysis.strengths.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-50 px-6 py-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 py-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm text-gray-700">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.weaknesses && analysis.weaknesses.length > 0 && (
          <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-orange-100 px-6 py-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Improvements</h3>
              <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                {analysis.weaknesses.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-50 px-6 py-2">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-3 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <span className="text-sm text-gray-700">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Suggestions / ATS Issues ── */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900">ATS Issues & Suggestions</h3>
          </div>
          <ul className="divide-y divide-gray-50 p-3">
            {analysis.suggestions.map((s, i) => {
              const cfg = priorityConfig[s.priority] ?? priorityConfig.low
              return (
                <li key={i} className={cn('flex items-start gap-3 rounded-xl border p-4', cfg.className)}>
                  <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{s.category}</span>
                      <span className="rounded-full border border-current/20 bg-white/60 px-2 py-0.5 text-xs font-medium">
                        {cfg.label} priority
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{s.suggestion}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-40" />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Keywords ── */}
      {(analysis.keywords_found?.length || analysis.keywords_missing?.length) ? (
        <div className="grid gap-4 md:grid-cols-2">
          {analysis.keywords_found && analysis.keywords_found.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-emerald-100 px-6 py-4">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-gray-900">Keywords Found</h3>
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {analysis.keywords_found.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 px-6 py-5">
                {analysis.keywords_found.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle className="h-3 w-3" />
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.keywords_missing && analysis.keywords_missing.length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-red-100 px-6 py-4">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <h3 className="font-semibold text-gray-900">Keywords Missing</h3>
                <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {analysis.keywords_missing.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 px-6 py-5">
                {analysis.keywords_missing.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                    <XCircle className="h-3 w-3" />
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

    </div>
  )
}
