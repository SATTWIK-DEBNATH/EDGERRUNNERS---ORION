import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createSimulation, getOverview, listSimulations, postJson } from './api'
import { useRealtime } from './realtime'
import type { Overview, SimulationSummary } from './types'

const Analytics = lazy(() => import('./components/Analytics'))
const OperationsMap = lazy(() => import('./components/OperationsMap'))

export default function App() {
  const [simulations, setSimulations] = useState<SimulationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comparison, setComparison] = useState<Record<string, number | string> | null>(null)
  const [rlResult, setRlResult] = useState<{ episode_count: number; accepted_recommendations: number; rejected_recommendations: number; policy_mean_cost_on_accepted: number; baseline_mean_cost_same_episodes: number } | null>(null)
  const [rlBusy, setRlBusy] = useState(false)
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const orderLocation = useRef<HTMLSelectElement>(null)
  const timerBusy = useRef(false)
  const simulation = overview?.simulation ?? null

  const refreshOverview = useCallback(async (simulationId = activeId) => {
    if (!simulationId) return
    const next = await getOverview(simulationId)
    setOverview(next)
    setError('')
  }, [activeId])

  const realtimeStatus = useRealtime(refreshOverview)

  useEffect(() => {
    let alive = true
    listSimulations().then(async (items) => {
      if (!alive) return
      setSimulations(items)
      if (items.length) {
        setActiveId(items[0].id)
        const next = await getOverview(items[0].id)
        if (alive) setOverview(next)
      }
    }).catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : 'Could not connect to the API')
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!activeId || overview?.simulation?.status !== 'running') return
    const timer = window.setInterval(async () => {
      if (timerBusy.current) return
      timerBusy.current = true
      try {
        const result = await postJson<{ overview: Overview }>(`/api/simulations/${activeId}/step`, { seconds: 240 })
        setOverview(result.overview)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Simulation step failed')
      } finally { timerBusy.current = false }
    }, 900)
    return () => window.clearInterval(timer)
  }, [activeId, overview?.simulation?.status])

  useEffect(() => {
    const handler = () => {
      if (!activeId) return
      postJson<Record<string, number | string>>(`/api/optimization/run?simulation_id=${encodeURIComponent(activeId)}`, {})
        .then(setComparison).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Optimization failed'))
    }
    window.addEventListener('run-optimization', handler)
    return () => window.removeEventListener('run-optimization', handler)
  }, [activeId])

  useEffect(() => {
    const handler = () => {
      if (!simulation) return
      setRlBusy(true)
      postJson<typeof rlResult>('/api/rl/train', { seed: simulation.seed, timesteps: 512, episodes: 32 })
        .then((result) => setRlResult(result))
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'PPO evaluation failed'))
        .finally(() => setRlBusy(false))
    }
    window.addEventListener('run-rl', handler)
    return () => window.removeEventListener('run-rl', handler)
  }, [simulation])

  async function createDemo() {
    setActionBusy(true)
    setError('')
    try {
      const simulation = await createSimulation()
      setSimulations((items) => [{ id: simulation.id, seed: 7, status: 'created', simulated_time_s: 0 }, ...items])
      setActiveId(simulation.id)
      setOverview(await getOverview(simulation.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create a simulation')
    } finally { setActionBusy(false); setLoading(false) }
  }

  async function control(action: 'start' | 'pause' | 'resume' | 'reset' | 'step') {
    if (!activeId) return
    setActionBusy(true)
    try {
      const path = `/api/simulations/${activeId}/${action}`
      const response = action === 'step'
        ? await postJson<{ overview: Overview }>(path, { seconds: 600 })
        : await postJson<{ status: string }>(path, {})
      if ('overview' in response) setOverview(response.overview)
      else await refreshOverview(activeId)
      if (action === 'reset') setComparison(null)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not ${action} simulation`)
    } finally { setActionBusy(false) }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeId || !orderLocation.current?.value) return
    const form = new FormData(event.currentTarget)
    try {
      await postJson('/api/orders', {
        simulation_id: activeId, location_id: orderLocation.current.value, item_id: form.get('item_id'),
        quantity: Number(form.get('quantity')), weight_kg: Number(form.get('weight_kg')),
        priority: Number(form.get('priority')), urgent: form.get('urgent') === 'on',
      })
      await refreshOverview(activeId)
      event.currentTarget.reset()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create order') }
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeId || !overview) return
    const form = new FormData(event.currentTarget)
    const kind = String(form.get('kind'))
    const payload: Record<string, unknown> = { simulation_id: activeId, kind }
    if (kind === 'vehicle_breakdown' || kind === 'warehouse_outage') payload.entity_id = form.get('entity_id')
    else {
      const [startNode, endNode] = String(form.get('edge') ?? '').split('|')
      payload.start_node = startNode
      payload.end_node = endNode
      if (kind === 'traffic') payload.factor = Number(form.get('factor'))
    }
    try {
      await postJson('/api/incidents', payload)
      await refreshOverview(activeId)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not schedule incident') }
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeId) return
    const question = String(new FormData(event.currentTarget).get('question') ?? '')
    setAssistantBusy(true)
    try {
      const response = await postJson<{ answer: string }>('/api/assistant/query', { simulation_id: activeId, question })
      setAssistantAnswer(response.answer)
      setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Assistant is unavailable') }
    finally { setAssistantBusy(false) }
  }

  if (loading) return <main className="screen-state"><span className="spinner" /><p>Loading operations workspace…</p></main>
  if (!overview) return <main className="app-shell">
    <header className="topbar"><Brand /><span className="mode-pill"><i />Local simulation</span></header>
    {error && <ErrorBanner message={error} />}
    <section className="empty-state panel"><div className="empty-icon">AX</div><span className="eyebrow">YOUR CONTROL ROOM</span><h1>No simulation selected</h1><p>Create a deterministic Bengaluru scenario to watch vehicles, routing decisions, inventory, and incidents.</p><button className="primary-button" onClick={createDemo} disabled={actionBusy}>Create demo simulation</button></section>
  </main>

  const status = simulation?.status ?? 'idle'
  const percent = Math.round(overview.orders.fulfillment_rate * 100)
  const lastEvents = [...overview.delivery_timeline].reverse().slice(0, 6)

  return <main className="app-shell">
    <header className="topbar"><Brand /><div className="topbar-right"><span className={`connection-pill ${realtimeStatus}`}><i />{realtimeStatus === 'connected' ? 'Supabase live' : realtimeStatus === 'error' ? 'Realtime error' : realtimeStatus === 'connecting' ? 'Realtime connecting' : 'Local mode'}</span>{simulations.length > 1 && <select aria-label="Select simulation" value={activeId ?? ''} onChange={(event) => { setActiveId(event.target.value); void refreshOverview(event.target.value) }}>{simulations.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select>}<span className="simulation-id">{simulation?.id ?? 'No simulation'}</span></div></header>
    <div className="page-heading"><div><span className="eyebrow">OPERATIONS / BENGALURU</span><h1>Logistics control room</h1><p>Coordinate demand, fleet activity, and recovery from one live simulation.</p></div><div className="scenario-chip"><span className="seed-dot" />Seed {simulation?.seed ?? '—'} <b>·</b> {simulation?.routing_source ?? 'no road graph'}</div></div>
    {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

    <section className="kpi-grid" aria-label="Simulation metrics">
      <Metric label="Orders delivered" value={`${overview.orders.delivered}/${overview.orders.total}`} foot={`${percent}% fulfillment`} icon="↗" accent="green" />
      <Metric label="In transit" value={String(overview.orders.in_transit)} foot={`${overview.orders.assigned} assigned · ${overview.orders.pending} pending`} icon="◉" accent="blue" />
      <Metric label="Active vehicles" value={`${overview.vehicles.filter((vehicle) => vehicle.available).length}/${overview.vehicles.length}`} foot={`${Math.round(overview.metrics.fleet_utilization * 100)}% capacity load`} icon="⌁" accent="amber" />
      <Metric label="Simulation clock" value={formatTime(simulation?.simulated_time_s ?? 0)} foot={status.replace('_', ' ')} icon="◷" accent="violet" />
    </section>

    <section className="workspace-grid">
      <article className="panel map-panel">
        <div className="panel-heading map-heading"><div><span className="eyebrow">FLEET / ROUTES / INCIDENTS</span><h2>Live network</h2></div><div className={`status-tag ${status}`}><i />{status}</div></div>
        <Suspense fallback={<div className="map-loading">Loading map layers…</div>}><OperationsMap overview={overview} /></Suspense>
        <div className="map-footer"><span>Road graph: <strong>{simulation?.routing_source ?? 'unavailable'}</strong></span><span>{overview.routes.length} routed orders</span></div>
      </article>
      <aside className="side-stack">
        <article className="panel control-panel">
          <div className="panel-heading"><div><span className="eyebrow">SIMULATION</span><h2>Run controls</h2></div><span className="clock-value">{formatTime(simulation?.simulated_time_s ?? 0)}</span></div>
          <div className="control-actions">
            {status === 'created' && <button className="primary-button" onClick={() => void control('start')} disabled={actionBusy}>Start simulation</button>}
            {status === 'running' && <button className="primary-button pause-button" onClick={() => void control('pause')} disabled={actionBusy}>Pause</button>}
            {status === 'paused' && <button className="primary-button" onClick={() => void control('resume')} disabled={actionBusy}>Resume</button>}
            {status !== 'completed' && <button className="secondary-button" onClick={() => void control('step')} disabled={actionBusy}>Step +10 min</button>}
            <button className="icon-button" aria-label="Reset simulation" onClick={() => void control('reset')} disabled={actionBusy}>↻</button>
          </div>
          <div className="progress-meta"><span>Fulfillment progress</span><strong>{percent}%</strong></div><div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
        </article>
        <article className="panel inventory-panel"><div className="panel-heading"><div><span className="eyebrow">SUPPLY</span><h2>Warehouse stock</h2></div><span className="subtle-count">{overview.warehouses.length} hubs</span></div>
          {overview.warehouses.length ? overview.warehouses.map((warehouse) => <div className="warehouse-row" key={warehouse.id}><div className="warehouse-mark">⌂</div><div className="warehouse-copy"><strong>{warehouse.name}</strong><small>{warehouse.id} · {warehouse.assigned_orders} active orders</small></div><span className={`availability ${warehouse.available ? '' : 'offline'}`}>{warehouse.available ? 'Online' : 'Offline'}</span><div className="stock-pills">{Object.entries(warehouse.inventory).map(([product, amount]) => <span key={product}>{product} <b>{amount}</b></span>)}</div></div>) : <p className="chart-empty">No warehouses in this simulation.</p>}
        </article>
      </aside>
    </section>

    <Suspense fallback={<div className="chart-empty">Loading analytics…</div>}><Analytics overview={overview} comparison={comparison} rlResult={rlResult} rlBusy={rlBusy} /></Suspense>

    <section className="tools-grid">
      <article className="panel tool-panel"><div className="panel-heading"><div><span className="eyebrow">DEMAND</span><h2>Create an order</h2></div></div>
        <form className="stack-form" onSubmit={createOrder}>
          <label>Delivery location<select name="location_id" ref={orderLocation} required defaultValue="">{overview.locations.length ? <><option value="" disabled>Select a location</option>{overview.locations.map((location) => <option key={location.id} value={location.id}>{location.id}</option>)}</> : <option value="">No locations available</option>}</select></label>
          <div className="form-row"><label>Product<select name="item_id"><option value="parcel">Parcel</option><option value="grocery">Grocery</option><option value="medical">Medical</option></select></label><label>Quantity<input name="quantity" type="number" min="1" defaultValue="1" required /></label></div>
          <div className="form-row"><label>Weight (kg)<input name="weight_kg" type="number" min="0.1" step="0.1" defaultValue="2" required /></label><label>Priority<select name="priority" defaultValue="3"><option value="1">Low</option><option value="3">Standard</option><option value="5">High</option></select></label></div>
          <label className="check-label"><input name="urgent" type="checkbox" /> Urgent insertion with recovery agent</label>
          <button className="secondary-button wide-button" type="submit" disabled={!overview.locations.length}>Create order</button>
        </form>
      </article>
      <article className="panel tool-panel"><div className="panel-heading"><div><span className="eyebrow">DISRUPTION</span><h2>Inject an incident</h2></div></div>
        <form className="stack-form" onSubmit={createIncident}>
          <label>Incident type<select name="kind"><option value="traffic">Traffic slowdown</option><option value="road_closure">Road closure</option><option value="vehicle_breakdown">Vehicle breakdown</option><option value="warehouse_outage">Warehouse outage</option></select></label>
          <label>Road edge<select name="edge">{overview.road_edges.map((edge) => <option key={`${edge.start}-${edge.end}`} value={`${edge.start}|${edge.end}`}>{edge.start} → {edge.end}</option>)}</select></label>
          <label>Vehicle / warehouse<select name="entity_id"><optgroup label="Vehicles">{overview.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.id}</option>)}</optgroup><optgroup label="Warehouses">{overview.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.id}</option>)}</optgroup></select></label>
          <button className="secondary-button wide-button" type="submit">Schedule incident</button>
        </form>
      </article>
      <article className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">DECISION TRACE</span><h2>Agent activity</h2></div><span className="subtle-count">{overview.agent_activity.length} decisions</span></div>
        <div className="activity-list">{overview.agent_activity.length ? overview.agent_activity.slice(-10).reverse().map((item, index) => <div className="activity-row" key={`${item.order_id}-${item.agent}-${index}`}><span className={`decision-icon ${item.accepted ? 'accepted' : 'rejected'}`}>{item.accepted ? '✓' : '×'}</span><div><strong>{item.agent} agent</strong><small>{item.order_id} · {item.reason}</small></div><span className="decision-state">{item.accepted ? 'accepted' : 'rejected'}</span></div>) : <div className="chart-empty">Agent decisions appear when orders are coordinated.</div>}</div>
      </article>
      <article className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">INCIDENT LOG</span><h2>Recovery activity</h2></div><span className="subtle-count">{overview.incidents.length} events</span></div>
        <div className="activity-list">{overview.incidents.length ? [...overview.incidents].reverse().map((incident) => <div className="activity-row" key={incident.id}><span className="incident-icon">!</span><div><strong>{incident.kind.replaceAll('_', ' ')}</strong><small>{incident.entity_id ?? `${incident.start_node ?? ''} → ${incident.end_node ?? ''}`} · {incident.status}</small></div><span className={`decision-state ${incident.status}`}>{incident.status}</span></div>) : <div className="chart-empty">No incidents recorded.</div>}{lastEvents.map((event, index) => <div className="activity-row event-row" key={`${event.order_id}-${event.event}-${index}`}><span className="event-marker" /><div><strong>{event.event.replaceAll('_', ' ')}</strong><small>{event.order_id} · {formatTime(event.time_s)}</small></div></div>)}</div>
      </article>
      <article className="panel tool-panel assistant-panel"><div className="panel-heading"><div><span className="eyebrow">READ-ONLY EXPLAINER</span><h2>Operations assistant</h2></div><span className="subtle-count">Ollama optional</span></div>
        <form className="assistant-form" onSubmit={askAssistant}><input name="question" placeholder="Ask about this simulation…" maxLength={500} required /><button className="primary-button" disabled={assistantBusy}>{assistantBusy ? 'Thinking…' : 'Ask'}</button></form>
        {assistantAnswer && <p className="assistant-answer">{assistantAnswer}</p>}<p className="helper-text">Assistant responses can explain current state; they cannot change orders, routes, or inventory.</p>
      </article>
    </section>
    <footer className="footer"><span>Autonomous X · local operations prototype</span><span>All dashboard metrics come from simulation state</span></footer>
  </main>
}

function Brand() { return <a className="brand" href="#top"><span className="brand-mark">AX</span><span>AUTONOMOUS <b>X</b></span></a> }
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) { return <div className="error-banner" role="alert"><span>!</span><p>{message}</p>{onDismiss && <button onClick={onDismiss} aria-label="Dismiss error">×</button>}</div> }
function Metric({ label, value, foot, icon, accent }: { label: string; value: string; foot: string; icon: string; accent: string }) { return <article className="panel metric-card"><div className="metric-top"><span>{label}</span><i className={`metric-icon ${accent}`}>{icon}</i></div><strong>{value}</strong><small>{foot}</small></article> }
function formatTime(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` }
