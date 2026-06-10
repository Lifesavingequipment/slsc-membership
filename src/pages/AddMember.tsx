import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useClub } from '../hooks/useClub'

export function AddMember() {
  const navigate = useNavigate()
  const { club } = useClub()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    slsa_member_number: '',
    membership_type: 'active',
    membership_status: 'active',
  })

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!club) { setError('Club not loaded yet.'); return }
    setError('')
    setLoading(true)

    const { error } = await supabase.from('members').insert({
      ...form,
      club_id: club.id,
      slsa_member_number: form.slsa_member_number || null,
      email: form.email || null,
      phone: form.phone || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/members'), 1200)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Add Member</h2>
        <p className="text-gray-500 text-sm mt-1">Register a new member to the club</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">First name *</Label>
            <Input id="first_name" value={form.first_name} onChange={e => update('first_name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Last name *</Label>
            <Input id="last_name" value={form.last_name} onChange={e => update('last_name', e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slsa_number">SLSA Member Number</Label>
          <Input id="slsa_number" value={form.slsa_member_number} onChange={e => update('slsa_member_number', e.target.value)} placeholder="Optional" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="membership_type">Membership Type</Label>
            <select
              id="membership_type"
              value={form.membership_type}
              onChange={e => update('membership_type', e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E63329]"
            >
              <option value="active">Active</option>
              <option value="cadet">Cadet</option>
              <option value="associate">Associate</option>
              <option value="junior">Junior</option>
              <option value="honorary">Honorary</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="membership_status">Status</Label>
            <select
              id="membership_status"
              value={form.membership_status}
              onChange={e => update('membership_status', e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E63329]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#E63329] bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Member added! Redirecting…</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Add Member'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/members')}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
