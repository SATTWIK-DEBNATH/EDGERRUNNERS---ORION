import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export function useRealtime(onChange: () => void) {
  const [state, setState] = useState<'disabled' | 'connecting' | 'connected' | 'error'>(supabase ? 'connecting' : 'disabled')
  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel('autonomous-x-operations')
    for (const table of ['orders', 'vehicles', 'warehouse_inventory', 'incidents', 'simulation_events']) {
      channel.on('postgres_changes', { schema: 'public', event: '*', table }, onChange)
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setState('connected')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setState('error')
      else setState('connecting')
    })
    return () => { void supabase.removeChannel(channel) }
  }, [onChange])
  return state
}
