import type { FeatureCollection, Geometry } from 'geojson'
import type { Overview } from './types'

type MapData = { routes: FeatureCollection<Geometry>; entities: FeatureCollection<Geometry> }

export function buildMapData(overview: Overview): MapData {
  const routes: FeatureCollection<Geometry> = {
    type: 'FeatureCollection',
    features: overview.routes.filter((route) => route.coordinates.length > 1).map((route) => ({
      type: 'Feature' as const,
      properties: { order_id: route.order_id, status: route.status },
      geometry: { type: 'LineString' as const, coordinates: route.coordinates.map((point) => [point.longitude, point.latitude]) },
    })),
  }
  const points = [
    ...overview.warehouses.map((item) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, kind: 'warehouse', label: item.name })),
    ...overview.vehicles.map((item) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, kind: 'vehicle', label: item.id })),
    ...overview.locations.map((item) => ({ ...item, kind: 'location', label: item.id })),
    ...overview.incidents.filter((item) => item.status !== 'applied').map((item) => {
      const edge = overview.road_edges.find((road) => road.start === item.start_node && road.end === item.end_node)
      const vehicle = overview.vehicles.find((candidate) => candidate.id === item.entity_id)
      const warehouse = overview.warehouses.find((candidate) => candidate.id === item.entity_id)
      return {
        id: item.id,
        latitude: edge ? (edge.start_latitude + edge.end_latitude) / 2 : vehicle?.latitude ?? warehouse?.latitude ?? 12.97,
        longitude: edge ? (edge.start_longitude + edge.end_longitude) / 2 : vehicle?.longitude ?? warehouse?.longitude ?? 77.59,
        kind: 'incident', label: item.kind,
      }
    }),
  ]
  const entities: FeatureCollection<Geometry> = {
    type: 'FeatureCollection',
    features: points.map((item) => ({
      type: 'Feature' as const,
      properties: { kind: item.kind, label: item.label, id: item.id },
      geometry: { type: 'Point' as const, coordinates: [item.longitude, item.latitude] },
    })),
  }
  return { routes, entities }
}
