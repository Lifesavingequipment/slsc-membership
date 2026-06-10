import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, UserPlus, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/members/add', label: 'Add Member', icon: UserPlus },
  { to: '/roles', label: 'Roles', icon: Shield },
]

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 flex flex-col shrink-0">
      {/* Logo strip */}
      <div className="h-16 flex items-center px-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E63329] flex items-center justify-center">
            <span className="text-white font-bold text-xs">SL</span>
          </div>
          <span className="text-white font-semibold text-sm">SLSC Membership</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#E63329] text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <div className="h-2 w-full rounded-full" style={{ background: 'linear-gradient(90deg, #E63329 50%, #FFD700 50%)' }} />
      </div>
    </aside>
  )
}
