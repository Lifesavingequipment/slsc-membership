import { useEffect, useState } from 'react'
import { Users, UserCheck, UserX, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  rolesAssigned: number
}

interface ExpiringQual {
  id: string
  memberId: string
  memberName: string
  qualName: string
  expiryDate: string
  daysRemaining: number
}

interface RecentMember {
  id: string
  name: string
  membershipType: string
  joinDate: string | null
}

interface TypeCount {
  type: string
  count: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysColor(days: number): string {
  if (days < 30)  return 'text-red-600 font-semibold'
  if (days < 60)  return 'text-orange-500 font-semibold'
  return 'text-yellow-600 font-semibold'
}

function daysLabel(days: number): string {
  if (days < 0)  return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  return `${days}d`
}

const TYPE_LABELS: Record<string, string> = {
  senior: 'Senior', nipper: 'Nipper', associate: 'Associate', life: 'Life',
}
const TYPE_COLORS: Record<string, string> = {
  senior: 'bg-blue-500', nipper: 'bg-yellow-400', associate: 'bg-purple-500', life: 'bg-orange-500',
}
const TYPE_ORDER = ['senior', 'nipper', 'associate', 'life']

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, loading,
}: {
  label: string; value: number; icon: React.ElementType; color: string; loading: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {loading
        ? <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
        : <p className="text-3xl font-bold text-gray-900">{value}</p>
      }
    </div>
  )
}

function Badge({ count, red }: { count: number; red?: boolean }) {
  return (
    <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
      red ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
    }`}>
      {count}
    </span>
  )
}

function QualTable({ rows, expired }: { rows: ExpiringQual[]; expired: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        {expired ? 'No expired qualifications' : 'No qualifications expiring soon'}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Member</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Qualification</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Expiry Date</th>
            <th className="text-left py-2 font-medium text-gray-500">
              {expired ? 'Expired' : 'Days Remaining'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="py-2 pr-4">
                <Link
                  to="/members"
                  className="text-[#E63329] hover:underline font-medium"
                >
                  {row.memberName}
                </Link>
              </td>
              <td className="py-2 pr-4 text-gray-700">{row.qualName}</td>
              <td className="py-2 pr-4 text-gray-600">{formatDate(row.expiryDate)}</td>
              <td className={`py-2 ${expired ? 'text-red-600 font-semibold' : daysColor(row.daysRemaining)}`}>
                {expired ? `${Math.abs(row.daysRemaining)}d ago` : daysLabel(row.daysRemaining)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [stats, setStats]               = useState<Stats>({ totalMembers: 0, activeMembers: 0, inactiveMembers: 0, rolesAssigned: 0 })
  const [expiring, setExpiring]         = useState<ExpiringQual[]>([])
  const [expired, setExpired]           = useState<ExpiringQual[]>([])
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [typeCounts, setTypeCounts]     = useState<TypeCount[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr    = today.toISOString().split('T')[0]
      const in90        = new Date(today)
      in90.setDate(in90.getDate() + 90)
      const in90Str     = in90.toISOString().split('T')[0]

      const [
        totalRes, activeRes, inactiveRes, rolesRes,
        expiringRes, expiredRes, recentRes, typeRes,
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('membership_status', 'active'),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('membership_status', 'inactive'),
        supabase.from('roles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase
          .from('member_qualifications')
          .select('id, member_id, expiry_date, members(first_name, last_name), qualifications(name)')
          .eq('status', 'current')
          .gte('expiry_date', todayStr)
          .lte('expiry_date', in90Str)
          .order('expiry_date', { ascending: true }),
        supabase
          .from('member_qualifications')
          .select('id, member_id, expiry_date, members(first_name, last_name), qualifications(name)')
          .eq('status', 'current')
          .lt('expiry_date', todayStr)
          .order('expiry_date', { ascending: false }),
        supabase
          .from('members')
          .select('id, first_name, last_name, preferred_name, membership_type, join_date')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('members')
          .select('membership_type'),
      ])

      setStats({
        totalMembers:    totalRes.count   ?? 0,
        activeMembers:   activeRes.count  ?? 0,
        inactiveMembers: inactiveRes.count ?? 0,
        rolesAssigned:   rolesRes.count   ?? 0,
      })

      // Expiring quals
      const toExpQual = (rows: any[]): ExpiringQual[] =>
        (rows ?? []).map((r: any) => {
          const m = Array.isArray(r.members) ? r.members[0] : r.members
          const q = Array.isArray(r.qualifications) ? r.qualifications[0] : r.qualifications
          return {
            id: r.id,
            memberId: r.member_id,
            memberName: m ? `${m.first_name} ${m.last_name}` : 'Unknown',
            qualName: q?.name ?? 'Unknown',
            expiryDate: r.expiry_date,
            daysRemaining: daysUntil(r.expiry_date),
          }
        })

      setExpiring(toExpQual(expiringRes.data ?? []))
      setExpired(toExpQual(expiredRes.data ?? []))

      // Recent members
      setRecentMembers(
        (recentRes.data ?? []).map((m: any) => ({
          id: m.id,
          name: m.preferred_name
            ? `${m.preferred_name} ${m.last_name}`
            : `${m.first_name} ${m.last_name}`,
          membershipType: m.membership_type,
          joinDate: m.join_date,
        }))
      )

      // Type counts
      const countMap: Record<string, number> = {}
      for (const row of (typeRes.data ?? [])) {
        const t = (row.membership_type ?? 'unknown').toLowerCase()
        countMap[t] = (countMap[t] ?? 0) + 1
      }
      setTypeCounts(TYPE_ORDER.map(t => ({ type: t, count: countMap[t] ?? 0 })))

      setLoading(false)
    }
    load()
  }, [])

  const totalForBar = typeCounts.reduce((s, t) => s + t.count, 0) || 1

  const TYPE_BADGE: Record<string, string> = {
    senior: 'bg-blue-100 text-blue-800',
    nipper: 'bg-yellow-100 text-yellow-800',
    associate: 'bg-purple-100 text-purple-800',
    life: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of your club membership</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members"    value={stats.totalMembers}    icon={Users}     color="bg-blue-500"     loading={loading} />
        <StatCard label="Active Members"   value={stats.activeMembers}   icon={UserCheck} color="bg-green-500"    loading={loading} />
        <StatCard label="Inactive Members" value={stats.inactiveMembers} icon={UserX}     color="bg-gray-400"     loading={loading} />
        <StatCard label="Roles Assigned"   value={stats.rolesAssigned}   icon={Shield}    color="bg-[#E63329]"    loading={loading} />
      </div>

      {/* ── Expiring Qualifications ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-base mb-4">
          Qualifications Expiring Soon
          <Badge count={expiring.length} />
        </h3>
        <QualTable rows={expiring} expired={false} />
      </div>

      {/* ── Expired Qualifications ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-base mb-4">
          Expired Qualifications
          <Badge count={expired.length} red />
        </h3>
        <QualTable rows={expired} expired={true} />
      </div>

      {/* ── Bottom two columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-base mb-4">Recently Added Members</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentMembers.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No members yet</p>
          ) : (
            <>
              <div className="space-y-0">
                {recentMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <Link
                        to="/members"
                        className="text-sm font-medium text-[#E63329] hover:underline"
                      >
                        {m.name}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.joinDate ? formatDate(m.joinDate) : 'No join date'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[m.membershipType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[m.membershipType] ?? m.membershipType}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-2 border-t border-gray-100">
                <Link to="/members" className="text-sm text-[#E63329] hover:underline font-medium">
                  View all members →
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Membership Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-base mb-4">Membership Breakdown</h3>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {typeCounts.map(({ type, count }) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{TYPE_LABELS[type]}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${TYPE_COLORS[type]}`}
                      style={{ width: `${(count / totalForBar) * 100}%`, transition: 'width 0.5s ease' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
