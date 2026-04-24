import { Link, useNavigate } from 'react-router-dom'
import { FileText, LogOut, User, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'

const planVariant = { free: 'default', pro: 'purple' } as const

export function Navbar() {
  const { user, profile, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-indigo-600">
          <FileText className="h-6 w-6" />
          <span className="text-lg">ResumeIQ</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            {profile && (
              <Badge variant={planVariant[profile.plan] ?? 'default'} className="capitalize">
                {profile.plan}
              </Badge>
            )}
            <Link to="/billing" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Plans
            </Link>
            <Link to="/profile" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:flex items-center gap-1">
              <User className="h-4 w-4" />
              {user.email}
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
