import { useState } from 'react'
import InteractiveCorridorMap from './InteractiveCorridorMap'

type VehicleRouteItem = {
  id: string
  plate: string
  routeText: string
  maxLoadTon: number
}

type RouteRecord = {
  routeId: string
  corridor: string
  vehiclesCount: number
  estimateTime: string
  vehicles: {
    shipmentId: string
    plate: string
    estimateTime: string
  }[]
  description: string
  startingPoint: string
  stops: string[]
  destination: string
  durationAvg: string
  distanceCoveredKm: number
}

const INITIAL_ROUTES: RouteRecord[] = [
  {
    routeId: 'ROUTEAA001',
    corridor: 'Mumbai ─── Delhi',
    vehiclesCount: 22,
    estimateTime: '6 Hrs',
    vehicles: [
      { shipmentId: 'ID: SHIPID01234', plate: 'DL04MP0123', estimateTime: 'Estimate Time: 6 Hrs' },
      { shipmentId: 'ID: SHIPID01234', plate: 'DL04MP0123', estimateTime: 'Estimate Time: 6 Hrs' },
      { shipmentId: 'ID: SHIPID01234', plate: 'DL04MP0123', estimateTime: 'Estimate Time: 6 Hrs' },
    ],
    description:
      "Raj Industries is one of the leading FMCG companies in northern India dealing in Personal and Home Care products. The company's leading product 'Raj Super White Laundry Bar' commands a high market share and is trusted by around 1,50,000 retail stores all over the country.",
    startingPoint: 'Village Pawa, GT Road, Near Civil Airport, Raj Industries, Ludhiana, Punjab 141120, IN',
    stops: [
      'Village Pawa, GT Road, Near Civil Airport, Raj Industries, Ludhiana, Punjab 141120, IN',
      'Village Pawa, GT Road, Near Civil Airport, Raj Industries, Ludhiana, Punjab 141120, IN',
      'Village Pawa, GT Road, Near Civil Airport, Raj Industries, Ludhiana, Punjab 141120, IN',
    ],
    destination: 'Village Pawa, GT Road, Near Civil Airport, Raj Industries, Ludhiana, Punjab 141120, IN',
    durationAvg: '6 Hrs and 42 Mins Avg',
    distanceCoveredKm: 380,
  },
  {
    routeId: 'ROUTEAA002',
    corridor: 'Mumbai ─── Delhi',
    vehiclesCount: 18,
    estimateTime: '6 Hrs 42 Mins',
    vehicles: [
      { shipmentId: 'ID: SHIPID01234', plate: 'DL04MP0123', estimateTime: 'Estimate Time: 6 Hrs' },
      { shipmentId: 'ID: SHIPID01234', plate: 'DL04MP0123', estimateTime: 'Estimate Time: 6 Hrs' },
      { shipmentId: 'ID: SHIPID01234', plate: 'DL04MP0123', estimateTime: 'Estimate Time: 6 Hrs' },
    ],
    description:
      'Autonomous National Freight Corridor segment bypassing high-density urban bottlenecks. Integrated with Western Dedicated Freight Corridor automated transshipment hubs.',
    startingPoint: 'JNPT Maritime Port Terminal, Navi Mumbai, Maharashtra 400707, IN',
    stops: [
      'Jaipur Logistics Terminal, Sitapura SEZ, Rajasthan 302022, IN',
      'Rewari Intermodal Freight Rail Interchange, Haryana 123401, IN',
      'Bhiwadi Express Highway Freight Hub, Rajasthan 301019, IN',
    ],
    destination: 'Noida Logistics Gateway Hub, Sector 153, Uttar Pradesh 201310, IN',
    durationAvg: '6 Hrs and 42 Mins Avg',
    distanceCoveredKm: 380,
  },
]

const INITIAL_VEHICLES: VehicleRouteItem[] = [
  { id: '#ShipID0123', plate: 'DL04MP7045', routeText: 'Mumbai ─── Delhi', maxLoadTon: 6.5 },
  { id: '#ShipID0124', plate: 'DL04MP7045', routeText: 'Mumbai ─── Delhi', maxLoadTon: 6.5 },
  { id: '#ShipID0125', plate: 'DL04MP7045', routeText: 'Mumbai ─── Delhi', maxLoadTon: 6.5 },
  { id: '#ShipID0126', plate: 'DL04MP7045', routeText: 'Mumbai ─── Delhi', maxLoadTon: 6.5 },
  { id: '#ShipID0127', plate: 'DL04MP7045', routeText: 'Mumbai ─── Delhi', maxLoadTon: 6.5 },
  { id: '#ShipID0128', plate: 'DL04MP7045', routeText: 'Mumbai ─── Delhi', maxLoadTon: 6.5 },
]

export default function RoutePlanningView() {
  const [routes, setRoutes] = useState<RouteRecord[]>(INITIAL_ROUTES)
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null)
  const [routeSearch, setRouteSearch] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicles] = useState<VehicleRouteItem[]>(INITIAL_VEHICLES)

  // Modal for + New Route
  const [showNewRouteModal, setShowNewRouteModal] = useState(false)
  const [newRouteId, setNewRouteId] = useState('')
  const [newOrigin, setNewOrigin] = useState('')
  const [newDestination, setNewDestination] = useState('')
  const [newDuration, setNewDuration] = useState('')

  const [notification, setNotification] = useState('')
  const [showTourBubble, setShowTourBubble] = useState(true)

  const filteredRoutes = routes.filter((r) =>
    r.routeId.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.corridor.toLowerCase().includes(routeSearch.toLowerCase())
  )

  const filteredVehicles = vehicles.filter((v) =>
    v.id.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.plate.toLowerCase().includes(vehicleSearch.toLowerCase())
  )

  function handleCreateRoute(e: React.FormEvent) {
    e.preventDefault()
    if (!newRouteId || !newOrigin || !newDestination) return

    const newRecord: RouteRecord = {
      routeId: newRouteId.toUpperCase(),
      corridor: `${newOrigin} ─── ${newDestination}`,
      vehiclesCount: 1,
      estimateTime: newDuration || '5 Hrs',
      vehicles: [
        { shipmentId: 'ID: SHIPID09999', plate: 'DL04MP9999', estimateTime: newDuration || '5 Hrs' },
      ],
      description: `Newly planned autonomous routing corridor connecting ${newOrigin} directly to ${newDestination}.`,
      startingPoint: `${newOrigin} Express Gateway`,
      stops: [`${newOrigin} Sub-Station 01`, `${newDestination} Sub-Station 02`],
      destination: `${newDestination} Freight Terminal`,
      durationAvg: newDuration || '5 Hrs Avg',
      distanceCoveredKm: 340,
    }

    setRoutes([newRecord, ...routes])
    setShowNewRouteModal(false)
    setNewRouteId('')
    setNewOrigin('')
    setNewDestination('')
    setNewDuration('')
    setNotification(`Successfully added ${newRecord.routeId} to route management.`)
    setTimeout(() => setNotification(''), 4000)
  }

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] text-slate-800 space-y-4">
      {notification && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center justify-between">
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification('')} className="font-bold">✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-900 tracking-tight">Route Planning</h1>
        <button
          type="button"
          onClick={() => setShowNewRouteModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
        >
          <span>+</span> New Route
        </button>
      </div>

      {/* Main Grid: Left 8 Cols (Map + Overlays) & Right 4 Cols (Routes list or Route Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ============================================================== */}
        {/* LEFT MAP CONTAINER (8 Cols)                                    */}
        {/* ============================================================== */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[720px]">
          <InteractiveCorridorMap
            shipmentId="SHIPID0123"
            vehiclePlate="DL04MP7045"
            currentSpeed={120}
            currentLocationName="Kotputli Freight Interchange"
            activeHighway="Jaipur ── Alwar ── Gurugram ── Noida Freight Corridor"
            heightClass="h-[720px]"
          >
            {/* Overlaid Vehicles Card List (Left Side of Map) */}
            <div className="absolute top-14 left-4 z-10 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3.5 shadow-md space-y-2.5 pointer-events-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Vehicles</span>
                <span className="text-[10px] text-slate-400 font-medium">{filteredVehicles.length} available</span>
              </div>

              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Shipment ID, No."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Vehicle Card list */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredVehicles.map((vh, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 transition-all text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                        <span className="text-blue-600">🚛</span>
                        <span>{vh.id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNotification(`Selected route adjustment for vehicle ${vh.id}`)
                          setTimeout(() => setNotification(''), 3000)
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        Change Route
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{vh.plate}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
                      <span>{vh.routeText}</span>
                      <span className="text-slate-400">Max Ld. {vh.maxLoadTon} Ton</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guided Tour Bubble 2/5 (Identical to Design Mockup) */}
            {showTourBubble && (
              <div className="absolute top-16 left-[310px] z-20 w-80 bg-blue-600 text-white rounded-2xl p-4 shadow-2xl border border-blue-400/40 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Speech Bubble Arrow pointing left */}
                <div className="absolute top-6 -left-2 w-4 h-4 bg-blue-600 rotate-45 border-l border-b border-blue-400/40" />

                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-white tracking-wide">Vehicles</h4>
                  <button
                    type="button"
                    onClick={() => setShowTourBubble(false)}
                    className="text-white/70 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10"
                    title="Close Tour"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-blue-50 leading-relaxed mb-3">
                  You can see the list of vehicles that appears here. You can also search for the vehicles and also change the routes by selecting.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[11px]">
                  <span className="text-blue-200 font-semibold font-mono">2 / 5</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTourBubble(false)}
                      className="px-2.5 py-1 rounded-lg bg-blue-700/60 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTourBubble(false)}
                      className="px-3 py-1 rounded-lg bg-white text-blue-700 hover:bg-blue-50 text-[11px] font-bold shadow-xs transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Overlaid Route Timeline Banner (Bottom of Map) */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
              {/* Stepper info */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-slate-400 text-[10px]">Departure</span>
                  <span className="font-bold text-slate-800">Delhi</span>
                </div>
                <span className="text-slate-300">──</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border border-slate-400 bg-white" />
                  <span className="text-slate-400 text-[10px]">Stop 01</span>
                  <span className="font-medium text-slate-700">Chandigarh</span>
                </div>
                <span className="text-slate-300">──</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border border-slate-400 bg-white" />
                  <span className="text-slate-400 text-[10px]">Stop 02</span>
                  <span className="font-medium text-slate-700">Lonavala</span>
                </div>
                <span className="text-slate-300">──</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-400 text-[10px]">Arrival</span>
                  <span className="font-bold text-slate-800">Mumbai</span>
                </div>
              </div>

              {/* Thumbnail */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <img
                    src="/assets/order_minimap.png"
                    alt="Minimap"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Route A002</div>
                  <div className="text-xs font-bold text-slate-800">13 Hrs 42 Mins Avg</div>
                </div>
              </div>

              {/* Stacked Color Bar Chart */}
              <div className="w-full md:w-56 space-y-1">
                <div className="text-[9px] font-semibold text-slate-400 text-right">Average Time Per Day</div>
                <div className="w-full h-4 rounded-md overflow-hidden flex text-[8px] font-bold text-white text-center leading-4">
                  <div className="bg-blue-200 text-blue-900 w-[25%]" title="Delhi: 3 Hrs">3 Hrs</div>
                  <div className="bg-red-500 w-[40%]" title="Chandigarh: 5 Hrs">5 Hrs</div>
                  <div className="bg-blue-600 w-[35%]" title="Lonavala: 4 Hrs">4 Hrs</div>
                </div>
                <div className="flex justify-between text-[8px] text-slate-400">
                  <span>Delhi</span>
                  <span>Chandigarh</span>
                  <span>Lonavala</span>
                  <span>Mumbai</span>
                </div>
              </div>
            </div>
          </InteractiveCorridorMap>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Routes List (Mode A) OR Route Detail (Mode B)     */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          {/* MODE B: Route Information Detail View (Image 5) */}
          {selectedRoute ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Route Information</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRoute(null)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ‹ BACK
                </button>
              </div>

              {/* Route Heading with Direction Icon */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  ↱
                </div>
                <h2 className="text-base font-bold text-slate-900">{selectedRoute.routeId}</h2>
              </div>

              {/* Detail Card Container matching Image 5 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
                {/* Description */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Description</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {selectedRoute.description}
                  </p>
                </div>

                {/* Starting Point */}
                <div>
                  <h4 className="font-bold text-slate-900 text-[11px] mb-0.5">Starting Point</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {selectedRoute.startingPoint}
                  </p>
                </div>

                {/* Stops */}
                {selectedRoute.stops.map((stop, sIdx) => (
                  <div key={sIdx}>
                    <h4 className="font-bold text-slate-900 text-[11px] mb-0.5">Stop {String(sIdx + 1).padStart(2, '0')}</h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{stop}</p>
                  </div>
                ))}

                {/* Destination */}
                <div>
                  <h4 className="font-bold text-slate-900 text-[11px] mb-0.5">Destination</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{selectedRoute.destination}</p>
                </div>

                {/* Duration & Distance */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-[11px] mb-0.5">Duration</h4>
                    <p className="text-slate-700 font-medium text-[11px]">{selectedRoute.durationAvg}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[11px] mb-0.5">Distance Covered</h4>
                    <p className="text-slate-700 font-medium text-[11px]">{selectedRoute.distanceCoveredKm} KMs</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* MODE A: Routes List View (Image 3) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Routes</h3>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <button type="button" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-slate-700 text-xs" title="Refresh">
                    🔄
                  </button>
                  <button type="button" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-slate-700 text-xs" title="History">
                    🕒
                  </button>
                </div>
              </div>

              {/* Search by Route No */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Route No"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Grouped Routes List */}
              <div className="space-y-4 max-h-[660px] overflow-y-auto pr-1">
                {filteredRoutes.map((rt) => (
                  <div key={rt.routeId} className="space-y-2 pb-3 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900">{rt.routeId}</div>
                      <button
                        type="button"
                        onClick={() => setSelectedRoute(rt)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View More
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500">{rt.corridor}</div>

                    {/* Sub vehicle cards */}
                    <div className="space-y-2 mt-2">
                      {rt.vehicles.map((vh, vIdx) => (
                        <div key={vIdx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">📄</span>
                            <div>
                              <div className="font-bold text-slate-800 text-[11px]">{vh.shipmentId}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{vh.plate}</div>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{vh.estimateTime}</div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <span>🚚</span>
                      <span>{rt.vehiclesCount}+ Vehicles</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: + New Route */}
      {showNewRouteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Freight Route</h3>
              <button type="button" onClick={() => setShowNewRouteModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Route ID</label>
                <input
                  type="text"
                  placeholder="e.g. ROUTEAA003"
                  value={newRouteId}
                  onChange={(e) => setNewRouteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Origin City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Destination City</label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estimated Travel Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 7 Hrs 15 Mins"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRouteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

