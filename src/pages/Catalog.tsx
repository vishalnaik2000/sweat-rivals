import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  fetchCatalog,
  fetchSubscribedIds,
  subscribe,
  unsubscribe,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type MetricDef,
} from '../lib/metrics'

export default function Catalog() {
  const { session } = useAuth()
  const userId = session!.user.id

  const [defs, setDefs] = useState<MetricDef[]>([])
  const [subs, setSubs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [openInfo, setOpenInfo] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchCatalog(), fetchSubscribedIds(userId)])
      .then(([d, s]) => {
        setDefs(d)
        setSubs(new Set(s))
      })
      .finally(() => setLoading(false))
  }, [userId])

  async function toggle(m: MetricDef) {
    if (busy.has(m.id)) return
    const isSub = subs.has(m.id)
    setBusy((b) => new Set(b).add(m.id))
    // optimistic update
    setSubs((s) => {
      const n = new Set(s)
      if (isSub) n.delete(m.id)
      else n.add(m.id)
      return n
    })
    try {
      if (isSub) await unsubscribe(userId, m.id)
      else await subscribe(userId, m.id, subs.size)
    } catch {
      // revert on failure
      setSubs((s) => {
        const n = new Set(s)
        if (isSub) n.add(m.id)
        else n.delete(m.id)
        return n
      })
    } finally {
      setBusy((b) => {
        const n = new Set(b)
        n.delete(m.id)
        return n
      })
    }
  }

  if (loading) return <p className="text-muted">Loading metrics…</p>

  const subscribed = defs.filter((d) => subs.has(d.id))
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: defs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Metrics</h1>
        <p className="mt-1 text-sm text-muted">Tap + to track a metric · ⓘ for details.</p>
      </header>

      {subscribed.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Your metrics · {subscribed.length}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {subscribed.map((m) => (
              <button
                key={m.id}
                onClick={() => toggle(m)}
                disabled={busy.has(m.id)}
                className="flex items-center gap-2 rounded-lg border border-accent/60 bg-surface px-3 py-2 text-left text-sm disabled:opacity-50"
              >
                <span>{m.emoji}</span>
                <span className="flex-1 truncate">{m.label}</span>
                <span className="text-accent">✓</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.cat}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
          <ul className="space-y-2">
            {g.items.map((m) => {
              const isSub = subs.has(m.id)
              return (
                <li key={m.id} className="rounded-lg border border-border bg-surface">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="text-lg">{m.emoji}</span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate font-medium">{m.label}</span>
                      {m.unit && (
                        <span className="shrink-0 rounded bg-bg px-1.5 py-0.5 text-xs text-muted">
                          {m.unit}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setOpenInfo(openInfo === m.id ? null : m.id)}
                      aria-label="Details"
                      className="h-7 w-7 rounded-full border border-border text-sm text-muted hover:text-fg"
                    >
                      ⓘ
                    </button>
                    <button
                      onClick={() => toggle(m)}
                      disabled={busy.has(m.id)}
                      aria-label={isSub ? 'Unsubscribe' : 'Subscribe'}
                      className={`h-8 w-9 rounded-lg text-sm font-bold disabled:opacity-50 ${
                        isSub
                          ? 'bg-accent text-accent-fg'
                          : 'border border-border text-fg hover:bg-bg'
                      }`}
                    >
                      {isSub ? '✓' : '+'}
                    </button>
                  </div>
                  {openInfo === m.id && (
                    <div className="border-t border-border px-3 py-2 text-sm text-muted">
                      {m.description}
                      {m.unit && <> · unit: {m.unit}</>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
