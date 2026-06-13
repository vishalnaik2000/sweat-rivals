import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { fetchSubscribedMetrics, type MetricDef } from '../lib/metrics'
import { fetchEntries, fetchEntriesRange, upsertEntry, deleteEntry } from '../lib/entries'
import { todayStr, addDays, prettyDate } from '../lib/date'
import { computeStreak } from '../lib/streak'

const STREAK_WINDOW = 90

type Status = 'idle' | 'saving' | 'saved'

export default function Today() {
  const { session } = useAuth()
  const userId = session!.user.id

  const [day, setDay] = useState(todayStr())
  const [metrics, setMetrics] = useState<MetricDef[]>([])
  const [values, setValues] = useState<Record<string, number | null>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  // history for streaks: metricId -> day -> value (last STREAK_WINDOW days)
  const [hist, setHist] = useState<Record<string, Record<string, number | null>>>({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Status>('idle')

  const isToday = day === todayStr()

  useEffect(() => {
    fetchSubscribedMetrics(userId).then(setMetrics)
  }, [userId])

  useEffect(() => {
    fetchEntriesRange(userId, addDays(todayStr(), -(STREAK_WINDOW - 1)), todayStr()).then((rows) => {
      const h: Record<string, Record<string, number | null>> = {}
      for (const r of rows) (h[r.metric_def_id] ??= {})[r.day] = r.value
      setHist(h)
    })
  }, [userId])

  useEffect(() => {
    setLoading(true)
    fetchEntries(userId, day)
      .then((rows) => {
        const v: Record<string, number | null> = {}
        const n: Record<string, string> = {}
        for (const r of rows) {
          v[r.metric_def_id] = r.value
          if (r.note) n[r.metric_def_id] = r.note
        }
        setValues(v)
        setNotes(n)
      })
      .finally(() => setLoading(false))
  }, [userId, day])

  async function commit(m: MetricDef, value: number | null, note: string | null) {
    setStatus('saving')
    try {
      let stored: number | null | undefined // undefined = row removed
      if (m.type === 'text') {
        if (note && note.trim()) {
          await upsertEntry(userId, m.id, day, null, note.trim())
          stored = null
        } else {
          await deleteEntry(userId, m.id, day)
          stored = undefined
        }
      } else if (value == null) {
        await deleteEntry(userId, m.id, day)
        stored = undefined
      } else {
        await upsertEntry(userId, m.id, day, value, null)
        stored = value
      }
      // keep the streak history in sync so 🔥 updates live as you log
      if (day >= addDays(todayStr(), -(STREAK_WINDOW - 1))) {
        setHist((h) => {
          const metric = { ...(h[m.id] ?? {}) }
          if (stored === undefined) delete metric[day]
          else metric[day] = stored
          return { ...h, [m.id]: metric }
        })
      }
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1200)
    } catch {
      setStatus('idle')
    }
  }

  function setValue(m: MetricDef, v: number | null) {
    setValues((s) => ({ ...s, [m.id]: v }))
    commit(m, v, null)
  }

  // Update the on-screen value without writing (used while typing; commit on blur).
  function updateLocal(m: MetricDef, v: number | null) {
    setValues((s) => ({ ...s, [m.id]: v }))
  }

  function setNote(m: MetricDef, text: string) {
    setNotes((s) => ({ ...s, [m.id]: text }))
    commit(m, null, text)
  }

  return (
    <section>
      <header className="mb-5 flex items-center justify-between">
        <button
          onClick={() => setDay(addDays(day, -1))}
          className="h-9 w-9 rounded-lg border border-border text-lg hover:bg-surface"
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-lg font-bold">{prettyDate(day)}</div>
          <div className="h-4 text-xs text-muted">
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : ''}
          </div>
        </div>
        <button
          onClick={() => setDay(addDays(day, 1))}
          disabled={isToday}
          className="h-9 w-9 rounded-lg border border-border text-lg hover:bg-surface disabled:opacity-30"
          aria-label="Next day"
        >
          ›
        </button>
      </header>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          You aren&apos;t tracking anything yet.
          <br />
          <Link to="/metrics" className="font-medium text-accent hover:underline">
            Browse metrics →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {metrics.map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">{m.emoji}</span>
                <span className="font-medium">{m.label}</span>
                {m.unit && <span className="text-xs text-muted">({m.unit})</span>}
                {(() => {
                  const s = computeStreak(m, hist[m.id] ?? {}, STREAK_WINDOW)
                  return s > 0 ? (
                    <span className="ml-auto shrink-0 rounded-full bg-bg px-2 py-0.5 text-xs font-semibold">
                      🔥 {s}
                      {s >= STREAK_WINDOW ? '+' : ''}
                    </span>
                  ) : null
                })()}
              </div>
              <Control
                m={m}
                value={values[m.id] ?? null}
                note={notes[m.id] ?? ''}
                day={day}
                onValue={(v) => setValue(m, v)}
                onValueLocal={(v) => updateLocal(m, v)}
                onNote={(t) => setNote(m, t)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Control({
  m,
  value,
  note,
  day,
  onValue,
  onValueLocal,
  onNote,
}: {
  m: MetricDef
  value: number | null
  note: string
  day: string
  onValue: (v: number | null) => void
  onValueLocal: (v: number | null) => void
  onNote: (t: string) => void
}) {
  if (m.type === 'bool') {
    const on = value === 1
    const onColor = m.direction === 'lower' ? 'bg-bad text-white' : 'bg-accent text-accent-fg'
    return (
      <button
        onClick={() => onValue(on ? null : 1)}
        className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${
          on ? onColor : 'border border-border text-muted hover:bg-bg'
        }`}
      >
        {on ? 'Done ✓' : 'Mark done'}
      </button>
    )
  }

  if (m.type === 'counter') {
    const v = value ?? 0
    const clean = (raw: string): number | null =>
      raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0))
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onValue(value == null ? null : Math.max(0, v - 1))}
          className="h-10 w-10 shrink-0 rounded-lg border border-border text-xl hover:bg-bg"
          aria-label="Decrease"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value ?? ''}
          placeholder="0"
          onChange={(e) => onValueLocal(clean(e.target.value))}
          onBlur={(e) => onValue(clean(e.target.value))}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-center text-lg font-bold outline-none focus:border-accent"
        />
        <button
          onClick={() => onValue(v + 1)}
          className="h-10 w-10 shrink-0 rounded-lg border border-border text-xl hover:bg-bg"
          aria-label="Increase"
        >
          +
        </button>
      </div>
    )
  }

  if (m.type === 'number') {
    const step = (m.config?.step as number) ?? 'any'
    return (
      <input
        key={`${day}-${m.id}`}
        type="number"
        inputMode="decimal"
        step={step}
        defaultValue={value ?? ''}
        placeholder="—"
        onBlur={(e) => {
          const raw = e.target.value.trim()
          onValue(raw === '' ? null : Number(raw))
        }}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
      />
    )
  }

  if (m.type === 'scale') {
    const max = (m.config?.max as number) ?? 5
    return (
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const sel = value === n
          return (
            <button
              key={n}
              onClick={() => onValue(sel ? null : n)}
              className={`h-10 flex-1 rounded-lg text-sm font-semibold ${
                sel ? 'bg-accent text-accent-fg' : 'border border-border text-muted hover:bg-bg'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
    )
  }

  // text
  return (
    <textarea
      key={`${day}-${m.id}`}
      defaultValue={note}
      placeholder="Write a note…"
      rows={2}
      onBlur={(e) => onNote(e.target.value)}
      className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
    />
  )
}
