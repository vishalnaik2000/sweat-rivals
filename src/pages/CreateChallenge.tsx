import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { fetchSubscribedMetrics, type MetricDef } from '../lib/metrics'
import { createChallenge } from '../lib/challenges'
import { todayStr, addDays } from '../lib/date'

export default function CreateChallenge() {
  const { session } = useAuth()
  const userId = session!.user.id
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [start, setStart] = useState(todayStr())
  const [end, setEnd] = useState(addDays(todayStr(), 7))
  const [maxParticipants, setMax] = useState(10)
  const [metrics, setMetrics] = useState<MetricDef[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [inviteInput, setInviteInput] = useState('')
  const [invites, setInvites] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscribedMetrics(userId).then(setMetrics)
  }, [userId])

  function togglePick(id: string) {
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function addInvite() {
    const v = inviteInput.trim()
    if (v && !invites.includes(v)) setInvites([...invites, v])
    setInviteInput('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Give your challenge a name.')
    if (picked.size === 0) return setError('Pick at least one metric to compete on.')
    if (end < start) return setError('End date must be after the start date.')

    setBusy(true)
    setError(null)
    try {
      const { challengeId, unresolved } = await createChallenge(userId, {
        name: name.trim(),
        start,
        end,
        maxParticipants,
        metricIds: [...picked],
        invites,
      })
      if (unresolved.length) {
        // non-fatal: just inform via console; challenge is created
        console.warn('Unknown usernames skipped:', unresolved)
      }
      navigate(`/challenges/${challengeId}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const field = 'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent'

  return (
    <section>
      <h1 className="mb-5 text-2xl font-bold">New challenge</h1>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            className={field}
            placeholder="e.g. June Step Wars"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Start</label>
            <input type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">End</label>
            <input type="date" className={field} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Max participants</label>
          <input
            type="number"
            min={2}
            max={10}
            className={field}
            value={maxParticipants}
            onChange={(e) => setMax(Math.min(10, Math.max(2, Number(e.target.value) || 2)))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Metrics to compete on{picked.size > 0 && ` · ${picked.size}`}
          </label>
          {metrics.length === 0 ? (
            <p className="text-sm text-muted">
              You aren&apos;t tracking any metrics yet — add some from the Metrics tab first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {metrics.map((m) => {
                const on = picked.has(m.id)
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => togglePick(m.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      on ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted hover:bg-surface'
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Invite (username or email)</label>
          <div className="flex gap-2">
            <input
              className={field}
              placeholder="@username or name@email.com"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addInvite()
                }
              }}
            />
            <button type="button" onClick={addInvite} className="rounded-lg border border-border px-3 text-sm hover:bg-surface">
              Add
            </button>
          </div>
          {invites.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {invites.map((v) => (
                <span key={v} className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-sm">
                  {v}
                  <button
                    type="button"
                    onClick={() => setInvites(invites.filter((x) => x !== v))}
                    className="text-muted hover:text-fg"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create challenge'}
        </button>
      </form>
    </section>
  )
}
