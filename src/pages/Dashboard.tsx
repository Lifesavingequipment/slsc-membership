import { useEffect, useState } from 'react'
import { Users, UserCheck, Shield, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Stats {
  totalMembers: number
  activeMembers: number
  totalRoles: number
  clubName: string
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, activeMembers: 0, totalRoles: 0, clubName: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [membersRes, activeMembersRes, rolesRes, clubRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('membership_status', 'active'),
        supabase.from('roles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('clubs').select('club_name').limit(1).single(),
      ])
      setStats({
        totalMembers: membersRes.count ?? 0,
        activeMembers: activeMembersRes.count ?? 0,
        totalRoles: rolesRes.count ?? 0,
        clubName: clubRes.data?.club_name ?? '',
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Members', value: stats.activeMembers, icon: UserCheck, color: 'bg-green-500' },
    { label: 'Active Roles', value: stats.totalRoles, icon: Shield, color: 'bg-[#E63329]' },
    { label: 'Club', value: stats.clubName || '—', icon: Building2, color: 'bg-[#FFD700]', isText: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of your club membership</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className={`font-bold text-gray-900 ${isText ? 'text-base' : 'text-3xl'}`}>{value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#E63329]" />
          <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
          <h3 className="font-semibold text-gray-800 ml-1">Welcome to the SLSC Membership Portal</h3>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          Use the sidebar to navigate between members, roles, and club management. All data is synced live with your Supabase database.
        </p>
      </div>
    </div>
  )
}
