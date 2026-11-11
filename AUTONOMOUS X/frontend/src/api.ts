import type { Overview, SimulationSummary } from './types'

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
