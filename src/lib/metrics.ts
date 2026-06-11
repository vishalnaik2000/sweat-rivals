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
  config: Record<string, unknown>
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
