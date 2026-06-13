import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import AuthShell, { inputClass, btnClass } from '../components/AuthShell'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

// Build a valid username suggestion from a name or email local-part.
function suggestUsername(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

export default function Onboarding() {
  const { session, refreshProfile, signOut } = useAuth()
  const meta = (session?.user.user_metadata ?? {}) as Record<string, string>
  const googleName = meta.full_name || meta.name || ''
  const googleAvatar = meta.avatar_url || meta.picture || null

  const [username, setUsername] = useState(
    suggestUsername(googleName || (session?.user.email ?? '').split('@')[0] || ''),
  )
  const [name, setName] = useState(googleName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    if (!USERNAME_RE.test(u)) {
      setError('Username: 3–20 chars, lowercase letters, numbers or underscore.')
      return
    }
    setBusy(true)
    setError(null)

    const { error } = await supabase.from('profiles').insert({
      id: session!.user.id,
      username: u,
      name: name.trim() || null,
      avatar_url: googleAvatar,
    })

    if (error) {
      setError(error.code === '23505' ? 'That username is taken.' : error.message)
      setBusy(false)
      return
    }

    // Pre-subscribe the new user to the default starter metrics (best-effort).
    const { data: defaults } = await supabase
      .from('metric_defs')
      .select('id, sort_order')
      .is('owner_id', null)
      .eq('is_default', true)
      .order('sort_order')
    if (defaults?.length) {
      await supabase.from('user_metrics').insert(
        defaults.map((d, i) => ({
          user_id: session!.user.id,
          metric_def_id: d.id,
          sort_order: i,
        })),
      )
    }

    await refreshProfile()
  }

  return (
    <AuthShell title="Pick your username" subtitle="This is how friends find you. You can change your name later.">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="flex items-center rounded-lg border border-border bg-bg px-3 focus-within:border-accent">
            <span className="text-muted">@</span>
            <input
              required
              placeholder="username"
              autoFocus
              className="w-full bg-transparent px-1 py-2 text-fg outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <p className="mt-1 text-xs text-muted">lowercase letters, numbers, underscore</p>
        </div>
        <input
          placeholder="Display name (optional)"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button type="submit" disabled={busy} className={btnClass}>
          {busy ? '…' : 'Continue'}
        </button>
      </form>

      <button onClick={signOut} className="mt-4 w-full text-center text-sm text-muted hover:text-fg">
        Sign out
      </button>
    </AuthShell>
  )
}
