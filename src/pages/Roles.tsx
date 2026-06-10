import { useEffect, useState, useCallback } from 'react'
import { X, Plus, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Role, Member } from '../types/database'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  club_admin:     'Club Admin',
  committee:      'Committee',
  patrol_captain: 'Patrol Captain',
  irb_trainer:    'IRB Trainer',
  coach:          'Coach',
  patrol_member:  'Patrol Member',
  nipper_parent:  'Nipper Parent',
  member:         'Member',
}

export const ALL_ROLES = Object.keys(ROLE_LABELS)

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleWithMember extends Role {
  member?: Member
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(m: Member) {
  return `${m.preferred_name || m.first_name} ${m.last_name}`
}

function fmtDate(val: string | null | undefined) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ member }: { member: Member }) {
  const initial = (member.preferred_name || member.first_name).charAt(0).toUpperCase()
  if (member.profile_photo_url) {
    return (
      <img
        src={member.profile_photo_url}
        alt=""
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#E63329] flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {initial}
    </div>
  )
}

// ─── Assign Role Modal ────────────────────────────────────────────────────────

interface AssignModalProps {
  members: Member[]
  existingRoles: RoleWithMember[]
  clubId: string
  currentUserEmail: string
  onClose: () => void
  onSaved: () => void
}

function AssignModal({ members, existingRoles, clubId, currentUserEmail, onClose, onSaved }: AssignModalProps) {
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return [m.first_name, m.last_name, m.preferred_name, m.email]
      .some(v => v?.toLowerCase().includes(q))
  })

  const save = async () => {
    setError('')
    if (!selectedMemberId) { setError('Please select a member.'); return }
    if (!selectedRole)     { setError('Please select a role.'); return }

    const isDuplicate = existingRoles.some(
      r => r.member_id === selectedMemberId && r.role_name === selectedRole && r.is_active
    )
    if (isDuplicate) { setError('This member already has that active role.'); return }

    setSaving(true)
    const { error: dbErr } = await supabase.from('roles').insert({
      club_id:     clubId,
      member_id:   selectedMemberId,
      role_name:   selectedRole,
      assigned_by: currentUserEmail,
      assigned_at: new Date().toISOString(),
      is_active:   true,
    })
    setSaving(false)
    if (dbErr) { setError('Failed to assign role. Please try again.'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Assign Role</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Member search + select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Member <span className="text-[#E63329]">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedMemberId('') }}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]"
              />
            </div>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              size={Math.min(Math.max(filtered.length, 1), 6)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]"
            >
              {filtered.length === 0 ? (
                <option disabled value="">No members found</option>
              ) : (
                <>
                  <option value="">Select a member…</option>
                  {filtered.map(m => (
                    <option key={m.id} value={m.id}>{displayName(m)}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Role select */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Role <span className="text-[#E63329]">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]"
            >
              <option value="">Select role…</option>
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-[#E63329]">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Assigning…' : 'Assign Role'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Roles() {
  const { user } = useAuth()
  const [roles,    setRoles]   = useState<RoleWithMember[]>([])
  const [members,  setMembers] = useState<Member[]>([])
  const [clubId,   setClubId]  = useState('')
  const [loading,  setLoading] = useState(true)
  const [filter,   setFilter]  = useState('')
  const [modal,    setModal]   = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: rolesData }, { data: membersData }, { data: clubData }] = await Promise.all([
      supabase.from('roles').select('*').eq('is_active', true).order('assigned_at', { ascending: false }),
      supabase.from('members').select('*').order('last_name'),
      supabase.from('clubs').select('id').limit(1).single(),
    ])
    const mMap = Object.fromEntries((membersData ?? []).map(m => [m.id, m]))
    setRoles((rolesData ?? []).map(r => ({ ...r, member: mMap[r.member_id] })))
    setMembers(membersData ?? [])
    setClubId(clubData?.id ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const revoke = async (roleId: string) => {
    setRevoking(roleId)
    await supabase.from('roles').update({ is_active: false }).eq('id', roleId)
    setRevoking(null)
    load()
  }

  // Per-role counts from active roles
  const counts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = roles.filter(x => x.role_name === r).length
    return acc
  }, {})

  const filtered = filter ? roles.filter(r => r.role_name === filter) : roles

  return (
    <>
      {modal && (
        <AssignModal
          members={members}
          existingRoles={roles}
          clubId={clubId}
          currentUserEmail={user?.email ?? ''}
          onClose={() => setModal(false)}
          onSaved={load}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {roles.length} active role assignment{roles.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Role
          </Button>
        </div>

        {/* Summary cards — click to filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_ROLES.map(r => (
            <button
              key={r}
              onClick={() => setFilter(filter === r ? '' : r)}
              className={cn(
                'bg-white border rounded-xl px-4 py-3 shadow-sm text-left transition-colors',
                filter === r
                  ? 'border-[#E63329] ring-1 ring-[#E63329]'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <p className="text-xs text-gray-500 font-medium truncate">{ROLE_LABELS[r]}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{counts[r]}</p>
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E63329]"
          >
            <option value="">All roles</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <X className="w-3.5 h-3.5" /> Clear filter
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-gray-400 font-medium">
                {filter ? 'No assignments for this role' : 'No active role assignments'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned by</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.member && <Avatar member={r.member} />}
                        <span className="font-medium text-gray-900">
                          {r.member ? displayName(r.member) : <span className="text-gray-400 italic">Unknown</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                        {ROLE_LABELS[r.role_name] ?? r.role_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(r.assigned_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{r.assigned_by ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => revoke(r.id)}
                        disabled={revoking === r.id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {revoking === r.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
