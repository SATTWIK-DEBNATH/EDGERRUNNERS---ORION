import { useEffect, useState } from 'react'
import { getStreamEvents, getStreamStatus } from '../api'
import type { StreamEvent, StreamStatus } from '../types'

export default function StreamMonitor() {
  const [status, setStatus] = useState<StreamStatus | null>(null)
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const fetchStatus = () => {
      getStreamStatus()
        .then((s) => { if (alive) setStatus(s) })
        .catch((err: unknown) => { if (alive) setError(err instanceof Error ? err.message : 'Status error') })

      getStreamEvents()
        .then((e) => { if (alive) setEvents(e.slice(-8).reverse()) })
        .catch(() => {})
    }

    fetchStatus()
    const timer = window.setInterval(fetchStatus, 3000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  return (
    <article className="panel stream-monitor-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">INFRASTRUCTURE · KAFKA · FLINK · TIMEFOLD</span>
          <h2>Real-Time Stream Monitor</h2>
        </div>
        <span className="live-pulse"><i />LIVE STREAM</span>
      </div>

      {status ? (
        <div className="stream-grid">
          <div className="stream-badge-row">
            <span className="stream-chip">
              <span className="chip-label">Kafka KRaft</span>
              <strong className="chip-val green">{status.kafka.status}</strong>
            </span>
            <span className="stream-chip">
              <span className="chip-label">Flink CEP</span>
              <strong className="chip-val blue">{status.flink.status}</strong>
            </span>
            <span className="stream-chip">
              <span className="chip-label">Solver</span>
              <strong className="chip-val amber" title={status.timefold.version}>Timefold OSS</strong>
            </span>
            <span className="stream-chip">
              <span className="chip-label">Costing</span>
              <strong className="chip-val violet">Valhalla OSM</strong>
            </span>
            <span className="stream-chip">
              <span className="chip-label">Cedar PEP</span>
              <strong className="chip-val cyan">{status.cedar.p50_latency_us} µs</strong>
            </span>
          </div>

          <div className="stream-metrics-bar">
            <span>Throughput: <strong>{status.metrics.events_per_second} evt/s</strong></span>
            <span>Total Broadcast: <strong>{status.metrics.total_events_broadcast}</strong></span>
            <span>Active Clients: <strong>{status.metrics.active_clients}</strong></span>
          </div>

          <div className="stream-event-feed">
            <div className="feed-header">Live Event Stream</div>
            {events.length ? (
              events.map((evt, idx) => (
                <div className="feed-row" key={`${evt.timestamp}-${idx}`}>
                  <span className="feed-dot" />
                  <span className="feed-type">{evt.type}</span>
                  <span className="feed-time">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            ) : (
              <div className="chart-empty">Waiting for streaming events…</div>
            )}
          </div>
        </div>
      ) : (
        <div className="chart-empty">{error || 'Loading stream monitor…'}</div>
      )}
    </article>
  )
}

