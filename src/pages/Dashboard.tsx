import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, Tooltip, Cell } from 'recharts'
import { useAuth } from '../lib/auth'
import { fetchSubscribedMetrics, type MetricDef } from '../lib/metrics'
import { fetchEntriesRange } from '../lib/entries'
import { lastNDays, todayStr, addDays } from '../lib/date'
import { computeStreak } from '../lib/streak'

const RANGES = [7, 14, 30, 90] as const
type Range = (typeof RANGES)[number]
const STREAK_WINDOW = 90

function fmt(n: number | null): string {
  if (n == null) return '–'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

const AGG_LABEL: Record<string, string> = { sum: 'total', average: 'avg', count: 'days' }

export default function Dashboard() {
  const { session } = useAuth()
  const userId = session!.user.id

  const [range, setRange] = useState<Range>(7)
  const [metrics, setMetrics] = useState<MetricDef[]>([])
  // metricId -> day -> value, for the whole streak window (chart slices the last `range`)
  const [byMetricDay, setByMetricDay] = useState<Record<string, Record<string, number | null>>>({})
  const [loading, setLoading] = useState(true)

  const days = useMemo(() => lastNDays(range), [range])

  useEffect(() => {
    fetchSubscribedMetrics(userId).then(setMetrics)
  }, [userId])

  useEffect(() => {
    setLoading(true)
    fetchEntriesRange(userId, addDays(todayStr(), -(STREAK_WINDOW - 1)), todayStr())
      .then((rows) => {
        const map: Record<string, Record<string, number | null>> = {}
        for (const r of rows) (map[r.metric_def_id] ??= {})[r.day] = r.value
        setByMetricDay(map)
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <section>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stats</h1>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                range === r ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nothing to chart yet.{' '}
          <Link to="/metrics" className="font-medium text-accent hover:underline">
            Browse metrics →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((m) => (
            <StatCard key={m.id} m={m} days={days} byDay={byMetricDay[m.id] ?? {}} />
          ))}
        </div>
      )}
    </section>
  )
}

function StatCard({
  m,
  days,
  byDay,
}: {
  m: MetricDef
  days: string[]
  byDay: Record<string, number | null>
}) {
  const series = days.map((d) => ({ day: d.slice(5), v: byDay[d] ?? null }))
  const logged = series.map((s) => s.v).filter((v): v is number => v != null)

  let agg: number | null = null
  if (logged.length) {
    if (m.aggregation === 'sum') agg = logged.reduce((a, b) => a + b, 0)
    else if (m.aggregation === 'average') agg = logged.reduce((a, b) => a + b, 0) / logged.length
    else agg = logged.length // count
  }

  const streak = computeStreak(m, byDay, STREAK_WINDOW)

  // lower-is-better metrics get a warm color; others the accent.
  const color = m.direction === 'lower' ? 'var(--warn)' : 'var(--accent)'

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-1 flex items-center gap-2">
        <span>{m.emoji}</span>
        <span className="truncate text-sm font-medium">{m.label}</span>
        {streak > 0 && (
          <span className="ml-auto shrink-0 text-xs font-semibold">
            🔥 {streak}
            {streak >= STREAK_WINDOW ? '+' : ''}
          </span>
        )}
      </div>
      <div className="mb-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{fmt(agg)}</span>
        {m.unit && agg != null && <span className="text-xs text-muted">{m.unit}</span>}
        <span className="ml-1 text-xs text-muted">
          {AGG_LABEL[m.aggregation]} · {logged.length}/{days.length} logged
        </span>
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <Tooltip
              cursor={{ fill: 'var(--bg)' }}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--fg)',
              }}
              labelStyle={{ color: 'var(--muted)' }}
              formatter={(value) => [fmt(value as number), m.label]}
            />
            <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {series.map((s, i) => (
                <Cell key={i} fill={s.v == null ? 'var(--border)' : color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
