import { useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const session = useAuthStore((s) => s.session)
  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  if (session) return <Navigate to="/dashboard" replace />

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!resendEmail) return
    setResendStatus('loading')
    const { error } = await supabase.auth.resend({ type: 'signup', email: resendEmail })
    setResendStatus(error ? 'error' : 'sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <FileText className="h-12 w-12 text-indigo-600" />
          <h1 className="mt-3 text-3xl font-bold text-gray-900">ResumeIQ</h1>
          <p className="mt-1 text-gray-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <Auth
            supabaseClient={supabase}
            view="sign_in"
            redirectTo={`${window.location.origin}/auth/callback`}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: { brand: '#4f46e5', brandAccent: '#4338ca' },
                },
              },
            }}
            providers={[]}
            showLinks={false}
          />
          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
              Sign up
            </Link>
          </p>
        </div>

        {/* Resend confirmation section */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setShowResend(!showResend)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>Didn't receive your confirmation email?</span>
            {showResend ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showResend && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4">
              {resendStatus === 'sent' ? (
                <p className="text-sm text-green-600">
                  ✓ Email sent again. Please check your inbox and spam folders.
                </p>
              ) : (
                <form onSubmit={handleResend} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={resendStatus === 'loading'}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {resendStatus === 'loading' ? '...' : 'Resend Email'}
                  </button>
                </form>
              )}
              {resendStatus === 'error' && (
                <p className="mt-2 text-xs text-red-500">Failed to send email. Please check the address and try again.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
