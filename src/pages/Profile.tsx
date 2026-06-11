import { useAuth } from '../lib/auth'

export default function Profile() {
  const { profile, session, signOut } = useAuth()

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-fg">
            {(profile?.name || profile?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{profile?.name || profile?.username}</div>
            <div className="text-sm text-muted">@{profile?.username}</div>
          </div>
        </div>

        <dl className="mt-5 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Email</dt>
            <dd>{session?.user.email}</dd>
          </div>
        </dl>
      </div>

      <button
        onClick={signOut}
        className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-bad hover:bg-bg"
      >
        Sign out
      </button>
    </section>
  )
}
