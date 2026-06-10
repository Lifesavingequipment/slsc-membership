import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useClub } from '../hooks/useClub'
import { cn } from '../lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const TYPE_OPTIONS   = ['Senior', 'Nipper', 'Associate', 'Life']
const STATUS_OPTIONS = ['Active', 'Inactive', 'Suspended']

const today = new Date().toISOString().split('T')[0]

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
      {children}
    </h3>
  )
}

function FieldWrap({
  id, label, required, error, children,
}: {
  id?: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[#E63329] ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-[#E63329]">{error}</p>}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type FormState = {
  first_name: string
  last_name: string
  preferred_name: string
  date_of_birth: string
  gender: string
  email: string
  phone: string
  address: string
  suburb: string
  postcode: string
  country: string
  slsa_member_number: string
  membership_type: string
  membership_status: string
  join_date: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
}

const INITIAL: FormState = {
  first_name: '',
  last_name: '',
  preferred_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
  suburb: '',
  postcode: '',
  country: 'AUS',
  slsa_member_number: '',
  membership_type: 'Senior',
  membership_status: 'Active',
  join_date: today,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
}

const selectClass = (hasError?: boolean) =>
  cn(
    'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329]',
    hasError ? 'border-red-400' : 'border-gray-300',
  )

export function AddMember() {
  const navigate = useNavigate()
  const { club }  = useClub()

  const [form, setForm]     = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = (key: keyof FormState) => (value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => { const next = { ...e }; delete next[key]; return next })
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}

    if (!form.first_name.trim())       errs.first_name       = 'First name is required.'
    if (!form.last_name.trim())        errs.last_name        = 'Last name is required.'
    if (!form.email.trim())            errs.email            = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email   = 'Enter a valid email address.'
    if (!form.membership_type)         errs.membership_type  = 'Membership type is required.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!club) { setServerError('Club not loaded. Please refresh and try again.'); return }

    setLoading(true)
    setServerError('')

    // Check SLSA number uniqueness if provided
    const slsaNum = form.slsa_member_number.trim() || null
    if (slsaNum) {
      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('slsa_member_number', slsaNum)
        .maybeSingle()
      if (existing) {
        setErrors(e => ({ ...e, slsa_member_number: 'This SLSA member number is already in use.' }))
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase
      .from('members')
      .insert({
        club_id:                    club.id,
        first_name:                 form.first_name.trim(),
        last_name:                  form.last_name.trim(),
        preferred_name:             form.preferred_name.trim()  || null,
        date_of_birth:              form.date_of_birth          || null,
        gender:                     form.gender                 || null,
        email:                      form.email.trim(),
        phone:                      form.phone.trim()           || null,
        address:                    form.address.trim()         || null,
        suburb:                     form.suburb.trim()          || null,
        postcode:                   form.postcode.trim()        || null,
        country:                    form.country.trim()         || null,
        slsa_member_number:         slsaNum,
        membership_type:            form.membership_type.toLowerCase(),
        membership_status:          form.membership_status.toLowerCase(),
        join_date:                  form.join_date              || null,
        emergency_contact_name:     form.emergency_contact_name.trim()     || null,
        emergency_contact_phone:    form.emergency_contact_phone.trim()    || null,
        emergency_contact_relation: form.emergency_contact_relation.trim() || null,
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }

    // Navigate to the new member's profile via Members page state
    navigate('/members', { state: { openMemberId: data.id } })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Page header */}
      <div>
        <Link
          to="/members"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to members
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Add Member</h2>
        <p className="text-gray-500 text-sm mt-0.5">Register a new member to the club</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Personal Details ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <SectionHeading>Personal Details</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrap id="first_name" label="First name" required error={errors.first_name}>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={e => set('first_name')(e.target.value)}
                className={errors.first_name ? 'border-red-400' : ''}
              />
            </FieldWrap>

            <FieldWrap id="last_name" label="Last name" required error={errors.last_name}>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={e => set('last_name')(e.target.value)}
                className={errors.last_name ? 'border-red-400' : ''}
              />
            </FieldWrap>

            <FieldWrap id="preferred_name" label="Preferred name">
              <Input
                id="preferred_name"
                value={form.preferred_name}
                onChange={e => set('preferred_name')(e.target.value)}
                placeholder="Optional"
              />
            </FieldWrap>

            <FieldWrap id="date_of_birth" label="Date of birth">
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={e => set('date_of_birth')(e.target.value)}
              />
            </FieldWrap>

            <FieldWrap id="gender" label="Gender">
              <select
                id="gender"
                value={form.gender}
                onChange={e => set('gender')(e.target.value)}
                className={selectClass()}
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FieldWrap>
          </div>
        </div>

        {/* ── Contact Details ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <SectionHeading>Contact Details</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrap id="email" label="Email" required error={errors.email}>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => set('email')(e.target.value)}
                className={errors.email ? 'border-red-400' : ''}
              />
            </FieldWrap>

            <FieldWrap id="phone" label="Phone">
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => set('phone')(e.target.value)}
              />
            </FieldWrap>

            <div className="sm:col-span-2">
              <FieldWrap id="address" label="Address">
                <Input
                  id="address"
                  value={form.address}
                  onChange={e => set('address')(e.target.value)}
                />
              </FieldWrap>
            </div>

            <FieldWrap id="suburb" label="Suburb">
              <Input
                id="suburb"
                value={form.suburb}
                onChange={e => set('suburb')(e.target.value)}
              />
            </FieldWrap>

            <FieldWrap id="postcode" label="Postcode">
              <Input
                id="postcode"
                value={form.postcode}
                onChange={e => set('postcode')(e.target.value)}
              />
            </FieldWrap>

            <FieldWrap id="country" label="Country">
              <Input
                id="country"
                value={form.country}
                onChange={e => set('country')(e.target.value)}
              />
            </FieldWrap>
          </div>
        </div>

        {/* ── Membership Details ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <SectionHeading>Membership Details</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrap id="slsa_member_number" label="SLSA member number" error={errors.slsa_member_number}>
              <Input
                id="slsa_member_number"
                value={form.slsa_member_number}
                onChange={e => set('slsa_member_number')(e.target.value)}
                placeholder="Optional — must be unique"
                className={errors.slsa_member_number ? 'border-red-400' : ''}
              />
            </FieldWrap>

            <FieldWrap id="membership_type" label="Membership type" required error={errors.membership_type}>
              <select
                id="membership_type"
                value={form.membership_type}
                onChange={e => set('membership_type')(e.target.value)}
                className={selectClass(!!errors.membership_type)}
              >
                <option value="">Select…</option>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap id="membership_status" label="Membership status">
              <select
                id="membership_status"
                value={form.membership_status}
                onChange={e => set('membership_status')(e.target.value)}
                className={selectClass()}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap id="join_date" label="Join date">
              <Input
                id="join_date"
                type="date"
                value={form.join_date}
                onChange={e => set('join_date')(e.target.value)}
              />
            </FieldWrap>
          </div>
        </div>

        {/* ── Emergency Contact ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <SectionHeading>Emergency Contact</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrap id="emergency_contact_name" label="Contact name">
              <Input
                id="emergency_contact_name"
                value={form.emergency_contact_name}
                onChange={e => set('emergency_contact_name')(e.target.value)}
              />
            </FieldWrap>

            <FieldWrap id="emergency_contact_phone" label="Contact phone">
              <Input
                id="emergency_contact_phone"
                type="tel"
                value={form.emergency_contact_phone}
                onChange={e => set('emergency_contact_phone')(e.target.value)}
              />
            </FieldWrap>

            <FieldWrap id="emergency_contact_relation" label="Relationship">
              <Input
                id="emergency_contact_relation"
                value={form.emergency_contact_relation}
                onChange={e => set('emergency_contact_relation')(e.target.value)}
                placeholder="e.g. Parent, Spouse"
              />
            </FieldWrap>
          </div>
        </div>

        {/* ── Server error ─────────────────────────────────────────────────── */}
        {serverError && (
          <p className="text-sm text-[#E63329] bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {serverError}
          </p>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save Member'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/members')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>

      </form>
    </div>
  )
}
