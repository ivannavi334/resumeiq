import { supabase } from '@/lib/supabase'
import { api } from '@/services/api'
import type { UserProfile } from '@/types'

export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  async getProfile(): Promise<UserProfile | null> {
    try {
      const { data } = await api.get<UserProfile>('/auth/me')
      return data
    } catch {
      return null
    }
  },
}
