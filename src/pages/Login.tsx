import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthShell, { inputClass, btnClass } from '../components/AuthShell'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
      // if a session comes back (email confirmation disabled), AuthProvider takes over.
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setBusy(false)
  }

  return (
    <AuthShell
      title={mode === 'signin' ? 'Welcome back' : 'Create your account'}
      subtitle={mode === 'signin' ? 'Sign in to keep your streak going.' : 'Start tracking and challenging friends.'}
    >
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        {notice && <p className="text-sm text-good">{notice}</p>}
        <button type="submit" disabled={busy} className={btnClass}>
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === 'signin' ? "No account?" : 'Already have one?'}{' '}
        <button
          className="font-medium text-accent hover:underline"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setNotice(null)
          }}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </AuthShell>
  )
}
