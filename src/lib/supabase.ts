import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only the anon (public) key belongs in the browser. The service_role key must
// NEVER appear here — Row-Level Security is what protects data. See SCHEMA.md.
if (!url || !anon) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(url, anon)
