// Local-time date helpers. Dates are 'YYYY-MM-DD' strings in the device's local
// timezone. NEVER use Date.toISOString() for the day value — it shifts across the
// UTC boundary and lands entries on the wrong day.

export function toStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return toStr(new Date())
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return toStr(d)
}

// The last n local days ending today, oldest first.
export function lastNDays(n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(todayStr(), -i))
  return out
}

// All local days from `from`..`to` inclusive (oldest first). Empty if from > to.
export function daysInRange(from: string, to: string): string[] {
  const out: string[] = []
  let d = from
  while (d <= to) {
    out.push(d)
    d = addDays(d, 1)
  }
  return out
}

export function prettyDate(s: string): string {
  if (s === todayStr()) return 'Today'
  if (s === addDays(todayStr(), -1)) return 'Yesterday'
  return parse(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
