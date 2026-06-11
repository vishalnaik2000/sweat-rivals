import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { fetchMyChallenges, type Challenge, type InviteStatus } from '../lib/challenges'
import { prettyDate } from '../lib/date'

export default function Challenges() {
  const { session } = useAuth()
  const userId = session!.user.id
  const [rows, setRows] = useState<{ challenge: Challenge; myStatus: InviteStatus | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyChallenges(userId)
      .then(setRows)
      .finally(() => setLoading(false))
  }, [userId])

  const invites = rows.filter((r) => r.myStatus === 'invited')
  const mine = rows.filter((r) => r.myStatus === 'accepted')

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rivals</h1>
        <Link
          to="/challenges/new"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          + New
        </Link>
      </header>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          No challenges yet. Create one and invite a friend to compete.
        </div>
      ) : (
        <>
          {invites.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Invites · {invites.length}
              </h2>
              <div className="space-y-2">
                {invites.map((r) => (
                  <ChallengeRow key={r.challenge.id} c={r.challenge} pending />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Your challenges
            </h2>
            {mine.length === 0 ? (
              <p className="text-sm text-muted">None active.</p>
            ) : (
              <div className="space-y-2">
                {mine.map((r) => (
                  <ChallengeRow key={r.challenge.id} c={r.challenge} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ChallengeRow({ c, pending }: { c: Challenge; pending?: boolean }) {
  return (
    <Link
      to={`/challenges/${c.id}`}
      className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent/60"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{c.name}</div>
        <div className="text-xs text-muted">
          {prettyDate(c.start_date)} – {prettyDate(c.end_date)}
        </div>
      </div>
      {pending ? (
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
          Invite
        </span>
      ) : (
        <span className="text-muted">›</span>
      )}
    </Link>
  )
}
