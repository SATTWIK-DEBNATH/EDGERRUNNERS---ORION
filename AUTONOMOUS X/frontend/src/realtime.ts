import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export function useRealtime(onChange: () => void) {
  const [state, setState] = useState<'disabled' | 'connecting' | 'connected' | 'error'>('connecting')

  useEffect(() => {
    // 1. Prefer Supabase Realtime if configured
    if (supabase) {
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
    }

    // 2. Direct FastAPI WebSocket fallback / primary
    let ws: WebSocket | null = null
    let reconnectTimer: number | undefined
    let alive = true

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/ws/live`
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (alive) setState('connected')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as { type?: string }
            if (data?.type && data.type !== 'connection.ack') {
              onChange()
            }
          } catch {
            // Ignore parse errors on ping/handshake
          }
        }

        ws.onerror = () => {
          if (alive) setState('error')
        }

        ws.onclose = () => {
          if (alive) {
            setState('connecting')
            reconnectTimer = window.setTimeout(connectWs, 3000)
          }
        }
      } catch {
        if (alive) setState('error')
      }
    }

    connectWs()

    return () => {
      alive = false
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [onChange])

  return state
}
