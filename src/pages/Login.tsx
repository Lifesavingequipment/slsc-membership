import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type View = 'login' | 'forgot' | 'register'

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="w-2 bg-gradient-to-b from-[#E63329] to-[#FFD700]" />
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E63329] mb-4">
              <span className="text-white font-bold text-2xl">SL</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SLSC Membership</h1>
            <p className="text-gray-500 text-sm mt-1">Surf Life Saving Club Portal</p>
          </div>
          {children}
          <p className="text-center text-xs text-gray-400 mt-6">
            Surf Life Saving Club Management Portal
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Inline field error ───────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-[#E63329] mt-1">{msg}</p>
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
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

// ─── Password input with show/hide toggle ────────────────────────────────────
function PasswordInput({
  id, value, onChange, placeholder = '••••••••', autoComplete,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
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

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
function LoginForm({ onForgot, onRegister }: { onForgot: () => void; onRegister: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errs: typeof fieldErrors = {}
    if (!email)                              errs.email    = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email))   errs.email    = 'Enter a valid email address.'
    if (!password)                           errs.password = 'Password is required.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // When "remember me" is off, clear the session when the tab closes
    if (!error && !remember) {
      window.addEventListener('beforeunload', () => { supabase.auth.signOut() }, { once: true })
    }
    if (error) setError(friendlyAuthError(error.message))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })) }}
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
        />
        <FieldError msg={fieldErrors.email} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-[#E63329] hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="password"
          value={password}
          onChange={v => { setPassword(v); setFieldErrors(p => ({ ...p, password: undefined })) }}
          autoComplete="current-password"
        />
        <FieldError msg={fieldErrors.password} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={e => setRemember(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 accent-[#E63329]"
        />
        Remember me
      </label>

      {error && <Alert type="error" msg={error} />}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
          : 'Sign in'}
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white px-2">or</span>
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={onRegister}>
        Register your club
      </Button>
    </form>
  )
}

// ─── FORGOT PASSWORD VIEW ─────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [sent, setSent]         = useState(false)
  const [fieldError, setFieldError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldError('')
    if (!email) { setFieldError('Email is required.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setFieldError('Enter a valid email address.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(friendlyAuthError(error.message))
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">Reset your password</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <Alert type="success" msg="Check your email for a password reset link." />
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[#E63329] hover:underline"
          >
            ← Back to login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldError('') }}
              autoComplete="email"
            />
            <FieldError msg={fieldError} />
          </div>

          {error && <Alert type="error" msg={error} />}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
              : 'Send reset link'}
          </Button>

          <button
            type="button"
            onClick={onBack}
            className="block text-sm text-[#E63329] hover:underline"
          >
            ← Back to login
          </button>
        </form>
      )}
    </div>
  )
}

// ─── REGISTER VIEW ────────────────────────────────────────────────────────────
function RegisterForm({ onBack }: { onBack: () => void }) {
  const [form, setForm]   = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<typeof form>>({})

  const set = (k: keyof typeof form) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const errs: Partial<typeof form> = {}
    if (!form.firstName.trim())               errs.firstName = 'First name is required.'
    if (!form.lastName.trim())                errs.lastName  = 'Last name is required.'
    if (!form.email)                          errs.email     = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email   = 'Enter a valid email address.'
    if (!form.password)                       errs.password  = 'Password is required.'
    else if (form.password.length < 8)        errs.password  = 'Password must be at least 8 characters.'
    if (!form.confirm)                        errs.confirm   = 'Please confirm your password.'
    else if (form.confirm !== form.password)  errs.confirm   = 'Passwords do not match.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: `${form.firstName} ${form.lastName}`, first_name: form.firstName, last_name: form.lastName },
      },
    })
    if (error) setError(friendlyAuthError(error.message))
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <Alert type="success" msg="Account created! Check your email to confirm your address before signing in." />
        <button type="button" onClick={onBack} className="text-sm text-[#E63329] hover:underline">
          ← Back to login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4" noValidate>
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">Register your club</h2>
        <p className="text-sm text-gray-500 mt-1">Create an account to get started.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reg-first">First name</Label>
          <Input id="reg-first" value={form.firstName} onChange={e => set('firstName')(e.target.value)} autoComplete="given-name" />
          <FieldError msg={fieldErrors.firstName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-last">Last name</Label>
          <Input id="reg-last" value={form.lastName} onChange={e => set('lastName')(e.target.value)} autoComplete="family-name" />
          <FieldError msg={fieldErrors.lastName} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" value={form.email} onChange={e => set('email')(e.target.value)} autoComplete="email" />
        <FieldError msg={fieldErrors.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <PasswordInput id="reg-password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        <FieldError msg={fieldErrors.password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm">Confirm password</Label>
        <PasswordInput id="reg-confirm" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        <FieldError msg={fieldErrors.confirm} />
      </div>

      {error && <Alert type="error" msg={error} />}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</>
          : 'Create account'}
      </Button>

      <button type="button" onClick={onBack} className="block text-sm text-[#E63329] hover:underline">
        ← Back to login
      </button>
    </form>
  )
}

// ─── Friendly error messages ──────────────────────────────────────────────────
function friendlyAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials'))  return 'Incorrect email or password. Please try again.'
  if (msg.includes('Email not confirmed'))         return 'Please confirm your email address before signing in.'
  if (msg.includes('Too many requests'))           return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('User already registered'))     return 'An account with this email already exists.'
  if (msg.includes('Database error'))              return 'A server error occurred. Please try again shortly.'
  return msg
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function Login() {
  const { user } = useAuth()
  const [view, setView] = useState<View>('login')

  if (user) return <Navigate to="/" replace />

  return (
    <PageShell>
      {view === 'login'    && <LoginForm    onForgot={() => setView('forgot')}   onRegister={() => setView('register')} />}
      {view === 'forgot'   && <ForgotPasswordForm onBack={() => setView('login')} />}
      {view === 'register' && <RegisterForm       onBack={() => setView('login')} />}
    </PageShell>
  )
}
