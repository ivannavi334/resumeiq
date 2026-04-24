export type UserPlan = 'free' | 'pro'

/** Row from public.users in Supabase */
export interface UserProfile {
  id: string
  email: string
  plan: UserPlan
  analyses_count: number
  created_at: string
}

export type ResumeStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Resume {
  id: string
  filename: string
  original_filename: string
  file_url: string | null
  file_size: number | null
  created_at: string
}

export interface AnalysisSuggestion {
  category: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

export interface ResumeAnalysis {
  id: string
  resume_id: string
  job_description: string | null
  status: ResumeStatus
  overall_score: number | null
  ats_score: number | null
  skills_match_score: number | null
  experience_score: number | null
  format_score: number | null
  strengths: string[] | null
  weaknesses: string[] | null
  suggestions: AnalysisSuggestion[] | null
  keywords_found: string[] | null
  keywords_missing: string[] | null
  ai_summary: string | null
  error_message: string | null
  created_at: string
  updated_at: string | null
}

export interface Plan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
  limits: { analyses_per_month: number }
  stripe_price_id?: string
}

export interface ApiError {
  detail: string
}
