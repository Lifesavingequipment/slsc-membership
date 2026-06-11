import { LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'

interface HeaderProps {
  clubName?: string
}

export function Header({ clubName = 'Surf Life Saving Club' }: HeaderProps) {
  const { user, signOut } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full" style={{ background: '#E63329' }} />
        <div>
          <h1 className="text-base md:text-lg font-semibold text-gray-800 leading-tight">{clubName}</h1>
          <p className="text-xs text-gray-400 md:hidden leading-tight">SLSC Membership</p>
        </div>
      </div>

      {/* Desktop: email + sign out */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center">
            <User className="w-4 h-4 text-gray-800" />
          </div>
          <span>{user?.email}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500 hover:text-gray-700">
          <LogOut className="w-4 h-4 mr-1.5" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
