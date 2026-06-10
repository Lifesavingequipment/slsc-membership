import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, UserPlus, Search, X, Plus, Award, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Member, Role, Qualification, MemberQualification } from '../types/database'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['active', 'inactive', 'suspended']
const TYPE_OPTIONS   = ['senior', 'nipper', 'associate', 'life']

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  inactive:  'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
}
const TYPE_STYLE: Record<string, string> = {
  senior:    'bg-blue-100 text-blue-800',
  nipper:    'bg-yellow-100 text-yellow-800',
  associate: 'bg-purple-100 text-purple-800',
  life:      'bg-orange-100 text-orange-800',
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function displayName(m: Member) {
  const first = m.preferred_name || m.first_name
  return `${first} ${m.last_name}`
}

function fmt(val: string | null | undefined) {
  return val || '—'
}

function fmtDate(val: string | null | undefined) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ member, size = 'md' }: { member: Member; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-16 h-16 text-2xl' }
  const initial = (member.preferred_name || member.first_name).charAt(0).toUpperCase()
  if (member.profile_photo_url) {
    return <img src={member.profile_photo_url} alt={displayName(member)} className={cn('rounded-full object-cover', sizes[size])} />
  }
  return (
    <div className={cn('rounded-full bg-[#E63329] flex items-center justify-center text-white font-semibold shrink-0', sizes[size])}>
      {initial}
    </div>
  )
}

// ─── Status / Type badges ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', TYPE_STYLE[type] ?? 'bg-gray-100 text-gray-600')}>
      {type}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex-1 min-w-0">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={cn('text-2xl font-bold mt-0.5', accent ?? 'text-gray-900')}>{value}</p>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    )}>
      {msg}
      <button onClick={onDone} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</h3>
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
    </div>
  )
}

// ─── QUALIFICATIONS ───────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, string> = {
  patrol:     'bg-blue-100 text-blue-800',
  irb:        'bg-purple-100 text-purple-800',
  first_aid:  'bg-red-100 text-red-800',
  education:  'bg-yellow-100 text-yellow-800',
}

const QUAL_STATUS_STYLE: Record<string, string> = {
  current:          'bg-green-100 text-green-800',
  expired:          'bg-red-100 text-red-700',
  pending_renewal:  'bg-orange-100 text-orange-700',
}

function derivedStatus(expiryDate: string | null): string {
  if (!expiryDate) return 'current'
  const expiry = new Date(expiryDate)
  const now    = new Date()
  if (expiry < now) return 'expired'
  const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 90) return 'pending_renewal'
  return 'current'
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split('T')[0]
}

// ── Qualification modal ───────────────────────────────────────────────────────

interface QualModalProps {
  memberId: string
  clubId: string
  qualifications: Qualification[]
  existing: MemberQualification | null
  onClose: () => void
  onSaved: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}

function QualModal({ memberId, clubId, qualifications, existing, onClose, onSaved, showToast }: QualModalProps) {
  const [qualId,      setQualId]      = useState(existing?.qualification_id ?? '')
  const [issuedDate,  setIssuedDate]  = useState(existing?.issued_date ?? '')
  const [expiryDate,  setExpiryDate]  = useState(existing?.expiry_date ?? '')
  const [certNumber,  setCertNumber]  = useState(existing?.certificate_number ?? '')
  const [issuedBy,    setIssuedBy]    = useState(existing?.issued_by ?? '')
  const [notes,       setNotes]       = useState(existing?.notes ?? '')
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const expiryManual = useRef(!!existing?.expiry_date)

  const selectedQual = qualifications.find(q => q.id === qualId)

  // Auto-calculate expiry when qual or issued date changes (unless user overrode it)
  useEffect(() => {
    if (expiryManual.current) return
    if (selectedQual?.validity_years && issuedDate) {
      setExpiryDate(addYears(issuedDate, selectedQual.validity_years))
    } else if (!selectedQual?.validity_years) {
      setExpiryDate('')
    }
  }, [qualId, issuedDate, selectedQual])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!qualId)      errs.qualId      = 'Qualification is required.'
    if (!issuedDate)  errs.issuedDate  = 'Issued date is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const status = derivedStatus(expiryDate || null)
    const payload = {
      club_id:            clubId,
      member_id:          memberId,
      qualification_id:   qualId,
      issued_date:        issuedDate || null,
      expiry_date:        expiryDate || null,
      certificate_number: certNumber || null,
      issued_by:          issuedBy || null,
      notes:              notes || null,
      status,
    }
    const { error } = existing
      ? await supabase.from('member_qualifications').update(payload).eq('id', existing.id)
      : await supabase.from('member_qualifications').insert(payload)
    setSaving(false)
    if (error) { showToast('Failed to save qualification.', 'error'); return }
    showToast(existing ? 'Qualification updated.' : 'Qualification added.', 'success')
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {existing ? 'Edit Qualification' : 'Add Qualification'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Qualification dropdown */}
          <div className="space-y-1">
            <Label htmlFor="qual-select">Qualification <span className="text-[#E63329]">*</span></Label>
            <select
              id="qual-select"
              value={qualId}
              onChange={e => { setQualId(e.target.value); expiryManual.current = false }}
              className={cn(
                'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]',
                errors.qualId ? 'border-red-400' : 'border-gray-300'
              )}
            >
              <option value="">Select qualification…</option>
              {qualifications.map(q => (
                <option key={q.id} value={q.id}>{q.name} ({q.code})</option>
              ))}
            </select>
            {errors.qualId && <p className="text-xs text-[#E63329]">{errors.qualId}</p>}
          </div>

          {/* Issued date */}
          <div className="space-y-1">
            <Label htmlFor="issued-date">Issued Date <span className="text-[#E63329]">*</span></Label>
            <Input
              id="issued-date"
              type="date"
              value={issuedDate}
              onChange={e => { setIssuedDate(e.target.value); expiryManual.current = false }}
              className={errors.issuedDate ? 'border-red-400' : ''}
            />
            {errors.issuedDate && <p className="text-xs text-[#E63329]">{errors.issuedDate}</p>}
          </div>

          {/* Expiry date */}
          <div className="space-y-1">
            <Label htmlFor="expiry-date">
              Expiry Date
              {selectedQual?.validity_years && (
                <span className="ml-1 text-xs text-gray-400 font-normal">(auto-calculated, override if needed)</span>
              )}
            </Label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate}
              onChange={e => { setExpiryDate(e.target.value); expiryManual.current = true }}
            />
          </div>

          {/* Certificate number */}
          <div className="space-y-1">
            <Label htmlFor="cert-number">Certificate Number</Label>
            <Input
              id="cert-number"
              value={certNumber}
              onChange={e => setCertNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Issued by */}
          <div className="space-y-1">
            <Label htmlFor="issued-by">Issued By</Label>
            <Input
              id="issued-by"
              value={issuedBy}
              onChange={e => setIssuedBy(e.target.value)}
              placeholder="e.g. SLSA, St John"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="qual-notes">Notes</Label>
            <textarea
              id="qual-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional"
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Qualifications section ────────────────────────────────────────────────────

function QualificationsSection({ member, showToast }: { member: Member; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [qualifications,       setQualifications]       = useState<Qualification[]>([])
  const [memberQuals,          setMemberQuals]          = useState<MemberQualification[]>([])
  const [loading,              setLoading]              = useState(true)
  const [modalOpen,            setModalOpen]            = useState(false)
  const [editing,              setEditing]              = useState<MemberQualification | null>(null)
  const [deletingId,           setDeletingId]           = useState<string | null>(null)

  const loadMemberQuals = useCallback(async () => {
    const { data } = await supabase
      .from('member_qualifications')
      .select('*, qualification:qualifications(*)')
      .eq('member_id', member.id)
      .order('issued_date', { ascending: false })
    setMemberQuals((data ?? []) as MemberQualification[])
  }, [member.id])

  useEffect(() => {
    Promise.all([
      supabase.from('qualifications').select('*').order('name'),
      loadMemberQuals(),
    ]).then(([{ data }]) => {
      setQualifications(data ?? [])
      setLoading(false)
    })
  }, [loadMemberQuals])

  const openAdd  = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (mq: MemberQualification) => { setEditing(mq); setModalOpen(true) }

  const confirmDelete = async (id: string) => {
    const { error } = await supabase.from('member_qualifications').delete().eq('id', id)
    if (error) { showToast('Failed to delete qualification.', 'error'); return }
    setDeletingId(null)
    showToast('Qualification removed.', 'success')
    loadMemberQuals()
  }

  const expiryIndicator = (mq: MemberQualification) => {
    if (!mq.expiry_date) return null
    const status = derivedStatus(mq.expiry_date)
    if (status === 'expired') return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertTriangle className="w-3.5 h-3.5" /> Expired
      </span>
    )
    if (status === 'pending_renewal') return (
      <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
        <AlertTriangle className="w-3.5 h-3.5" /> Expiring soon
      </span>
    )
    return null
  }

  return (
    <>
      {modalOpen && (
        <QualModal
          memberId={member.id}
          clubId={member.club_id}
          qualifications={qualifications}
          existing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={loadMemberQuals}
          showToast={showToast}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Delete Qualification</h3>
            <p className="text-sm text-gray-600">Are you sure you want to remove this qualification? This cannot be undone.</p>
            <div className="flex gap-3">
              <Button onClick={() => confirmDelete(deletingId)} className="bg-red-600 hover:bg-red-700">Delete</Button>
              <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Qualifications</h3>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Qualification
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
        ) : memberQuals.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <Award className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-400 font-medium">No qualifications recorded</p>
            <Button size="sm" variant="outline" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Qualification
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {memberQuals.map(mq => {
              const qual   = mq.qualification
              const status = derivedStatus(mq.expiry_date)
              return (
                <div key={mq.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{qual?.name ?? mq.qualification_id}</p>
                        {qual?.code && (
                          <span className="text-xs text-gray-500 font-mono">{qual.code}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {qual?.category && (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                            CATEGORY_STYLE[qual.category] ?? 'bg-gray-100 text-gray-600'
                          )}>
                            {qual.category.replace('_', ' ')}
                          </span>
                        )}
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                          QUAL_STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'
                        )}>
                          {status.replace('_', ' ')}
                        </span>
                        {expiryIndicator(mq)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(mq)}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(mq.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div>
                      <p className="text-gray-400">Issued</p>
                      <p className="text-gray-800 font-medium">{fmtDate(mq.issued_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Expiry</p>
                      <p className="text-gray-800 font-medium">{mq.expiry_date ? fmtDate(mq.expiry_date) : 'No expiry'}</p>
                    </div>
                    {mq.certificate_number && (
                      <div>
                        <p className="text-gray-400">Certificate #</p>
                        <p className="text-gray-800 font-medium">{mq.certificate_number}</p>
                      </div>
                    )}
                    {mq.issued_by && (
                      <div>
                        <p className="text-gray-400">Issued by</p>
                        <p className="text-gray-800 font-medium">{mq.issued_by}</p>
                      </div>
                    )}
                  </div>

                  {mq.notes && (
                    <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">{mq.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─── MEMBER LIST VIEW ─────────────────────────────────────────────────────────

interface ListViewProps {
  onView: (m: Member) => void
}

function MembersList({ onView }: ListViewProps) {
  const navigate = useNavigate()
  const [members, setMembers]         = useState<Member[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]   = useState('')

  useEffect(() => {
    supabase
      .from('members')
      .select('*')
      .order('last_name')
      .then(({ data }) => { setMembers(data ?? []); setLoading(false) })
  }, [])

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || [m.first_name, m.last_name, m.preferred_name, m.email, m.slsa_member_number]
      .some(v => v?.toLowerCase().includes(q))
    const matchStatus = !statusFilter || m.membership_status === statusFilter
    const matchType   = !typeFilter   || m.membership_type   === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const counts = {
    total:     members.length,
    active:    members.filter(m => m.membership_status === 'active').length,
    inactive:  members.filter(m => m.membership_status === 'inactive').length,
    suspended: members.filter(m => m.membership_status === 'suspended').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Members</h2>
          <p className="text-gray-500 text-sm mt-0.5">{counts.total} member{counts.total !== 1 ? 's' : ''} in your club</p>
        </div>
        <Button onClick={() => navigate('/members/add')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3">
        <StatCard label="Total"     value={counts.total} />
        <StatCard label="Active"    value={counts.active}    accent="text-green-600" />
        <StatCard label="Inactive"  value={counts.inactive}  accent="text-gray-500" />
        <StatCard label="Suspended" value={counts.suspended} accent="text-red-600" />
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search name, email, SLSA number…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E63329]"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E63329]"
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 font-medium">No members found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Member</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">SLSA #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar member={m} size="sm" />
                      <span className="font-medium text-gray-900">{displayName(m)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(m.slsa_member_number)}</td>
                  <td className="px-4 py-3"><TypeBadge type={m.membership_type} /></td>
                  <td className="px-4 py-3"><StatusBadge status={m.membership_status} /></td>
                  <td className="px-4 py-3 text-gray-500">{fmt(m.phone)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => onView(m)}>View</Button>
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

// ─── MEMBER PROFILE VIEW ──────────────────────────────────────────────────────

type ProfileMode = 'view' | 'edit'

interface ProfileViewProps {
  member: Member
  onBack: () => void
  onUpdated: (m: Member) => void
}

function MemberProfile({ member: initialMember, onBack, onUpdated }: ProfileViewProps) {
  const [member, setMember]   = useState<Member>(initialMember)
  const [mode, setMode]       = useState<ProfileMode>('view')
  const [draft, setDraft]     = useState<Member>(initialMember)
  const [saving, setSaving]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Roles
  const [roles, setRoles]         = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [newRole, setNewRole]     = useState('')
  const [addingRole, setAddingRole] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
  }, [])

  useEffect(() => {
    supabase
      .from('roles')
      .select('*')
      .eq('member_id', member.id)
      .then(({ data }) => { setRoles(data ?? []); setRolesLoading(false) })
  }, [member.id])

  // ── Edit helpers ─────────────────────────────────────────────────────────

  const startEdit = () => { setDraft({ ...member }); setFieldErrors({}); setMode('edit') }
  const cancelEdit = () => { setDraft({ ...member }); setFieldErrors({}); setMode('view') }

  const set = (key: keyof Member) => (value: string) =>
    setDraft(d => ({ ...d, [key]: value || null }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!draft.first_name.trim()) errs.first_name = 'First name is required.'
    if (!draft.last_name.trim())  errs.last_name  = 'Last name is required.'
    if (!draft.email?.trim())     errs.email      = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(draft.email)) errs.email = 'Invalid email address.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const saveChanges = async () => {
    if (!validate()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('members')
      .update({
        first_name: draft.first_name,
        last_name:  draft.last_name,
        preferred_name: draft.preferred_name || null,
        date_of_birth:  draft.date_of_birth  || null,
        gender:         draft.gender         || null,
        email:          draft.email,
        phone:          draft.phone          || null,
        address:        draft.address        || null,
        suburb:         draft.suburb         || null,
        postcode:       draft.postcode       || null,
        country:        draft.country        || null,
        slsa_member_number:          draft.slsa_member_number          || null,
        membership_type:             draft.membership_type,
        membership_status:           draft.membership_status,
        join_date:                   draft.join_date                   || null,
        emergency_contact_name:      draft.emergency_contact_name      || null,
        emergency_contact_phone:     draft.emergency_contact_phone     || null,
        emergency_contact_relation:  draft.emergency_contact_relation  || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)
      .select()
      .single()
    setSaving(false)
    if (error) { showToast('Failed to save changes.', 'error'); return }
    setMember(data)
    onUpdated(data)
    setMode('view')
    showToast('Member updated successfully.', 'success')
  }

  // ── Status change ────────────────────────────────────────────────────────

  const changeStatus = async (status: string) => {
    const { data, error } = await supabase
      .from('members')
      .update({ membership_status: status, updated_at: new Date().toISOString() })
      .eq('id', member.id)
      .select()
      .single()
    if (error) { showToast('Failed to update status.', 'error'); return }
    setMember(data)
    onUpdated(data)
    showToast(`Status changed to ${status}.`, 'success')
  }

  // ── Roles ────────────────────────────────────────────────────────────────

  const addRole = async () => {
    const name = newRole.trim()
    if (!name) return
    setAddingRole(true)
    const { data, error } = await supabase
      .from('roles')
      .insert({ member_id: member.id, club_id: member.club_id, role_name: name, is_active: true })
      .select()
      .single()
    setAddingRole(false)
    if (error) { showToast('Failed to add role.', 'error'); return }
    setRoles(r => [...r, data])
    setNewRole('')
  }

  const removeRole = async (roleId: string) => {
    const { error } = await supabase.from('roles').delete().eq('id', roleId)
    if (error) { showToast('Failed to remove role.', 'error'); return }
    setRoles(r => r.filter(x => x.id !== roleId))
  }

  // ── Form field ───────────────────────────────────────────────────────────

  const EditField = ({
    label, fieldKey, type = 'text', required,
  }: {
    label: string
    fieldKey: keyof Member
    type?: string
    required?: boolean
  }) => (
    <div className="space-y-1">
      <Label htmlFor={fieldKey}>{label}{required && <span className="text-[#E63329] ml-0.5">*</span>}</Label>
      <Input
        id={fieldKey}
        type={type}
        value={(draft[fieldKey] as string) ?? ''}
        onChange={e => set(fieldKey)(e.target.value)}
        className={fieldErrors[fieldKey] ? 'border-red-400' : ''}
      />
      {fieldErrors[fieldKey] && <p className="text-xs text-[#E63329]">{fieldErrors[fieldKey]}</p>}
    </div>
  )

  const EditSelect = ({
    label, fieldKey, options,
  }: {
    label: string
    fieldKey: keyof Member
    options: string[]
  }) => (
    <div className="space-y-1">
      <Label htmlFor={fieldKey}>{label}</Label>
      <select
        id={fieldKey}
        value={(draft[fieldKey] as string) ?? ''}
        onChange={e => set(fieldKey)(e.target.value)}
        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Back + heading */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to members
          </button>
          <div className="flex items-center gap-4">
            <Avatar member={member} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{displayName(member)}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={member.membership_status} />
                <TypeBadge type={member.membership_type} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: details / edit form ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {mode === 'view' ? (
            <>
              {/* Personal */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeading>Personal</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="First name"     value={fmt(member.first_name)} />
                  <Field label="Last name"      value={fmt(member.last_name)} />
                  <Field label="Preferred name" value={fmt(member.preferred_name)} />
                  <Field label="Date of birth"  value={fmtDate(member.date_of_birth)} />
                  <Field label="Gender"         value={fmt(member.gender)} />
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeading>Contact</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="Email"    value={fmt(member.email)} />
                  <Field label="Phone"    value={fmt(member.phone)} />
                  <Field label="Address"  value={fmt(member.address)} />
                  <Field label="Suburb"   value={fmt(member.suburb)} />
                  <Field label="Postcode" value={fmt(member.postcode)} />
                  <Field label="Country"  value={fmt(member.country)} />
                </div>
              </div>

              {/* Membership */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeading>Membership</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="SLSA number"      value={fmt(member.slsa_member_number)} />
                  <Field label="Membership type"  value={fmt(member.membership_type)} />
                  <Field label="Membership status" value={fmt(member.membership_status)} />
                  <Field label="Join date"         value={fmtDate(member.join_date)} />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeading>Emergency Contact</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="Name"         value={fmt(member.emergency_contact_name)} />
                  <Field label="Phone"        value={fmt(member.emergency_contact_phone)} />
                  <Field label="Relationship" value={fmt(member.emergency_contact_relation)} />
                </div>
              </div>
            </>
          ) : (
            /* ── Edit form ─────────────────────────────────────────────── */
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-6">
              <div>
                <SectionHeading>Personal</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="First name"     fieldKey="first_name"     required />
                  <EditField label="Last name"      fieldKey="last_name"      required />
                  <EditField label="Preferred name" fieldKey="preferred_name" />
                  <EditField label="Date of birth"  fieldKey="date_of_birth" type="date" />
                  <EditSelect label="Gender" fieldKey="gender" options={['male', 'female', 'non-binary', 'prefer not to say']} />
                </div>
              </div>

              <div>
                <SectionHeading>Contact</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Email"    fieldKey="email" type="email" required />
                  <EditField label="Phone"    fieldKey="phone" type="tel" />
                  <EditField label="Address"  fieldKey="address" />
                  <EditField label="Suburb"   fieldKey="suburb" />
                  <EditField label="Postcode" fieldKey="postcode" />
                  <EditField label="Country"  fieldKey="country" />
                </div>
              </div>

              <div>
                <SectionHeading>Membership</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="SLSA member number" fieldKey="slsa_member_number" />
                  <EditSelect label="Membership type"   fieldKey="membership_type"   options={TYPE_OPTIONS} />
                  <EditSelect label="Membership status" fieldKey="membership_status" options={STATUS_OPTIONS} />
                  <EditField  label="Join date"          fieldKey="join_date" type="date" />
                </div>
              </div>

              <div>
                <SectionHeading>Emergency Contact</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Name"         fieldKey="emergency_contact_name" />
                  <EditField label="Phone"        fieldKey="emergency_contact_phone" type="tel" />
                  <EditField label="Relationship" fieldKey="emergency_contact_relation" />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button onClick={saveChanges} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={saving}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: actions panel ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <SectionHeading>Actions</SectionHeading>
            {mode === 'view' ? (
              <Button className="w-full" onClick={startEdit}>Edit Member</Button>
            ) : (
              <Button className="w-full" variant="outline" onClick={cancelEdit}>Cancel Editing</Button>
            )}

            <div className="space-y-1.5">
              <Label>Change Status</Label>
              <select
                value={member.membership_status}
                onChange={e => changeStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s} className="capitalize">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Roles */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <SectionHeading>Roles</SectionHeading>
            {rolesLoading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : roles.length === 0 ? (
              <p className="text-xs text-gray-400">No roles assigned.</p>
            ) : (
              <ul className="space-y-1.5">
                {roles.map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className={cn(
                      'flex-1 px-2 py-1 rounded bg-gray-50 border border-gray-200 text-gray-700',
                      !r.is_active && 'opacity-50 line-through'
                    )}>
                      {r.role_name}
                    </span>
                    <button
                      onClick={() => removeRole(r.id)}
                      className="text-gray-400 hover:text-red-500 p-0.5"
                      aria-label="Remove role"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="New role…"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRole()}
                className="text-sm h-9"
              />
              <Button size="sm" onClick={addRole} disabled={addingRole || !newRole.trim()} className="h-9 px-2.5">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-2">
            <SectionHeading>Record</SectionHeading>
            <Field label="Date joined"   value={fmtDate(member.join_date ?? member.created_at)} />
            <Field label="Last updated"  value={fmtDate(member.updated_at)} />
            <Field label="Member ID"     value={member.id.slice(0, 8) + '…'} />
          </div>
        </div>
      </div>

      {/* Qualifications — full width below the two-column grid */}
      <QualificationsSection member={member} showToast={showToast} />
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function Members() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [, setAllMembers]         = useState<Member[]>([])

  const handleUpdated = (updated: Member) => {
    setAllMembers(all => all.map(m => m.id === updated.id ? updated : m))
    setSelectedMember(updated)
  }

  if (selectedMember) {
    return (
      <MemberProfile
        member={selectedMember}
        onBack={() => setSelectedMember(null)}
        onUpdated={handleUpdated}
      />
    )
  }

  return (
    <MembersList
      onView={m => { setAllMembers([]); setSelectedMember(m) }}
    />
  )
}
