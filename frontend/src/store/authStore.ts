import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  initialize: () => Promise<void>
  setProfile: (profile: UserProfile | null) => void
  logout: () => Promise<void>
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase.from('users').select('*').eq('id', userId).single()
  return data as UserProfile | null
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const profile = session ? await fetchProfile(session.user.id) : null
    set({ session, user: session?.user ?? null, profile, isLoading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await fetchProfile(session.user.id) : null
      set({ session, user: session?.user ?? null, profile })
    })
  },

  setProfile: (profile) => set({ profile }),

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },
}))
