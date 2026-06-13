import type { MetricDef } from './metrics'
import { todayStr, addDays } from './date'

// Consecutive-day streak for a metric.
//  - Good metrics (higher/neutral): days you logged a positive value, ending today
//    (or yesterday if today isn't logged yet — a grace day so an un-logged "today"
//    doesn't zero the streak). A logged non-positive value breaks it.
//  - Avoid metrics (direction 'lower'): "clean" days since your last slip (a logged
//    value > 0). Empty days count as clean, but only once you've engaged at all
//    (>=1 entry) — otherwise a brand-new avoid metric would falsely show a huge streak.
//
// byDay maps 'YYYY-MM-DD' -> logged value (absent key = not logged that day).
export function computeStreak(
  metric: MetricDef,
  byDay: Record<string, number | null | undefined>,
  maxLookback = 90,
): number {
  const isPos = (v: number | null | undefined) => typeof v === 'number' && v > 0

  if (metric.direction === 'lower') {
    if (Object.keys(byDay).length === 0) return 0 // not engaged yet
    if (isPos(byDay[todayStr()])) return 0 // slipped today
    let cursor = todayStr()
    let streak = 0
    for (let i = 0; i < maxLookback; i++) {
      if (isPos(byDay[cursor])) break // a slip ends the clean streak
      streak++
      cursor = addDays(cursor, -1)
    }
    return streak
  }

  let cursor = todayStr()
  if (!isPos(byDay[cursor])) {
    if (byDay[cursor] === undefined) cursor = addDays(cursor, -1) // grace: today not logged yet
    else return 0 // logged a non-positive value today → broken
  }
  let streak = 0
  for (let i = 0; i < maxLookback; i++) {
    if (isPos(byDay[cursor])) {
      streak++
      cursor = addDays(cursor, -1)
    } else break
  }
  return streak
}
