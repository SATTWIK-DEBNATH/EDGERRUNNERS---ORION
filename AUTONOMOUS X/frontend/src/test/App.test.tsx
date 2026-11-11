import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'

vi.mock('../components/OperationsMap', () => ({ default: () => <div data-testid="operations-map">Map</div> }))
vi.mock('../components/Analytics', () => ({ default: () => <div data-testid="analytics">Analytics</div> }))

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('operations dashboard', () => {
  it('shows an empty state and creates a deterministic local simulation on request', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200 }))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'sim-1', seed: 7, status: 'created', orders: [], warehouses: [] }), { status: 201 }))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      simulation: { id: 'sim-1', seed: 7, status: 'created', simulated_time_s: 0, routing_source: 'synthetic_fallback' },
      orders: { total: 0, pending: 0, assigned: 0, in_transit: 0, delivered: 0, unfulfillable: 0, fulfillment_rate: 0 },
      warehouses: [], vehicles: [], routes: [], road_edges: [], locations: [], incidents: [], agent_activity: [], delivery_timeline: [],
      metrics: { fleet_utilization: 0, warehouse_workload: [] },
    }), { status: 200 }))
    render(<App />)
    expect(await screen.findByText(/no simulation selected/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /create demo simulation/i }))
    expect(await screen.findByText(/sim-1/i)).toBeTruthy()
    expect(await screen.findByTestId('operations-map')).toBeTruthy()
  })

  it('renders a readable error when the API is unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('API unavailable'))
    render(<App />)
    expect(await screen.findByText(/api unavailable/i)).toBeTruthy()
  })
})
