import axios, { AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'

const apiPrefix = import.meta.env.VITE_API_PREFIX?.trim() || '/api/v1'
const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim()
let baseURL = apiPrefix

if (rawApiBase) {
  const normalizedApiBase = rawApiBase.replace(/\/$/, '')
  try {
    if (normalizedApiBase.startsWith('/') || normalizedApiBase.startsWith('./') || normalizedApiBase.startsWith('../')) {
      baseURL = `${normalizedApiBase}${apiPrefix}`
    } else {
      new URL(normalizedApiBase)
      baseURL = `${normalizedApiBase}${apiPrefix}`
    }
  } catch (error) {
    // Fallback to relative prefix when env contains invalid URL data.
    console.warn('Invalid VITE_API_BASE_URL, falling back to API prefix:', rawApiBase, error)
    baseURL = apiPrefix
  }
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { data: { session } } = await supabase.auth.refreshSession()
      if (session) {
        original.headers!.Authorization = `Bearer ${session.access_token}`
        return api(original)
      }
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail || error.message
  }
  return 'An unexpected error occurred'
}
