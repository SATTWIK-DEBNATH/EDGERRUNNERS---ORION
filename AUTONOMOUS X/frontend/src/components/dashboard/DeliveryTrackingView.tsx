import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import type { Overview } from '../../types'
import 'maplibre-gl/dist/maplibre-gl.css'

type Props = {
  overview: Overview | null
}

export default function DeliveryTrackingView({ overview }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<InstanceType<typeof MapLibreMap> | null>(null)

  const [activeFilter, setActiveFilter] = useState<'Active' | 'Arriving' | 'Departed'>('Active')
  const [selectedShipment, setSelectedShipment] = useState('SHIPID0123')
  const [showTooltip, setShowTooltip] = useState(true)
  const [currentSpeed, setCurrentSpeed] = useState(120)

  // Real-time speed variance simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSpeed(118 + Math.floor(Math.random() * 6))
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  // Initialize Delhi-Jaipur Route Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return

    const map = new MapLibreMap({
      container: mapContainer.current,
      center: [76.5, 27.6], // Centered between Delhi and Jaipur
      zoom: 7.2,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
      },
      attributionControl: { compact: true },
    })

    mapInstance.current = map
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      // Highway corridor route polyline from Delhi to Gurugram to Jaipur
      const routeGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [77.209, 28.6139], // Delhi
                [77.0266, 28.4595], // Gurugram
                [76.8122, 28.2163], // Rewari
                [76.6214, 27.9734], // Behror
                [76.3533, 27.5621], // Kotputli
                [75.9814, 27.1856], // Shahpura
                [75.7873, 26.9124], // Jaipur
              ],
            },
          },
        ],
      }

      // Add Route Line
      map.addSource('highway-route', {
        type: 'geojson',
        data: routeGeoJson,
      })

      map.addLayer({
        id: 'route-line-bg',
        type: 'line',
        source: 'highway-route',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 6,
          'line-opacity': 0.85,
        },
      })

      map.addLayer({
        id: 'route-line-core',
        type: 'line',
        source: 'highway-route',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
        },
      })

      // Add Waypoint Pins
      const pinsGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { label: 'Delhi', kind: 'start' },
            geometry: { type: 'Point', coordinates: [77.209, 28.6139] },
          },
          {
            type: 'Feature',
            properties: { label: 'Gurugram', kind: 'current' },
            geometry: { type: 'Point', coordinates: [77.0266, 28.4595] },
          },
          {
            type: 'Feature',
            properties: { label: 'Jaipur', kind: 'end' },
            geometry: { type: 'Point', coordinates: [75.7873, 26.9124] },
          },
        ],
      }

      map.addSource('route-pins', {
        type: 'geojson',
        data: pinsGeoJson,
      })

      map.addLayer({
        id: 'pin-circles',
        type: 'circle',
        source: 'route-pins',
        paint: {
          'circle-radius': 9,
          'circle-color': ['match', ['get', 'kind'], 'current', '#2563eb', 'start', '#10b981', '#ef4444'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] text-slate-800">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (3 cols): Vehicles Search & Fleet List */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Vehicles</h3>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
              {overview?.vehicles.length ?? 10} Online
            </span>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Shipment ID, No."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['Active', 'Arriving', 'Departed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeFilter === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Vehicles List */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {/* Active Card with Tooltip Popover */}
            <div className="relative border-2 border-blue-500 rounded-xl p-3 bg-blue-50/20 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                    🚚
                  </div>
                  <span className="text-xs font-bold text-slate-800">#ShipID0123</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                    Arriving
                  </span>
                  <button
                    type="button"
                    className="bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-sm"
                  >
                    Tracking
                  </button>
                </div>
              </div>

              {/* Driver pill */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 mt-2 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/harsh_avatar.png"
                    alt="Driver"
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <div>
                    <div className="text-[9px] text-slate-400">Shipper's ID</div>
                    <div className="text-xs font-bold text-slate-800">#Driv012345</div>
                  </div>
                </div>
                <button type="button" className="text-slate-400 hover:text-blue-600" title="Call Driver">
                  📞
                </button>
              </div>

              {/* Delivery Tracking Tooltip (from Screenshot) */}
              {showTooltip && (
                <div className="absolute left-full ml-3 top-2 w-64 bg-blue-600 text-white p-3.5 rounded-2xl shadow-xl z-30 animate-fadeIn">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold">Delivery Tracking</h4>
                    <button
                      type="button"
                      onClick={() => setShowTooltip(false)}
                      className="text-white/80 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-100 leading-snug mb-3">
                    Allow users to track the status of each truck and its orders in real-time.
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-500/60">
                    <span className="text-blue-200">1 / 5</span>
                    <div className="flex gap-2">
                      <button type="button" className="text-blue-200 hover:text-white">Previous</button>
                      <button
                        type="button"
                        onClick={() => setShowTooltip(false)}
                        className="bg-white text-blue-600 px-2 py-0.5 rounded font-semibold shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Other Vehicle Cards */}
            {[
              { id: '#ShipID00123', reg: 'DL04MP7045', cap: 'Max Ld. 6.5 Ton', status: 'Arriving' },
              { id: '#ShipID00123', reg: 'DL04MP7045', cap: 'Max Ld. 6.5 Ton', status: 'Arriving' },
              { id: '#ShipID00123', reg: 'DL04MP7045', cap: 'Max Ld. 6.5 Ton', status: 'Arriving' },
              { id: '#ShipID00123', reg: 'DL04MP7045', cap: 'Max Ld. 6.5 Ton', status: 'Arriving' },
              { id: '#ShipID00123', reg: 'DL04MP7045', cap: 'Max Ld. 6.5 Ton', status: 'Arriving' },
            ].map((v, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedShipment(v.id)}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🚚</span>
                    <span className="text-xs font-bold text-slate-800">{v.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                      {v.status}
                    </span>
                    <button
                      type="button"
                      className="border border-blue-600 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded hover:bg-blue-50"
                    >
                      Track
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{v.reg}</span>
                  <span>{v.cap}</span>
                  <span className="text-blue-600 font-medium">View More</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN (6 cols): Live Road Map & Telemetry Bar */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
            {/* Header above map */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Shipment ID</span>
                <span className="text-base font-extrabold text-slate-900">#{selectedShipment}</span>
              </div>
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <span>📥</span> Documentation
              </button>
            </div>

            {/* Interactive MapLibre Canvas */}
            <div className="h-[520px] rounded-xl overflow-hidden relative border border-slate-200">
              <div ref={mapContainer} className="w-full h-full" />

              {/* Bottom Telemetry Floating Overlay Bar (Matching Image 3) */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-lg grid grid-cols-3 gap-y-2 gap-x-4 text-xs">
                {/* Metric 1: Location */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                    🧭
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">NH04 - Jaipur Highway</div>
                    <div className="text-[9px] text-slate-400">Current Location</div>
                  </div>
                </div>

                {/* Metric 2: Kilometers Left */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                    📍
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">240 KM</div>
                    <div className="text-[9px] text-slate-400">Kilometers Left</div>
                  </div>
                </div>

                {/* Metric 3: Last Stop */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                    🕒
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">2 Hours Ago</div>
                    <div className="text-[9px] text-slate-400">Last Stop</div>
                  </div>
                </div>

                {/* Metric 4: Speedometer 1 */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    ⏱️
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{currentSpeed} Kmps</div>
                    <div className="text-[9px] text-slate-400">Current Speed</div>
                  </div>
                </div>

                {/* Metric 5: Speedometer 2 */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    ⚡
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{currentSpeed} Kmps</div>
                    <div className="text-[9px] text-slate-400">Current Speed</div>
                  </div>
                </div>

                {/* Metric 6: Speedometer 3 */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    🛞
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{currentSpeed} Kmps</div>
                    <div className="text-[9px] text-slate-400">Current Speed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (3 cols): Status Milestones & Vehicle Details */}
        <div className="lg:col-span-3 space-y-5">
          {/* Status Timeline Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Status</h3>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 border border-slate-200 px-2 py-0.5 rounded-md"
              >
                Refresh
              </button>
            </div>

            {/* Milestones Route Bar */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                <span>New Delhi</span>
                <span>Chandigarh</span>
                <span>Jaipur</span>
                <span>Mumbai</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full w-[65%]" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">12 Hrs Left</span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="space-y-3 pt-2 text-xs">
              {/* Step 1: Departure */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-[11px]">Departure</span>
                    <span className="text-[9px] text-slate-400 font-mono">17 July 2024, 10:00</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">41 Sector 15, Scf, Delhi</p>
                </div>
              </div>

              {/* Step 2: Stop */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-[11px]">Stop</span>
                    <span className="text-[9px] text-slate-400 font-mono">17 July 2024, 12:00</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">41 Sector 15, Scf, Delhi</p>
                </div>
              </div>

              {/* Step 3: Stop */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-[11px]">Stop</span>
                    <span className="text-[9px] text-slate-400 font-mono">17 July 2024, 12:00</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">41 Sector 15, Scf, Delhi</p>
                </div>
              </div>

              {/* Step 4: Arrival */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-600 text-[11px]">Arrival</span>
                    <span className="text-[9px] text-slate-400 font-mono">21 July 2024, 10:00</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">41 Sector 15, Scf, Mumbai</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Details Card (Matching Image 3) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Vehicle Details</h3>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 border border-slate-200 px-2 py-0.5 rounded-md"
              >
                Open
              </button>
            </div>

            {/* Truck photo and model */}
            <div className="flex items-center gap-3">
              <img
                src="/assets/eicher_truck.png"
                alt="Eicher Pro 2059"
                className="w-24 h-20 object-contain rounded-lg border border-slate-100 p-1 flex-shrink-0 bg-slate-50"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">Eicher Pro 2059</div>
                <div className="text-[10px] text-slate-400">DL04MP7045</div>
                <div className="text-[10px] text-slate-500">Shipment ID: SHIPID01234</div>
                <div className="text-[10px] text-slate-400">Chassis No: CH4CH01234</div>
              </div>
            </div>

            {/* 4-grid Specs */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-[9px] text-slate-400">Payload</div>
                <div className="font-bold text-slate-800">6.5 Ton</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-[9px] text-slate-400">Load Width</div>
                <div className="font-bold text-slate-800">4.8 Mtr</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-[9px] text-slate-400">Payload Vol</div>
                <div className="font-bold text-slate-800">35,393 Ltr</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-[9px] text-slate-400">Load Length</div>
                <div className="font-bold text-slate-800">11.7 Mtr</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

