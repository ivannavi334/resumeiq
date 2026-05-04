import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { FileText } from 'lucide-react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const session = useAuthStore((s) => s.session)

  if (session) return <Navigate to="/dashboard" replace />

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
      </div>
    </div>
  )
}
