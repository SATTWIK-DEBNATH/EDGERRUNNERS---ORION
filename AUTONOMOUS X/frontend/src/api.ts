import type { CedarAuditRecord, Overview, SimulationSummary, StreamEvent, StreamStatus } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json() as { detail?: string }
      if (body.detail) message = body.detail
    } catch { /* Keep the status based message. */ }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const listSimulations = () => request<SimulationSummary[]>('/api/simulations')
export const getOverview = (id: string) => request<Overview>(`/api/overview?simulation_id=${encodeURIComponent(id)}`)
export const createSimulation = () => request<{ id: string }>('/api/simulations', {
  method: 'POST', body: JSON.stringify({ seed: 7, warehouse_count: 3, vehicle_count: 10, order_count: 20 }),
})
export const postJson = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) })
export const getStreamStatus = () => request<StreamStatus>('/api/stream/status')
export const getStreamEvents = () => request<StreamEvent[]>('/api/stream/events')
export const getCedarAudit = () => request<CedarAuditRecord[]>('/api/cedar/audit')
export const getH3Heatmap = (simId?: string) => request<{
  geojson: {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      properties: { h3_index: string; count: number; center_lat: number; center_lng: number }
      geometry: { type: 'Polygon'; coordinates: number[][][] }
    }>
  }
  cells: { h3_index: string; count: number }[]
}>(`/api/h3/heatmap${simId ? `?simulation_id=${encodeURIComponent(simId)}` : ''}`)

export type AIDispatchRequest = {
  origin: string
  destination: string
  item_name: string
  quantity: number
  weight_kg: number
  priority: string
  selected_warehouse_id?: string
  api_key?: string
}

export type CandidateWarehouse = {
  id: string
  name: string
  city: string
  latitude: number
  longitude: number
  total_capacity_kg: number
  current_load_kg: number
  capacity_pct: number
  safety_score: number
  zone_status: string
  available_headroom_kg?: number
  suitability_score?: number
}

export type AIDispatchResponse = {
  order_id: string
  model_used: string
  transit_time_prediction: {
    estimated_days: number
    estimated_hours: number
    distance_km: number
    speed_profile: string
    eta_summary: string
  }
  geopolitical_uncertainty_analysis: {
    risk_score: number
    risk_level: string
    probability_decision: string
    active_factors: string[]
  }
  route_rerouting_strategy: {
    primary_route: string
    contingency_reroute: string
    trigger_event: string
    how_track_changes: string
  }
  warehouse_selection_and_capacity: {
    recommended_warehouse_id: string
    recommended_warehouse_name: string
    city: string
    safety_rating: number
    current_capacity_pct: number
    available_capacity_pct: number
    available_headroom_kg: number
    why_safe_and_optimal: string
    all_warehouses_evaluated: CandidateWarehouse[]
  }
  confidence_matrix: {
    on_time_probability: number
    risk_resilience: number
    cedar_policy_status: string
  }
  llm_summary: string
}

export const analyzeDispatchOrder = (data: AIDispatchRequest) =>
  request<AIDispatchResponse>('/api/ai/dispatch-analysis', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getCandidateWarehouses = () =>
  request<CandidateWarehouse[]>('/api/ai/candidate-warehouses')
