import { describe, expect, it } from 'vitest'
import { buildMapData } from '../mapData'
import type { Overview } from '../types'

const overview: Overview = {
  simulation: { id: 'sim-1', seed: 7, status: 'created', simulated_time_s: 0, routing_source: 'synthetic_fallback' },
  orders: { total: 1, pending: 0, assigned: 1, in_transit: 0, delivered: 0, unfulfillable: 0, fulfillment_rate: 0 },
  warehouses: [{ id: 'wh-1', name: 'Hub', latitude: 12.97, longitude: 77.59, available: true, inventory: {}, assigned_orders: 1 }],
  vehicles: [{ id: 'veh-1', latitude: 12.97, longitude: 77.59, capacity_kg: 100, load_kg: 5, available: true, in_transit: false }],
  routes: [{ order_id: 'ord-1', vehicle_id: 'veh-1', warehouse_id: 'wh-1', status: 'assigned', coordinates: [{ id: 'a', latitude: 12.97, longitude: 77.59 }, { id: 'b', latitude: 12.98, longitude: 77.60 }] }],
  road_edges: [], locations: [{ id: 'loc-1', latitude: 12.98, longitude: 77.60 }], incidents: [], agent_activity: [], delivery_timeline: [],
  metrics: { fleet_utilization: 0.05, warehouse_workload: [] },
}

describe('map feature data', () => {
  it('builds route lines and entity points from the initial simulation overview', () => {
    const data = buildMapData(overview)
    expect(data.routes.features).toHaveLength(1)
    expect(data.routes.features[0].geometry.type).toBe('LineString')
    expect(data.entities.features).toHaveLength(3)
  })
})
