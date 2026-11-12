import { useEffect, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  NavigationControl,
  Marker,
  Popup,
  LngLatBounds,
} from 'maplibre-gl'
import { configureMapLibreWorker } from '../../mapWorker'
import 'maplibre-gl/dist/maplibre-gl.css'

configureMapLibreWorker()

export type Waypoint = {
  lng: number
  lat: number
  name: string
  hindiName?: string
  kind: 'origin' | 'destination' | 'stop' | 'truck'
  time?: string
  status?: string
}

type Props = {
  shipmentId?: string
  vehiclePlate?: string
  currentSpeed?: number
  currentLocationName?: string
  selectedVehicleId?: string
  activeHighway?: string
  heightClass?: string
  onSelectWaypoint?: (wp: Waypoint) => void
  children?: React.ReactNode
}

// Precise corridor coordinates between Jaipur SEZ and Noida Logistics Hub
export const CORRIDOR_POINTS: [number, number][] = [
  [75.7873, 26.9124], // Jaipur SEZ (Origin)
  [75.9814, 27.1856], // Shahpura
  [76.1983, 27.7051], // Kotputli
  [76.2818, 27.8894], // Behror
  [76.6186, 28.1884], // Rewari
  [76.8606, 28.2104], // Bhiwadi
  [77.0266, 28.4595], // Gurugram
  [77.2090, 28.6139], // Delhi Bypass
  [77.3910, 28.5355], // Noida Gateway Hub (Destination)
]

export const WAYPOINTS: Waypoint[] = [
  {
    lng: 75.7873,
    lat: 26.9124,
    name: 'Jaipur SEZ Terminal',
    hindiName: 'जयपुर',
    kind: 'origin',
    time: '17 July 2024, 10:00',
    status: 'Departed (On Schedule)',
  },
  {
    lng: 76.1983,
    lat: 27.7051,
    name: 'Kotputli Freight Stop',
    hindiName: 'कोटपूतली',
    kind: 'stop',
    time: '17 July 2024, 12:00',
    status: 'Stop 01 Cleared',
  },
  {
    lng: 76.6116,
    lat: 27.5530,
    name: 'Alwar Feeder Junction',
    hindiName: 'अलवर',
    kind: 'stop',
    time: '17 July 2024, 14:30',
    status: 'Transit Checked',
  },
  {
    lng: 77.0266,
    lat: 28.4595,
    name: 'Gurugram Express Depot',
    hindiName: 'गुरुग्राम',
    kind: 'stop',
    time: '18 July 2024, 02:00',
    status: 'Scheduled',
  },
  {
    lng: 77.3910,
    lat: 28.5355,
    name: 'Noida Logistics Gateway Hub',
    hindiName: 'नोएडा',
    kind: 'destination',
    time: '21 July 2024, 10:00',
    status: 'Final Destination',
  },
]

// Current truck position (Between Kotputli & Behror on NH48)
const DEFAULT_TRUCK_LOCATION: [number, number] = [76.24, 27.797]

const MAPTILER_KEY = 'pEMrDBU1TT7FTT57Ka3A'

type MapLayer = 'maptiler' | 'satellite' | 'outdoor' | 'osm'

export default function InteractiveCorridorMap({
  shipmentId = 'SHIPID0123',
  vehiclePlate = 'DL04MP7045',
  currentSpeed = 120,
  currentLocationName = 'NH04 - Jaipur Highway',
  activeHighway = 'NH48 / NE4 Expressway Corridor',
  heightClass = 'h-[520px]',
  children,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<InstanceType<typeof MapLibreMap> | null>(null)
  const truckMarkerRef = useRef<InstanceType<typeof Marker> | null>(null)

  const [activeLayer, setActiveLayer] = useState<MapLayer>('maptiler')
  const [zoomLevel, setZoomLevel] = useState<number>(7.8)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [truckPos, setTruckPos] = useState<[number, number]>(DEFAULT_TRUCK_LOCATION)

  // Subtle real-time truck progression simulation along highway
  useEffect(() => {
    const timer = setInterval(() => {
      setTruckPos(([lng, lat]) => {
        // Step forward slightly towards Noida
        const dLng = 0.00015 * (Math.random() * 0.4 + 0.8)
        const dLat = 0.00018 * (Math.random() * 0.4 + 0.8)
        const nextLng = lng + dLng
        const nextLat = lat + dLat
        return [nextLng, nextLat]
      })
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return

    const map = new MapLibreMap({
      container: mapContainer.current,
      center: [76.5, 27.65], // Center between Jaipur and Delhi
      zoom: 7.8,
      pitch: 0,
      bearing: 0,
      scrollZoom: true,
      dragPan: true,
      dragRotate: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      style: {
        version: 8,
        sources: {
          maptiler: {
            type: 'raster',
            tiles: [
              `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
            ],
            tileSize: 256,
            attribution: '© MapTiler © OpenStreetMap contributors',
          },
          satellite: {
            type: 'raster',
            tiles: [
              `https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
            ],
            tileSize: 256,
            attribution: '© MapTiler © OpenStreetMap contributors',
          },
          outdoor: {
            type: 'raster',
            tiles: [
              `https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
            ],
            tileSize: 256,
            attribution: '© MapTiler © OpenStreetMap contributors',
          },
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            layout: { visibility: 'none' },
          },
          {
            id: 'outdoor-layer',
            type: 'raster',
            source: 'outdoor',
            layout: { visibility: 'none' },
          },
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            layout: { visibility: 'none' },
          },
          {
            id: 'maptiler-layer',
            type: 'raster',
            source: 'maptiler',
            layout: { visibility: 'visible' },
          },
        ],
      },
      attributionControl: { compact: true },
    })

    mapInstance.current = map

    // Real Zoom / Tilt / Compass Navigation Control
    const navControl = new NavigationControl({
      showCompass: true,
      visualizePitch: true,
    })
    map.addControl(navControl, 'top-right')

    map.on('zoom', () => {
      setZoomLevel(Math.round(map.getZoom() * 10) / 10)
    })

    map.on('load', () => {
      setMapLoaded(true)

      // 1. Add Corridor Line GeoJSON source
      map.addSource('corridor-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Jaipur-Delhi Highway Corridor' },
              geometry: {
                type: 'LineString',
                coordinates: CORRIDOR_POINTS,
              },
            },
          ],
        },
      })

      // Route Outer Glow / Casing
      map.addLayer({
        id: 'corridor-glow',
        type: 'line',
        source: 'corridor-route',
        paint: {
          'line-color': '#2563eb',
          'line-width': 12,
          'line-opacity': 0.28,
        },
      })

      // Route Main Outer Line
      map.addLayer({
        id: 'corridor-outer',
        type: 'line',
        source: 'corridor-route',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 6,
          'line-opacity': 0.95,
        },
      })

      // Route Core Highlight
      map.addLayer({
        id: 'corridor-core',
        type: 'line',
        source: 'corridor-route',
        paint: {
          'line-color': '#60a5fa',
          'line-width': 3,
        },
      })

      // 2. Add Waypoint HTML Markers
      WAYPOINTS.forEach((wp) => {
        const el = document.createElement('div')
        el.className = 'cursor-pointer select-none'

        if (wp.kind === 'origin') {
          el.innerHTML = `
            <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 group">
              <div class="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-lg ring-4 ring-blue-500/30 group-hover:scale-110 transition-transform">
                J
              </div>
              <div class="bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200 shadow-md text-[10px] font-bold text-blue-900 whitespace-nowrap">
                ${wp.name}
              </div>
            </div>
          `
        } else if (wp.kind === 'destination') {
          el.innerHTML = `
            <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-full group">
              <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xl ring-4 ring-indigo-500/30 group-hover:scale-110 transition-transform">
                📍
              </div>
              <div class="bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200 shadow-md text-[10px] font-extrabold text-indigo-900 whitespace-nowrap">
                ${wp.name}
              </div>
            </div>
          `
        } else {
          el.innerHTML = `
            <div class="flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 opacity-90 hover:opacity-100 group">
              <div class="w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-md group-hover:scale-125 transition-transform"></div>
              <div class="bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-700 shadow-xs whitespace-nowrap hidden group-hover:block">
                ${wp.name}
              </div>
            </div>
          `
        }

        const popup = new Popup({ offset: 15, closeButton: false }).setHTML(`
          <div class="p-2 text-xs font-sans">
            <div class="font-bold text-slate-900">${wp.name}</div>
            <div class="text-[10px] text-slate-500">${wp.hindiName ?? ''} • ${wp.time ?? ''}</div>
            <div class="text-[10px] font-semibold text-blue-600 mt-1">${wp.status ?? ''}</div>
          </div>
        `)

        new Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .setPopup(popup)
          .addTo(map)
      })

      // 3. Add Live Animated Truck Marker
      const truckEl = document.createElement('div')
      truckEl.className = 'cursor-pointer select-none relative -translate-x-1/2 -translate-y-1/2'
      truckEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-12 h-12 rounded-full bg-blue-500/30 animate-ping"></span>
          <div class="relative w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shadow-xl border-2 border-white ring-2 ring-blue-500/50 hover:scale-110 transition-transform">
            🚚
          </div>
          <div class="absolute -bottom-6 bg-slate-900/90 text-white px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight whitespace-nowrap shadow-md">
            ${currentSpeed} km/h
          </div>
        </div>
      `

      const truckPopup = new Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2.5 text-xs font-sans space-y-1">
          <div class="font-extrabold text-blue-600">#${shipmentId}</div>
          <div class="font-bold text-slate-800">${vehiclePlate} • Eicher Pro 2059</div>
          <div class="text-[10px] text-slate-500">${currentLocationName}</div>
          <div class="text-[10px] font-semibold text-emerald-600">Speed: ${currentSpeed} km/h (Optimal)</div>
        </div>
      `)

      const marker = new Marker({ element: truckEl })
        .setLngLat(DEFAULT_TRUCK_LOCATION)
        .setPopup(truckPopup)
        .addTo(map)

      truckMarkerRef.current = marker
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Update truck marker position on position change
  useEffect(() => {
    if (truckMarkerRef.current) {
      truckMarkerRef.current.setLngLat(truckPos)
    }
  }, [truckPos])

  // Zoom In / Zoom Out Controls
  function handleZoomIn() {
    mapInstance.current?.zoomIn({ duration: 300 })
  }

  function handleZoomOut() {
    mapInstance.current?.zoomOut({ duration: 300 })
  }

  // Switch Layer Visibility
  function handleLayerChange(layer: MapLayer) {
    setActiveLayer(layer)
    const map = mapInstance.current
    if (!map) return

    map.setLayoutProperty('maptiler-layer', 'visibility', layer === 'maptiler' ? 'visible' : 'none')
    map.setLayoutProperty('satellite-layer', 'visibility', layer === 'satellite' ? 'visible' : 'none')
    map.setLayoutProperty('outdoor-layer', 'visibility', layer === 'outdoor' ? 'visible' : 'none')
    map.setLayoutProperty('osm-layer', 'visibility', layer === 'osm' ? 'visible' : 'none')
  }

  // Fit bounds to entire route
  function handleFitRoute() {
    const map = mapInstance.current
    if (!map) return

    const bounds = new LngLatBounds()
    CORRIDOR_POINTS.forEach((pt) => bounds.extend(pt))
    map.fitBounds(bounds, { padding: 60, duration: 1200 })
  }

  // Fly to live truck location
  function handleTrackTruck() {
    const map = mapInstance.current
    if (!map) return

    map.flyTo({
      center: truckPos,
      zoom: 11.5,
      pitch: 0,
      bearing: 0,
      duration: 1500,
    })
  }

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner select-none`}>
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading placeholder */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 z-10 pointer-events-none">
          <span className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span>Loading high-resolution MapTiler & satellite tiles…</span>
        </div>
      )}

      {/* Top Map Controls Overlay Bar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md text-xs">
        {/* Layer Switcher */}
        <button
          type="button"
          onClick={() => handleLayerChange('maptiler')}
          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
            activeLayer === 'maptiler'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="MapTiler Streets - Crystal Clear Roads, Cities & Highway Corridors"
        >
          🗺️ MapTiler Streets
        </button>

        <button
          type="button"
          onClick={() => handleLayerChange('satellite')}
          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
            activeLayer === 'satellite'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="MapTiler Photorealistic Satellite Imagery"
        >
          🛰️ Satellite
        </button>

        <button
          type="button"
          onClick={() => handleLayerChange('outdoor')}
          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
            activeLayer === 'outdoor'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="MapTiler Outdoor / Topography Map"
        >
          🏞️ Outdoor
        </button>

        <button
          type="button"
          onClick={() => handleLayerChange('osm')}
          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
            activeLayer === 'osm'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="OpenStreetMap Standard (Fallback)"
        >
          🌍 OSM
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Fit Route */}
        <button
          type="button"
          onClick={handleFitRoute}
          className="px-2 py-1 rounded-lg font-semibold text-[11px] text-slate-700 hover:bg-slate-100 flex items-center gap-1"
          title="Fit view to entire corridor"
        >
          <span>🎯</span> Fit Route
        </button>

        {/* Fly to Truck */}
        <button
          type="button"
          onClick={handleTrackTruck}
          className="px-2 py-1 rounded-lg font-semibold text-[11px] text-blue-600 hover:bg-blue-50 flex items-center gap-1"
          title="Follow active truck"
        >
          <span>🚚</span> Follow Truck
        </button>

        {/* Zoom level indicator */}
        <span className="text-[10px] font-mono text-slate-400 pl-1">
          z{zoomLevel}
        </span>
      </div>

      {/* Prominent On-Map Zoom In / Zoom Out Widget (Right Top) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-center bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-lg overflow-hidden select-none">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 font-bold text-xl active:bg-slate-100 transition-colors"
          title="Zoom In (+)"
        >
          +
        </button>
        <div className="w-6 h-px bg-slate-200" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 font-bold text-xl active:bg-slate-100 transition-colors"
          title="Zoom Out (−)"
        >
          −
        </button>
        <div className="w-6 h-px bg-slate-200" />
        <button
          type="button"
          onClick={handleFitRoute}
          className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-xs active:bg-slate-100 transition-colors"
          title="Reset to Corridor View"
        >
          🎯
        </button>
      </div>

      {/* Floating Highway Corridor Badge (Top Center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-semibold border border-slate-700/60 shadow-lg pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{activeHighway}</span>
      </div>

      {/* Overlays (Bottom Telemetry Bar, Left Cards, etc.) */}
      {children}
    </div>
  )
}
