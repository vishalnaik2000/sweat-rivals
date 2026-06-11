import { supabase } from './supabase'

export interface EntryRow {
  metric_def_id: string
  value: number | null
  note: string | null
}

export async function fetchEntries(userId: string, day: string): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('metric_def_id, value, note')
    .eq('user_id', userId)
    .eq('day', day)
  if (error) throw error
  return (data ?? []) as EntryRow[]
}

export async function upsertEntry(
  userId: string,
  metricDefId: string,
  day: string,
  value: number | null,
  note: string | null,
) {
  const { error } = await supabase.from('entries').upsert(
    {
      user_id: userId,
      metric_def_id: metricDefId,
      day,
      value,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,metric_def_id,day' },
  )
  if (error) throw error
}

export async function deleteEntry(userId: string, metricDefId: string, day: string) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('user_id', userId)
    .eq('metric_def_id', metricDefId)
    .eq('day', day)
  if (error) throw error
}
