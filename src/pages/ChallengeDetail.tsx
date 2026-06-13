import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { MetricDef } from '../lib/metrics'
import {
  fetchChallenge,
  fetchParticipants,
  fetchChallengeMetricDefs,
  fetchChallengeEntries,
  respondInvite,
  computeLeaderboard,
  type Challenge,
  type Participant,
  type ChallengeEntry,
} from '../lib/challenges'
import { prettyDate, daysInRange, todayStr } from '../lib/date'

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const userId = session!.user.id

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [metrics, setMetrics] = useState<MetricDef[]>([])
  const [entries, setEntries] = useState<ChallengeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const ch = await fetchChallenge(id)
    const [parts, defs] = await Promise.all([fetchParticipants(id), fetchChallengeMetricDefs(id)])
    const effEnd = ch.end_date < todayStr() ? ch.end_date : todayStr()
    const ents = await fetchChallengeEntries(
      defs.map((d) => d.id),
      ch.start_date,
      effEnd,
    )
    setChallenge(ch)
    setParticipants(parts)
    setMetrics(defs)
    setEntries(ents)
  }, [id])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  if (loading) return <p className="text-muted">Loading…</p>
  if (!challenge) return <p className="text-muted">Challenge not found.</p>

  const me = participants.find((p) => p.user_id === userId)
  const myStatus = challenge.creator_id === userId ? 'accepted' : me?.status ?? null
  const accepted = participants.filter((p) => p.status === 'accepted' && p.user_id)
  const acceptedIds = accepted.map((p) => p.user_id as string)

  const displayName = (uid: string) => {
    const p = participants.find((x) => x.user_id === uid)
    return p?.profiles?.name || p?.profiles?.username || (uid === userId ? 'You' : 'Someone')
  }

  const effEnd = challenge.end_date < todayStr() ? challenge.end_date : todayStr()
  const elapsedDays = daysInRange(challenge.start_date, effEnd).length

  async function respond(accept: boolean) {
    setBusy(true)
    try {
      await respondInvite(challenge!.id, userId, accept, metrics.map((m) => m.id))
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <Link to="/challenges" className="text-sm text-muted hover:text-fg">
          ‹ Rivals
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{challenge.name}</h1>
        <p className="text-sm text-muted">
          {prettyDate(challenge.start_date)} – {prettyDate(challenge.end_date)} · {elapsedDays} day
          {elapsedDays === 1 ? '' : 's'} in
        </p>
      </div>

      {myStatus === 'invited' && (
        <div className="rounded-xl border border-accent/50 bg-accent/10 p-4">
          <p className="mb-3 text-sm font-medium">You&apos;re invited to this challenge.</p>
          <div className="flex gap-2">
            <button
              onClick={() => respond(true)}
              disabled={busy}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => respond(false)}
              disabled={busy}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Leaderboards */}
      <div className="space-y-4">
        {metrics.length === 0 ? (
          <p className="text-sm text-muted">No metrics on this challenge.</p>
        ) : (
          metrics.map((m) => {
            const board = computeLeaderboard(m, acceptedIds, entries, elapsedDays)
            return (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span>{m.emoji}</span>
                  <span className="font-medium">{m.label}</span>
                  <span className="text-xs text-muted">
                    {m.unit ? `${m.unit} · ` : ''}
                    {m.direction === 'lower' ? 'lower wins' : m.direction === 'higher' ? 'higher wins' : 'tracking'}
                  </span>
                </div>
                {board.length === 0 ? (
                  <p className="text-sm text-muted">No participants yet.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {board.map((row, i) => (
                      <li
                        key={row.userId}
                        className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                          i === 0 ? 'bg-accent/10' : ''
                        }`}
                      >
                        <span className="w-5 text-center text-sm font-bold text-muted">
                          {i === 0 ? '🏆' : i + 1}
                        </span>
                        <span className={`flex-1 truncate text-sm ${row.userId === userId ? 'font-semibold' : ''}`}>
                          {displayName(row.userId)}
                        </span>
                        <span className="text-sm font-bold">{fmt(row.value)}</span>
                        {row.logged === 0 && <span className="text-xs text-muted">no logs</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Roster */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Participants · {participants.length}
        </h2>
        <ul className="space-y-1.5">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="truncate">
                {p.profiles?.username
                  ? `@${p.profiles.username}`
                  : p.invited_email ?? 'Unknown'}
                {p.user_id === challenge.creator_id && (
                  <span className="ml-2 text-xs text-muted">host</span>
                )}
              </span>
              <span
                className={`text-xs ${
                  p.status === 'accepted'
                    ? 'text-good'
                    : p.status === 'declined'
                      ? 'text-bad'
                      : 'text-muted'
                }`}
              >
                {p.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
