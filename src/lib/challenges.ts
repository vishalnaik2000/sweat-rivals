import { supabase } from './supabase'
import type { MetricDef } from './metrics'

export type ChallengeStatus = 'draft' | 'active' | 'ended'
export type InviteStatus = 'invited' | 'accepted' | 'declined'

export interface Challenge {
  id: string
  creator_id: string
  name: string
  start_date: string
  end_date: string
  max_participants: number
  status: ChallengeStatus
  created_at: string
}

export interface Participant {
  id: string
  challenge_id: string
  user_id: string | null
  invited_email: string | null
  status: InviteStatus
  profiles?: { username: string; name: string | null } | null
}

export interface ChallengeEntry {
  user_id: string
  metric_def_id: string
  day: string
  value: number | null
}

export async function fetchMyChallenges(userId: string) {
  const [{ data: ch }, { data: parts }] = await Promise.all([
    supabase.from('challenges').select('*').order('created_at', { ascending: false }),
    supabase.from('challenge_participants').select('challenge_id, status').eq('user_id', userId),
  ])
  const status = new Map((parts ?? []).map((p) => [p.challenge_id as string, p.status as InviteStatus]))
  return ((ch ?? []) as Challenge[]).map((c) => ({
    challenge: c,
    myStatus: (c.creator_id === userId ? 'accepted' : status.get(c.id) ?? null) as InviteStatus | null,
  }))
}

export async function fetchChallenge(id: string): Promise<Challenge> {
  const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single()
  if (error) throw error
  return data as Challenge
}

export async function fetchParticipants(challengeId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('id, challenge_id, user_id, invited_email, status, profiles(username, name)')
    .eq('challenge_id', challengeId)
  if (error) throw error
  return (data ?? []) as unknown as Participant[]
}

export async function fetchChallengeMetricDefs(challengeId: string): Promise<MetricDef[]> {
  const { data, error } = await supabase
    .from('challenge_metrics')
    .select('metric_defs(*)')
    .eq('challenge_id', challengeId)
  if (error) throw error
  return (data ?? []).map((r) => (r as unknown as { metric_defs: MetricDef }).metric_defs)
}

export async function fetchChallengeEntries(
  metricIds: string[],
  from: string,
  to: string,
): Promise<ChallengeEntry[]> {
  if (!metricIds.length) return []
  const { data, error } = await supabase
    .from('entries')
    .select('user_id, metric_def_id, day, value')
    .in('metric_def_id', metricIds)
    .gte('day', from)
    .lte('day', to)
  if (error) throw error
  return (data ?? []) as ChallengeEntry[]
}

async function findProfileByUsername(username: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  return data as { id: string; username: string } | null
}

export interface NewChallenge {
  name: string
  start: string
  end: string
  maxParticipants: number
  metricIds: string[]
  invites: string[] // usernames or emails
}

export async function createChallenge(userId: string, c: NewChallenge) {
  const { data: ch, error } = await supabase
    .from('challenges')
    .insert({
      creator_id: userId,
      name: c.name,
      start_date: c.start,
      end_date: c.end,
      max_participants: c.maxParticipants,
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw error
  const challengeId = (ch as { id: string }).id

  // creator joins as an accepted participant
  await supabase.from('challenge_participants').insert({
    challenge_id: challengeId,
    user_id: userId,
    invited_by: userId,
    status: 'accepted',
    joined_at: new Date().toISOString(),
  })

  if (c.metricIds.length) {
    await supabase
      .from('challenge_metrics')
      .insert(c.metricIds.map((metric_def_id) => ({ challenge_id: challengeId, metric_def_id })))
  }

  // resolve invites
  const unresolved: string[] = []
  const rows: Record<string, unknown>[] = []
  for (const raw of c.invites) {
    const v = raw.trim()
    if (!v) continue
    if (v.includes('@')) {
      rows.push({ challenge_id: challengeId, invited_email: v.toLowerCase(), invited_by: userId, status: 'invited' })
    } else {
      const p = await findProfileByUsername(v)
      if (p && p.id !== userId) {
        rows.push({ challenge_id: challengeId, user_id: p.id, invited_by: userId, status: 'invited' })
      } else if (!p) {
        unresolved.push(v)
      }
    }
  }
  if (rows.length) await supabase.from('challenge_participants').insert(rows)

  await subscribeSelfToMetrics(userId, c.metricIds)
  return { challengeId, unresolved }
}

export async function respondInvite(
  challengeId: string,
  userId: string,
  accept: boolean,
  metricIds: string[],
) {
  await supabase
    .from('challenge_participants')
    .update({
      status: accept ? 'accepted' : 'declined',
      joined_at: accept ? new Date().toISOString() : null,
    })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)

  if (accept) await subscribeSelfToMetrics(userId, metricIds)
}

// Auto-subscribe: a user can only insert their OWN user_metrics (RLS), so each
// participant subscribes themselves to the challenge's metrics on create/accept.
async function subscribeSelfToMetrics(userId: string, metricIds: string[]) {
  if (!metricIds.length) return
  await supabase.from('user_metrics').upsert(
    metricIds.map((metric_def_id, i) => ({ user_id: userId, metric_def_id, sort_order: 100 + i })),
    { onConflict: 'user_id,metric_def_id', ignoreDuplicates: true },
  )
}

export interface LeaderEntry {
  userId: string
  value: number
  logged: number
}

// Per-metric leaderboard with the neutral missing-day rule:
//  - average: missing day = the user's own logged-day average (mean unchanged)
//  - sum:     value = mean * elapsedDays (scales partial loggers to full participation)
//  - count:   value = number of logged days (missing = 0)
export function computeLeaderboard(
  metric: MetricDef,
  acceptedUserIds: string[],
  entries: ChallengeEntry[],
  elapsedDays: number,
): LeaderEntry[] {
  const rows = acceptedUserIds.map((uid) => {
    const vals = entries
      .filter((e) => e.metric_def_id === metric.id && e.user_id === uid && e.value != null)
      .map((e) => e.value as number)
    const logged = vals.length
    let value: number
    if (metric.aggregation === 'count') {
      value = logged
    } else {
      const mean = logged ? vals.reduce((a, b) => a + b, 0) / logged : 0
      value = metric.aggregation === 'sum' ? mean * elapsedDays : mean
    }
    return { userId: uid, value, logged }
  })
  const dir = metric.direction === 'lower' ? 1 : -1 // lower-is-better → ascending
  rows.sort((a, b) => (a.value - b.value) * dir)
  return rows
}
