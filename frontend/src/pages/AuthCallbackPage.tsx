import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('Не удалось подтвердить email. Ссылка недействительна или уже использована.')
        } else {
          navigate('/dashboard', { replace: true })
        }
      })
      return
    }

    // Implicit flow: hash contains tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        subscription.unsubscribe()
        navigate('/dashboard', { replace: true })
      }
    })

    // If no code and no hash tokens after a short delay, redirect to login
    const timeout = setTimeout(() => {
      setError('Не удалось подтвердить email. Попробуйте снова.')
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-indigo-600" />
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Ошибка подтверждения</h1>
          <p className="mb-6 text-gray-500">{error}</p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Вернуться к входу
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 animate-pulse text-indigo-600" />
        <p className="text-gray-600">Подтверждаем ваш email...</p>
      </div>
    </div>
  )
}
