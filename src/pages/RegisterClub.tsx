import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Check, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClubForm {
  clubName: string
  clubCode: string
  country: string
  stateRegion: string
  slsaClubNumber: string
  contactEmail: string
  contactPhone: string
}

interface AdminForm {
  firstName: string
  lastName: string
  email: string
  password: string
  confirm: string
}

type CodeStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

// ─── Constants ────────────────────────────────────────────────────────────────

const AUS_STATES = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const NZ_REGIONS = ['North Island', 'South Island']

// ─── Shared small components ──────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-[#E63329] mt-1">{msg}</p>
}

function Alert({ type, msg }: { type: 'error' | 'success'; msg: string }) {
  return (
    <p className={`text-sm rounded-md px-3 py-2 ${
      type === 'error'
        ? 'text-[#E63329] bg-red-50 border border-red-200'
        : 'text-green-700 bg-green-50 border border-green-200'
    }`}>
      {msg}
    </p>
  )
}

function PasswordInput({
  id, value, onChange, placeholder = '••••••••', autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void
  placeholder?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ─── Password strength indicator ──────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-400' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-400' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null
  const { score, label, color } = passwordStrength(password)
  const bars = 4
  const filled = Math.ceil((score / 5) * bars)
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < filled ? color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs mt-1 ${
        label === 'Weak' ? 'text-red-500' :
        label === 'Fair' ? 'text-yellow-600' :
        label === 'Good' ? 'text-blue-600' : 'text-green-600'
      }`}>{label}</p>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Club Details', 'Admin Account', 'Review & Confirm']
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: total }).map((_, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  done    ? 'bg-[#E63329] text-white' :
                  active  ? 'bg-[#E63329] text-white ring-4 ring-red-100' :
                            'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : step}
                </div>
                <span className={`hidden sm:block text-xs mt-1 font-medium whitespace-nowrap ${
                  active ? 'text-[#E63329]' : done ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {labels[i]}
                </span>
              </div>
              {i < total - 1 && (
                <div className={`h-0.5 flex-1 mx-2 mb-0 sm:mb-4 transition-colors ${
                  done ? 'bg-[#E63329]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
      <p className="sm:hidden text-xs text-center text-gray-500 mt-1 mb-2">
        Step {current} of {total}: <span className="font-medium text-gray-700">{labels[current - 1]}</span>
      </p>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
        <div
          className="bg-gradient-to-r from-[#E63329] to-[#FFD700] h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─── STEP 1: Club Details ─────────────────────────────────────────────────────

function Step1({
  data, onChange, onNext, onBack,
}: {
  data: ClubForm
  onChange: (k: keyof ClubForm, v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof ClubForm, string>>>({})
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stateOptions = data.country === 'NZL' ? NZ_REGIONS : AUS_STATES

  // Live club code availability check
  useEffect(() => {
    const code = data.clubCode.trim()
    if (!code || !/^[A-Z0-9]+$/.test(code)) {
      setCodeStatus(code ? 'invalid' : 'idle')
      return
    }
    setCodeStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data: rows } = await supabase
        .from('clubs')
        .select('id')
        .eq('club_code', code)
        .limit(1)
      setCodeStatus(rows && rows.length > 0 ? 'taken' : 'available')
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [data.clubCode])

  const handleCodeChange = (v: string) => {
    const upper = v.toUpperCase().replace(/\s/g, '')
    onChange('clubCode', upper)
    setErrors(p => ({ ...p, clubCode: undefined }))
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!data.clubName.trim())                       errs.clubName     = 'Club name is required.'
    if (!data.clubCode.trim())                       errs.clubCode     = 'Club code is required.'
    else if (!/^[A-Z0-9]+$/.test(data.clubCode))    errs.clubCode     = 'Club code must be uppercase letters and numbers only.'
    else if (codeStatus === 'taken')                 errs.clubCode     = 'This club code is already registered. Please choose another.'
    else if (codeStatus === 'checking')              errs.clubCode     = 'Please wait while we check availability.'
    if (!data.stateRegion)                           errs.stateRegion  = 'State/Region is required.'
    if (!data.contactEmail.trim())                   errs.contactEmail = 'Contact email is required.'
    else if (!/\S+@\S+\.\S+/.test(data.contactEmail)) errs.contactEmail = 'Enter a valid email address.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = (e: FormEvent) => {
    e.preventDefault()
    if (validate()) onNext()
  }

  const codeHint = () => {
    if (codeStatus === 'checking') return <span className="text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking…</span>
    if (codeStatus === 'available') return <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available</span>
    if (codeStatus === 'taken') return <span className="text-[#E63329] flex items-center gap-1"><X className="w-3 h-3" /> Already registered</span>
    if (codeStatus === 'invalid') return <span className="text-yellow-600 text-xs">Uppercase letters and numbers only</span>
    return null
  }

  return (
    <form onSubmit={handleNext} className="space-y-4" noValidate>
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">Club Details</h2>
        <p className="text-sm text-gray-500 mt-0.5">Tell us about your surf life saving club.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="club-name">Club name <span className="text-[#E63329]">*</span></Label>
        <Input
          id="club-name"
          value={data.clubName}
          onChange={e => { onChange('clubName', e.target.value); setErrors(p => ({ ...p, clubName: undefined })) }}
          placeholder="e.g. Kurrawa Surf Life Saving Club"
        />
        <FieldError msg={errors.clubName} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="club-code">Club code <span className="text-[#E63329]">*</span></Label>
        <Input
          id="club-code"
          value={data.clubCode}
          onChange={e => handleCodeChange(e.target.value)}
          placeholder="e.g. KURRAWA"
          maxLength={20}
        />
        <div className="flex items-center justify-between">
          <FieldError msg={errors.clubCode} />
          <span className="text-xs ml-auto">{codeHint()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="country">Country <span className="text-[#E63329]">*</span></Label>
          <select
            id="country"
            value={data.country}
            onChange={e => {
              onChange('country', e.target.value)
              onChange('stateRegion', '')
            }}
            className="flex h-11 sm:h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329] focus:border-transparent"
          >
            <option value="AUS">Australia</option>
            <option value="NZL">New Zealand</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="state">
            {data.country === 'NZL' ? 'Region' : 'State'} <span className="text-[#E63329]">*</span>
          </Label>
          <select
            id="state"
            value={data.stateRegion}
            onChange={e => { onChange('stateRegion', e.target.value); setErrors(p => ({ ...p, stateRegion: undefined })) }}
            className="flex h-11 sm:h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63329] focus:border-transparent"
          >
            <option value="">Select…</option>
            {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <FieldError msg={errors.stateRegion} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slsa-number">
          {data.country === 'NZL' ? 'SLSNZ' : 'SLSA'} club number <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </Label>
        <Input
          id="slsa-number"
          value={data.slsaClubNumber}
          onChange={e => onChange('slsaClubNumber', e.target.value)}
          placeholder="e.g. 1042"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Contact email <span className="text-[#E63329]">*</span></Label>
        <Input
          id="contact-email"
          type="email"
          value={data.contactEmail}
          onChange={e => { onChange('contactEmail', e.target.value); setErrors(p => ({ ...p, contactEmail: undefined })) }}
          placeholder="admin@yourclub.com.au"
        />
        <FieldError msg={errors.contactEmail} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-phone">
          Contact phone <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </Label>
        <Input
          id="contact-phone"
          type="tel"
          value={data.contactPhone}
          onChange={e => onChange('contactPhone', e.target.value)}
          placeholder="e.g. 07 5538 1234"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1">
          Next →
        </Button>
      </div>
    </form>
  )
}

// ─── STEP 2: Admin Account ────────────────────────────────────────────────────

function Step2({
  data, onChange, onNext, onBack,
}: {
  data: AdminForm
  onChange: (k: keyof AdminForm, v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof AdminForm, string>>>({})

  const set = (k: keyof AdminForm) => (v: string) => {
    onChange(k, v)
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!data.firstName.trim())                       errs.firstName = 'First name is required.'
    if (!data.lastName.trim())                        errs.lastName  = 'Last name is required.'
    if (!data.email.trim())                           errs.email     = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(data.email))       errs.email     = 'Enter a valid email address.'
    if (!data.password)                               errs.password  = 'Password is required.'
    else if (data.password.length < 8)                errs.password  = 'Password must be at least 8 characters.'
    if (!data.confirm)                                errs.confirm   = 'Please confirm your password.'
    else if (data.confirm !== data.password)          errs.confirm   = 'Passwords do not match.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = (e: FormEvent) => {
    e.preventDefault()
    if (validate()) onNext()
  }

  return (
    <form onSubmit={handleNext} className="space-y-4" noValidate>
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">Admin Account</h2>
        <p className="text-sm text-gray-500 mt-0.5">This account will be the club administrator login.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="admin-first">First name <span className="text-[#E63329]">*</span></Label>
          <Input id="admin-first" value={data.firstName} onChange={e => set('firstName')(e.target.value)} autoComplete="given-name" />
          <FieldError msg={errors.firstName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-last">Last name <span className="text-[#E63329]">*</span></Label>
          <Input id="admin-last" value={data.lastName} onChange={e => set('lastName')(e.target.value)} autoComplete="family-name" />
          <FieldError msg={errors.lastName} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-email">Email <span className="text-[#E63329]">*</span></Label>
        <Input
          id="admin-email"
          type="email"
          value={data.email}
          onChange={e => set('email')(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <FieldError msg={errors.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-password">Password <span className="text-[#E63329]">*</span></Label>
        <PasswordInput id="admin-password" value={data.password} onChange={set('password')} autoComplete="new-password" />
        <StrengthBar password={data.password} />
        <FieldError msg={errors.password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-confirm">Confirm password <span className="text-[#E63329]">*</span></Label>
        <PasswordInput id="admin-confirm" value={data.confirm} onChange={set('confirm')} autoComplete="new-password" />
        {data.confirm && data.confirm === data.password && (
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Check className="w-3 h-3" /> Passwords match
          </p>
        )}
        <FieldError msg={errors.confirm} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1">
          Next →
        </Button>
      </div>
    </form>
  )
}

// ─── STEP 3: Review & Confirm ─────────────────────────────────────────────────

function Step3({
  club, admin, onBack, onSubmit, submitting, error,
}: {
  club: ClubForm
  admin: AdminForm
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  error: string
}) {
  const [agreed, setAgreed] = useState(false)

  const countryLabel = club.country === 'NZL' ? 'New Zealand' : 'Australia'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">Review & Confirm</h2>
        <p className="text-sm text-gray-500 mt-0.5">Please review your details before creating your club.</p>
      </div>

      {/* Club summary */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Club Details</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-gray-500">Club name</span>
          <span className="font-medium text-gray-900">{club.clubName}</span>
          <span className="text-gray-500">Club code</span>
          <span className="font-medium text-gray-900 font-mono">{club.clubCode}</span>
          <span className="text-gray-500">Country</span>
          <span className="font-medium text-gray-900">{countryLabel}</span>
          <span className="text-gray-500">{club.country === 'NZL' ? 'Region' : 'State'}</span>
          <span className="font-medium text-gray-900">{club.stateRegion}</span>
          {club.slsaClubNumber && <>
            <span className="text-gray-500">{club.country === 'NZL' ? 'SLSNZ' : 'SLSA'} number</span>
            <span className="font-medium text-gray-900">{club.slsaClubNumber}</span>
          </>}
          <span className="text-gray-500">Contact email</span>
          <span className="font-medium text-gray-900">{club.contactEmail}</span>
          {club.contactPhone && <>
            <span className="text-gray-500">Contact phone</span>
            <span className="font-medium text-gray-900">{club.contactPhone}</span>
          </>}
          <span className="text-gray-500">Plan</span>
          <span className="inline-flex items-center gap-1 font-medium text-gray-900">
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Free</span>
          </span>
        </div>
      </div>

      {/* Admin summary */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Admin Account</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-gray-500">Name</span>
          <span className="font-medium text-gray-900">{admin.firstName} {admin.lastName}</span>
          <span className="text-gray-500">Login email</span>
          <span className="font-medium text-gray-900">{admin.email}</span>
          <span className="text-gray-500">Role</span>
          <span className="font-medium text-gray-900">Club Admin</span>
        </div>
      </div>

      {/* T&C */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#E63329] flex-shrink-0"
        />
        <span className="text-sm text-gray-600">
          I confirm that I am authorised to register this club and I agree to the{' '}
          <span className="text-[#E63329]">Terms and Conditions</span> of the SLSC Membership Portal.
        </span>
      </label>

      {error && <Alert type="error" msg={error} />}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
          ← Back
        </Button>
        <Button
          type="button"
          className="flex-1 bg-[#E63329] hover:bg-red-700 text-white"
          onClick={onSubmit}
          disabled={!agreed || submitting}
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating club…</>
            : 'Create Club & Account'}
        </Button>
      </div>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function RegisterClub() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [club, setClub] = useState<ClubForm>({
    clubName: '', clubCode: '', country: 'AUS', stateRegion: '',
    slsaClubNumber: '', contactEmail: '', contactPhone: '',
  })

  const [admin, setAdmin] = useState<AdminForm>({
    firstName: '', lastName: '', email: '', password: '', confirm: '',
  })

  const setClubField = (k: keyof ClubForm, v: string) => setClub(p => ({ ...p, [k]: v }))
  const setAdminField = (k: keyof AdminForm, v: string) => setAdmin(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')

    let insertedClubId: string | null = null

    try {
      // 1. Insert club record (as anon)
      const { data: clubRow, error: clubErr } = await supabase
        .from('clubs')
        .insert({
          club_name: club.clubName,
          club_code: club.clubCode,
          country: club.country,
          state_region: club.stateRegion,
          slsa_club_number: club.slsaClubNumber || null,
          contact_email: club.contactEmail,
          contact_phone: club.contactPhone || null,
          subscription_status: 'free',
        })
        .select('id')
        .single()

      if (clubErr) {
        if (clubErr.message.includes('unique') && clubErr.message.includes('club_code')) {
          setSubmitError('This club code is already registered. Please choose another.')
        } else {
          setSubmitError('Failed to create club. Please try again.')
        }
        setSubmitting(false)
        return
      }

      insertedClubId = clubRow.id

      // 2. Create Supabase auth user
      const { error: signUpErr } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
        options: {
          data: {
            first_name: admin.firstName,
            last_name: admin.lastName,
            full_name: `${admin.firstName} ${admin.lastName}`,
          },
        },
      })

      if (signUpErr) {
        // Roll back: delete the club we just created
        await supabase.from('clubs').delete().eq('id', insertedClubId)
        if (signUpErr.message.includes('User already registered') || signUpErr.message.includes('already been registered')) {
          setSubmitError('An account with this email already exists. Please sign in.')
        } else {
          setSubmitError(signUpErr.message)
        }
        setSubmitting(false)
        return
      }

      // 3. Sign in with the new credentials to get a session
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: admin.email,
        password: admin.password,
      })

      if (signInErr || !signInData.user) {
        await supabase.from('clubs').delete().eq('id', insertedClubId)
        setSubmitError(
          signInErr?.message.includes('Email not confirmed')
            ? 'Please check your email to confirm your address, then sign in.'
            : 'Account created but could not sign in automatically. Please sign in manually.'
        )
        setSubmitting(false)
        return
      }

      const authUserId = signInData.user.id

      // 4. Insert member record
      const { data: memberRow, error: memberErr } = await supabase
        .from('members')
        .insert({
          club_id: insertedClubId,
          first_name: admin.firstName,
          last_name: admin.lastName,
          email: admin.email,
          auth_user_id: authUserId,
          membership_status: 'active',
          membership_type: 'senior',
          join_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single()

      if (memberErr) {
        await supabase.from('clubs').delete().eq('id', insertedClubId)
        await supabase.auth.signOut()
        setSubmitError('Failed to create member record. Please try again.')
        setSubmitting(false)
        return
      }

      // 5. Insert club_admin role
      const { error: roleErr } = await supabase
        .from('roles')
        .insert({
          club_id: insertedClubId,
          member_id: memberRow.id,
          role_name: 'club_admin',
          assigned_at: new Date().toISOString(),
          is_active: true,
        })

      if (roleErr) {
        // Non-fatal — club and member are created; admin can assign the role later
        console.warn('Role insert failed:', roleErr.message)
      }

      // 6. Redirect to dashboard
      navigate('/', { replace: true })

    } catch (err) {
      if (insertedClubId) {
        await supabase.from('clubs').delete().eq('id', insertedClubId)
      }
      setSubmitError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-2 bg-gradient-to-b from-[#E63329] to-[#FFD700]" />
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#E63329] mb-3">
              <span className="text-white font-bold text-xl">SL</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Register Your Club</h1>
            <p className="text-gray-500 text-sm mt-1">Set up your club on the SLSC Membership Portal</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <StepIndicator current={step} total={3} />

            {step === 1 && (
              <Step1
                data={club}
                onChange={setClubField}
                onNext={() => setStep(2)}
                onBack={() => navigate('/login')}
              />
            )}
            {step === 2 && (
              <Step2
                data={admin}
                onChange={setAdminField}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3
                club={club}
                admin={admin}
                onBack={() => setStep(2)}
                onSubmit={handleSubmit}
                submitting={submitting}
                error={submitError}
              />
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#E63329] hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
