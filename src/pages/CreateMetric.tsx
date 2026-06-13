import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  createCustomMetric,
  subscribe,
  type MetricType,
  type Aggregation,
} from '../lib/metrics'

const TYPES: { value: MetricType; label: string; hint: string }[] = [
  { value: 'counter', label: 'Count', hint: 'whole numbers you tally (e.g. glasses, reps)' },
  { value: 'number', label: 'Number', hint: 'a measured amount, decimals allowed (e.g. km, kg)' },
  { value: 'bool', label: 'Yes / No', hint: 'did it or not' },
  { value: 'scale', label: 'Scale 1–N', hint: 'a rating (e.g. mood 1–5)' },
  { value: 'text', label: 'Note', hint: 'free text' },
]

export default function CreateMetric() {
  const { session } = useAuth()
  const userId = session!.user.id
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [label, setLabel] = useState(params.get('name') ?? '')
  const [emoji, setEmoji] = useState('🎯')
  const [type, setType] = useState<MetricType>('counter')
  const [unit, setUnit] = useState('')
  const [direction, setDirection] = useState<'higher' | 'lower' | 'neutral'>('higher')
  const [aggregation, setAggregation] = useState<Aggregation>('sum')
  const [scaleMax, setScaleMax] = useState(5)
  const [step, setStep] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showUnit = type === 'counter' || type === 'number'
  const showDirection = type !== 'text'
  const showAggregation = type === 'counter' || type === 'number' || type === 'scale'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return setError('Give your metric a name.')
    setBusy(true)
    setError(null)

    const config: Record<string, unknown> = {}
    if (type === 'scale') config.max = scaleMax
    if (type === 'number' && step.trim()) config.step = Number(step)

    // bool aggregates as count of done-days; text doesn't aggregate.
    const agg: Aggregation = type === 'bool' || type === 'text' ? 'count' : aggregation

    try {
      const id = await createCustomMetric(userId, {
        label: label.trim(),
        emoji: emoji.trim() || null,
        type,
        unit: showUnit ? unit.trim() || null : null,
        direction: showDirection && direction !== 'neutral' ? direction : null,
        aggregation: agg,
        visibility,
        description: description.trim() || null,
        config,
      })
      await subscribe(userId, id, 0) // track it right away
      navigate('/metrics')
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const field = 'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent'

  return (
    <section>
      <button onClick={() => navigate('/metrics')} className="text-sm text-muted hover:text-fg">
        ‹ Metrics
      </button>
      <h1 className="mb-5 mt-1 text-2xl font-bold">Create a metric</h1>

      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-2">
          <input
            className="w-16 rounded-lg border border-border bg-bg px-3 py-2 text-center text-xl outline-none focus:border-accent"
            value={emoji}
            maxLength={2}
            onChange={(e) => setEmoji(e.target.value)}
            aria-label="Emoji"
          />
          <input
            className={field}
            placeholder="Name (e.g. Cold plunge)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <div className="grid grid-cols-1 gap-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setType(t.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  type === t.value ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface'
                }`}
              >
                <span className="font-medium">{t.label}</span>{' '}
                <span className="text-muted">— {t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {showUnit && (
          <div>
            <label className="mb-1 block text-sm font-medium">Unit (optional)</label>
            <input className={field} placeholder="e.g. km, mins, reps" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        )}

        {type === 'number' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Step (optional)</label>
            <input className={field} type="number" placeholder="e.g. 0.5" value={step} onChange={(e) => setStep(e.target.value)} />
          </div>
        )}

        {type === 'scale' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Max (scale 1–N)</label>
            <input
              className={field}
              type="number"
              min={2}
              max={10}
              value={scaleMax}
              onChange={(e) => setScaleMax(Math.min(10, Math.max(2, Number(e.target.value) || 5)))}
            />
          </div>
        )}

        {showDirection && (
          <div>
            <label className="mb-1 block text-sm font-medium">Goal</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['higher', type === 'bool' ? 'Good habit' : 'Higher is better'],
                  ['lower', type === 'bool' ? 'Avoid it' : 'Lower is better'],
                  ['neutral', 'Just track'],
                ] as const
              ).map(([val, lbl]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setDirection(val)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    direction === val ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted hover:bg-surface'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {showAggregation && (
          <div>
            <label className="mb-1 block text-sm font-medium">Roll up daily values as</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['sum', 'Total'],
                  ['average', 'Average'],
                  ['count', 'Count of days'],
                ] as const
              ).map(([val, lbl]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAggregation(val)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    aggregation === val ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted hover:bg-surface'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Description (optional)</label>
          <input
            className={field}
            placeholder="Shown in the ⓘ tooltip"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Visibility</label>
          <div className="flex gap-2">
            {(
              [
                ['private', 'Private', 'only you can use it'],
                ['public', 'Public', 'others can find & use it too'],
              ] as const
            ).map(([val, lbl, hint]) => (
              <button
                type="button"
                key={val}
                onClick={() => setVisibility(val)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  visibility === val ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface'
                }`}
              >
                <div className="font-medium">{lbl}</div>
                <div className="text-xs text-muted">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create & track'}
        </button>
      </form>
    </section>
  )
}
