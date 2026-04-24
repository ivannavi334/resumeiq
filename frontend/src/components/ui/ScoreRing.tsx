import { cn } from '@/utils/cn'
import { scoreColor } from '@/utils/format'

interface ScoreRingProps {
  score: number | null | undefined
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { ring: 'h-16 w-16', text: 'text-lg', label: 'text-xs' },
  md: { ring: 'h-24 w-24', text: 'text-2xl', label: 'text-sm' },
  lg: { ring: 'h-32 w-32', text: 'text-3xl', label: 'text-sm' },
}

export function ScoreRing({ score, label, size = 'md' }: ScoreRingProps) {
  const pct = score ?? 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (pct / 100) * circumference
  const s = sizes[size]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('relative', s.ring)}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-700', score == null ? 'stroke-gray-300' : score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-yellow-500' : 'stroke-red-500')}
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center font-bold', s.text, scoreColor(score))}>
          {score != null ? Math.round(score) : '—'}
        </span>
      </div>
      <span className={cn('text-center text-gray-600', s.label)}>{label}</span>
    </div>
  )
}
