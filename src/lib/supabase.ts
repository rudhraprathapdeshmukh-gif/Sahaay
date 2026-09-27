import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim()

// Allow app to boot even if env vars are missing (dev fallback)
export const supabase = createClient(
  supabaseUrl || 'https://fzefnqmpmzcdmkmjkagw.supabase.co',
  supabaseAnonKey || 'sb_publishable_4TQWdhvCO798tBk3CfiJyw_twZqV4mZ',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export default supabase
