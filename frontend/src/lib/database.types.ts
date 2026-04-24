export type UserPlan = 'free' | 'pro'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          plan: UserPlan
          analyses_count: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          plan?: UserPlan
          analyses_count?: number
          created_at?: string
        }
        Update: {
          email?: string
          plan?: UserPlan
          analyses_count?: number
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
