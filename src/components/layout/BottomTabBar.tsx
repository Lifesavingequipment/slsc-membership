import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Shield, MoreHorizontal, UserPlus, LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const TABS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/members', label: 'Members', icon: Users, end: false },
  { to: '/roles', label: 'Roles', icon: Shield, end: false },
]

export function BottomTabBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      {/* Bottom tab bar — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch h-16 md:hidden">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-[#E63329]' : 'text-gray-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive ? 'text-[#E63329]' : 'text-gray-400')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More tab */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-500"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
          <span>More</span>
        </button>
      </nav>

      {/* More slide-up drawer */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900 text-base">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-1">
              <button
                onClick={() => { navigate('/members/add'); setMoreOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 min-h-[52px]"
              >
                <UserPlus className="w-5 h-5 text-gray-400" />
                Add Member
              </button>
              <button
                onClick={() => { signOut(); setMoreOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 min-h-[52px]"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
            <div className="h-8" />
          </div>
        </div>
      )}
    </>
  )
}
