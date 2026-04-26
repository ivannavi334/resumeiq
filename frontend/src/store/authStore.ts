import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { api } from '@/services/api'
import type { UserProfile } from '@/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  initialize: () => Promise<void>
  setProfile: (profile: UserProfile | null) => void
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const { data } = await api.get<UserProfile>('/auth/me')
    return data
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const profile = session ? await fetchProfile() : null
    set({ session, user: session?.user ?? null, profile, isLoading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await fetchProfile() : null
      set({ session, user: session?.user ?? null, profile })
    })
  },

  setProfile: (profile) => set({ profile }),

  refreshProfile: async () => {
    const profile = await fetchProfile()
    set({ profile })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },
}))
