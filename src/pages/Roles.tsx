import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Role, Member } from '../types/database'
import { cn } from '../lib/utils'

interface RoleWithMember extends Role {
  member?: Member
}

export function Roles() {
  const [roles, setRoles] = useState<RoleWithMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .order('role_name')

      if (!rolesData) { setLoading(false); return }

      const memberIds = [...new Set(rolesData.map(r => r.member_id))]
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .in('id', memberIds)

      const memberMap = Object.fromEntries((membersData ?? []).map(m => [m.id, m]))

      setRoles(rolesData.map(r => ({ ...r, member: memberMap[r.member_id] })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
        <p className="text-gray-500 text-sm mt-1">{roles.length} role assignment{roles.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No roles found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.member ? `${r.member.first_name} ${r.member.last_name}` : <span className="text-gray-400">Unknown</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.role_name}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    )}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
