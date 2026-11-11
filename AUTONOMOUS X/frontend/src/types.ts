export type EntityPoint = { id: string; latitude: number; longitude: number }
export type Route = { order_id: string; vehicle_id: string | null; warehouse_id: string; status: string; coordinates: EntityPoint[] }
export type Warehouse = EntityPoint & { name: string; available: boolean; inventory: Record<string, number>; assigned_orders: number }
export type Vehicle = EntityPoint & { capacity_kg: number; load_kg: number; available: boolean; in_transit: boolean }
export type RoadEdge = { start: string; end: string; travel_time_s: number; closed: boolean; start_latitude: number; start_longitude: number; end_latitude: number; end_longitude: number }
export type Incident = { id: string; kind: string; status: string; occurred_at_s: number; entity_id?: string | null; start_node?: string | null; end_node?: string | null; affected_order_ids?: string[] }
export type Overview = {
  simulation: { id: string; seed: number; status: string; simulated_time_s: number; routing_source: string } | null
  orders: { total: number; pending: number; assigned: number; in_transit: number; delivered: number; unfulfillable: number; fulfillment_rate: number }
  warehouses: Warehouse[]; vehicles: Vehicle[]; routes: Route[]; road_edges: RoadEdge[]; locations: EntityPoint[]
  incidents: Incident[]; agent_activity: { order_id: string; agent: string; accepted: boolean; reason: string }[]
  delivery_timeline: { time_s: number; event: string; order_id: string; detail?: string | null }[]
  metrics: { fleet_utilization: number; warehouse_workload: { warehouse_id: string; orders: number }[] }
}
export type SimulationSummary = { id: string; seed: number; status: string; simulated_time_s: number }
