import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource } from 'maplibre-gl'
import type { Overview } from '../types'
import { buildMapData } from '../mapData'
import { configureMapLibreWorker } from '../mapWorker'
import 'maplibre-gl/dist/maplibre-gl.css'

configureMapLibreWorker()

type Props = { overview: Overview }

export default function OperationsMap({ overview }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<InstanceType<typeof MapLibreMap> | null>(null)
  const latestOverview = useRef(overview)
  latestOverview.current = overview

  useEffect(() => {
    if (!container.current || map.current) return
    const instance = new MapLibreMap({
      container: container.current,
      center: [77.59, 12.97], zoom: 11,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      attributionControl: { compact: true },
    })
    map.current = instance
    instance.addControl(new NavigationControl(), 'top-right')
    instance.on('error', (event) => console.error('MapLibre style or tile error', event.error))
    instance.on('load', () => {
      const data = buildMapData(latestOverview.current)
      instance.addSource('routes', { type: 'geojson', data: data.routes })
      instance.addSource('entities', { type: 'geojson', data: data.entities })
      instance.addLayer({ id: 'routes-line', type: 'line', source: 'routes', paint: { 'line-color': '#56d6a3', 'line-width': 3, 'line-opacity': 0.8 } })
      instance.addLayer({ id: 'entities-dot', type: 'circle', source: 'entities', paint: {
        'circle-radius': ['match', ['get', 'kind'], 'vehicle', 5, 'warehouse', 8, 'incident', 8, 4],
        'circle-color': ['match', ['get', 'kind'], 'warehouse', '#e5b95c', 'vehicle', '#70c7ff', 'incident', '#ff6969', 'location', '#e7e9e4', '#d8dde0'],
        'circle-stroke-width': 2, 'circle-stroke-color': '#121714',
      } })
    })
    return () => { instance.remove(); map.current = null }
  }, [])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const update = () => {
      const data = buildMapData(overview)
      const routeSource = instance.getSource('routes') as GeoJSONSource | undefined
      const entitySource = instance.getSource('entities') as GeoJSONSource | undefined
      routeSource?.setData(data.routes)
      entitySource?.setData(data.entities)
    }
    if (instance.getSource('routes') && instance.getSource('entities')) update()
    else instance.once('load', update)
  }, [overview])

  return <div className="map-wrap"><div className="map-canvas" ref={container} aria-label="Operations map" />{!overview.simulation && <div className="map-empty">Create a simulation to see live locations and routes.</div>}<div className="map-legend"><span><i className="dot wh" />Warehouse</span><span><i className="dot veh" />Vehicle</span><span><i className="dot inc" />Incident</span></div></div>
}
