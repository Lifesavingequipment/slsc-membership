import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type View = 'login' | 'forgot'

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
function LoginForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate()
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

      <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/register')}>
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
      {view === 'login'  && <LoginForm  onForgot={() => setView('forgot')} />}
      {view === 'forgot' && <ForgotPasswordForm onBack={() => setView('login')} />}
    </PageShell>
  )
}
