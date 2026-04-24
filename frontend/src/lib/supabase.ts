import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

console.log('Supabase env check:', { supabaseUrl: supabaseUrl ? 'present' : 'missing', supabaseAnonKey: supabaseAnonKey ? 'present' : 'missing' })

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL in frontend build environment')
}

try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL: "${supabaseUrl}" - ${error}`)
}

if (!supabaseAnonKey) {
  console.warn('Missing VITE_SUPABASE_ANON_KEY in frontend build environment')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
