import { supabase } from './supabase'

export type MetricType = 'bool' | 'counter' | 'number' | 'scale' | 'text'
export type Direction = 'higher' | 'lower' | null
export type Aggregation = 'sum' | 'average' | 'count'

export interface MetricDef {
  id: string
  owner_id: string | null
  slug: string
  label: string
  emoji: string | null
  type: MetricType
  unit: string | null
  direction: Direction
  aggregation: Aggregation
  category: string | null
  description: string | null
  is_default: boolean
  sort_order: number
  aliases: string[] | null
  config: Record<string, unknown>
}

// Synonym-aware search across label, description and curated aliases.
// Multi-word queries match when every word is found somewhere.
export function matchesQuery(m: MetricDef, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [m.label, m.description ?? '', ...(m.aliases ?? [])].join(' ').toLowerCase()
  return q.split(/\s+/).every((term) => hay.includes(term))
}

// Display order + labels for catalog sections.
export const CATEGORY_ORDER = [
  'movement', 'strength', 'sleep', 'nutrition', 'body',
  'mind', 'focus', 'routine', 'quit', 'social', 'finance',
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  movement: 'Movement & Cardio',
  strength: 'Strength',
  sleep: 'Sleep & Recovery',
  nutrition: 'Hydration & Nutrition',
  body: 'Body & Vitals',
  mind: 'Mind & Mood',
  focus: 'Focus & Productivity',
  routine: 'Routine & Self-care',
  quit: 'Habits to Quit',
  social: 'Social',
  finance: 'Finance',
}

export interface NewMetricInput {
  label: string
  emoji: string | null
  type: MetricType
  unit: string | null
  direction: Direction
  aggregation: Aggregation
  visibility: 'private' | 'public'
  description: string | null
  config: Record<string, unknown>
}

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return `${base || 'metric'}_${Math.random().toString(36).slice(2, 6)}`
}

// Create a user-owned custom metric. owner_id = the user; category 'custom'.
export async function createCustomMetric(userId: string, input: NewMetricInput): Promise<string> {
  const { data, error } = await supabase
    .from('metric_defs')
    .insert({
      owner_id: userId,
      slug: slugify(input.label),
      label: input.label.trim(),
      emoji: input.emoji,
      type: input.type,
      unit: input.unit,
      direction: input.direction,
      aggregation: input.aggregation,
      visibility: input.visibility,
      category: 'custom',
      description: input.description,
      config: input.config,
    })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function fetchCatalog(): Promise<MetricDef[]> {
  const { data, error } = await supabase.from('metric_defs').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as MetricDef[]
}

// Full metric definitions the user is subscribed to, in their chosen order.
export async function fetchSubscribedMetrics(userId: string): Promise<MetricDef[]> {
  const { data, error } = await supabase
    .from('user_metrics')
    .select('sort_order, metric_defs(*)')
    .eq('user_id', userId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((r) => (r as unknown as { metric_defs: MetricDef }).metric_defs)
}

export async function fetchSubscribedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metrics')
    .select('metric_def_id')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((r) => r.metric_def_id as string)
}

export async function subscribe(userId: string, metricDefId: string, sortOrder: number) {
  const { error } = await supabase
    .from('user_metrics')
    .insert({ user_id: userId, metric_def_id: metricDefId, sort_order: sortOrder })
  if (error) throw error
}

export async function unsubscribe(userId: string, metricDefId: string) {
  const { error } = await supabase
    .from('user_metrics')
    .delete()
    .eq('user_id', userId)
    .eq('metric_def_id', metricDefId)
  if (error) throw error
}
