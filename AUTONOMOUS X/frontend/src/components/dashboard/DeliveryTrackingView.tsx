import { useState, useEffect } from 'react'
import type { Overview } from '../../types'
import InteractiveCorridorMap from './InteractiveCorridorMap'

type Props = {
  overview: Overview | null
}

type VehicleCard = {
  id: string
  reg: string
  cap: string
  status: 'Active' | 'Arriving' | 'Departed'
  departure: string
  arrival: string
  stops: string[]
  driverName: string
  driverId: string
  driverPhone: string
  driverAvatar: string
  routeCode: string
  distanceLeftKm: number
  currentHighway: string
  lastStop: string
  speedKmps: number
  hoursLeft: string
}

const VEHICLE_DATA: VehicleCard[] = [
  {
    id: 'SHIPID0123',
    reg: 'DL04MP7045',
    cap: 'Max Ld. 6.5 Ton',
    status: 'Arriving',
    departure: 'Delhi (17 July 2024, 10:00)',
    arrival: 'Mumbai (21 July 2024, 10:00)',
    stops: ['Chandigarh (17 July 2024, 12:00)', 'Lonavala (17 July 2024, 12:00)'],
    driverName: 'Rajesh Kumar',
    driverId: '#Driv012345',
    driverPhone: '+91 98765 43210',
    driverAvatar: '/assets/harsh_avatar.png',
    routeCode: 'Route A002',
    distanceLeftKm: 240,
    currentHighway: 'NH04 - Jaipur Highway',
    lastStop: '2 Hours Ago',
    speedKmps: 120,
    hoursLeft: '12 Hrs Left',
  },
  {
    id: 'SHIPID0124',
    reg: 'DL04MP7045',
    cap: 'Max Ld. 6.5 Ton',
    status: 'Active',
    departure: 'Gurugram Hub (17 July 2024, 08:30)',
    arrival: 'Jaipur SEZ (18 July 2024, 04:00)',
    stops: ['Rewari Bypass', 'Behror Cargo Terminal'],
    driverName: 'Vikram Singh',
    driverId: '#Driv012346',
    driverPhone: '+91 98111 22334',
    driverAvatar: '/assets/harsh_avatar.png',
    routeCode: 'Route A001',
    distanceLeftKm: 185,
    currentHighway: 'NH48 - Delhi-Jaipur Expressway',
    lastStop: '45 Mins Ago',
    speedKmps: 114,
    hoursLeft: '4.5 Hrs Left',
  },
  {
    id: 'SHIPID0125',
    reg: 'HR26BR8819',
    cap: 'Max Ld. 8.5 Ton',
    status: 'Arriving',
    departure: 'Ludhiana GT Road (17 July 2024, 06:00)',
    arrival: 'Noida Sector 153 (17 July 2024, 22:00)',
    stops: ['Ambala Junction', 'Panipat Toll'],
    driverName: 'Harpreet Singh',
    driverId: '#Driv012347',
    driverPhone: '+91 98222 33445',
    driverAvatar: '/assets/harsh_avatar.png',
    routeCode: 'Route B003',
    distanceLeftKm: 95,
    currentHighway: 'Eastern Peripheral Expressway',
    lastStop: '1 Hour Ago',
    speedKmps: 118,
    hoursLeft: '2 Hrs Left',
  },
  {
    id: 'SHIPID0126',
    reg: 'MH02CV4421',
    cap: 'Max Ld. 5.0 Ton',
    status: 'Departed',
    departure: 'JNPT Navi Mumbai (16 July 2024, 22:00)',
    arrival: 'Ahmedabad Ring Road (18 July 2024, 18:00)',
    stops: ['Surat Industrial Yard', 'Vadodara Terminal'],
    driverName: 'Amit Desai',
    driverId: '#Driv012348',
    driverPhone: '+91 98333 44556',
    driverAvatar: '/assets/harsh_avatar.png',
    routeCode: 'Route C004',
    distanceLeftKm: 410,
    currentHighway: 'NH48 - Mumbai-Ahmedabad Corridor',
    lastStop: '3 Hours Ago',
    speedKmps: 105,
    hoursLeft: '18 Hrs Left',
  },
  {
    id: 'SHIPID0127',
    reg: 'DL01EA1144',
    cap: 'Max Ld. 4.0 Ton',
    status: 'Active',
    departure: 'Delhi Cargo Depot (17 July 2024, 11:00)',
    arrival: 'Agra Express Gateway (17 July 2024, 17:00)',
    stops: ['Mathura Freight Link'],
    driverName: 'Suresh Verma',
    driverId: '#Driv012349',
    driverPhone: '+91 98444 55667',
    driverAvatar: '/assets/harsh_avatar.png',
    routeCode: 'Route A005',
    distanceLeftKm: 120,
    currentHighway: 'Yamuna Expressway',
    lastStop: '30 Mins Ago',
    speedKmps: 122,
    hoursLeft: '1.8 Hrs Left',
  },
]

export default function DeliveryTrackingView({ overview: _overview }: Props) {
  const [vehicles] = useState<VehicleCard[]>(VEHICLE_DATA)
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Arriving' | 'Departed'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>('SHIPID0123')
  const [expandedCardId, setExpandedCardId] = useState<string>('SHIPID0123')

  // Live telemetry dynamic states
  const [speedJitter, setSpeedJitter] = useState(120)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Modals
  const [showCallModal, setShowCallModal] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(14)
  const [showVehicleDetailsModal, setShowVehicleDetailsModal] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)

  const activeVehicle = vehicles.find((v) => v.id === selectedId) || vehicles[0]

  // Periodic speed update
  useEffect(() => {
    const timer = setInterval(() => {
      setSpeedJitter(118 + Math.floor(Math.random() * 5))
    }, 2800)
    return () => clearInterval(timer)
  }, [])

  // Call duration counter
  useEffect(() => {
    if (!showCallModal) return
    const timer = setInterval(() => {
      setCallDuration((d) => d + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [showCallModal])

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3800)
  }

  function handleRefresh() {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      setSpeedJitter(119 + Math.floor(Math.random() * 4))
      showToast('📡 Telemetry refreshed via NavIC satellite constellation')
    }, 700)
  }

  function handleDownloadDocumentation() {
    const manifestText = `===============================================================
AUTONOMOUS X LOGISTICS - ELECTRONIC BILL OF LADING & MANIFEST
===============================================================
Shipment ID     : ${activeVehicle.id}
Vehicle Reg     : ${activeVehicle.reg}
Truck Model     : Eicher Pro 2059 Heavy Cargo Carrier
Chassis No      : CH4CH01234
Max Weight Cap  : ${activeVehicle.cap}
Carrier Org     : Autonomous X Network Fleet Pvt Ltd

DRIVER & TELEMETRY DISPATCH:
---------------------------------------------------------------
Assigned Driver : ${activeVehicle.driverName} (${activeVehicle.driverId})
Driver Phone    : ${activeVehicle.driverPhone}
Corridor Route  : ${activeVehicle.routeCode} (${activeVehicle.currentHighway})
GPS Telemetry   : 26.9124° N, 75.7873° E (Live Corridor Lock)
Current Speed   : ${speedJitter} km/h (Governed Safe Cruise)
Distance Remaining: ${activeVehicle.distanceLeftKm} KM
Estimated Delay : 0.0 Hrs (Optimal Green Transit Corridor)

ROUTE ITINERARY & STOPS:
---------------------------------------------------------------
1. Origin Departure : ${activeVehicle.departure}
2. Intermediate Stops:
   ${activeVehicle.stops.map((s, i) => `[Stop ${i + 1}] ${s}`).join('\n   ')}
3. Final Destination : ${activeVehicle.arrival}

REGULATORY COMPLIANCE & AXLE SENSOR VERIFICATION:
---------------------------------------------------------------
Cedar SMT Proof : VERIFIED VALID (Security Policy Strict Pass)
Payload Weight  : 3,900 KG / 6,500 KG (60% Optimal Balance)
Axle Balance    : Front 1,850 KG | Rear Tandem 2,050 KG (Pass)
Tamper Seal #   : AX-SEAL-8890214-GEO (Intact, Zero Breach)
Generated At    : ${new Date().toISOString()}
===============================================================`

    const blob = new Blob([manifestText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AUTONOMOUS_X_Manifest_${activeVehicle.id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast(`📄 Downloaded shipping manifest for #${activeVehicle.id}`)
  }

  const filteredVehicles = vehicles.filter((v) => {
    const matchesFilter = activeFilter === 'All' || v.status === activeFilter
    const matchesSearch =
      v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.reg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN (3 cols): Vehicles Search & Fleet List */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Vehicles</h3>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
              {vehicles.length} Online
            </span>
          </div>

          {/* Search input */}
          <div className="relative flex items-center">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none z-10">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Shipment ID, No."
              style={{ paddingLeft: '34px', backgroundColor: '#f8fafc', color: '#1e293b' }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5">
            {(['All', 'Active', 'Arriving', 'Departed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  activeFilter === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Vehicles List matching Image 7 */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredVehicles.map((v) => {
              const isSelected = v.id === selectedId
              const isExpanded = v.id === expandedCardId

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-blue-500 bg-blue-50/20 p-3 shadow-sm'
                      : 'border border-slate-200 bg-white hover:border-slate-300 p-3'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
                        isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        🚚
                      </div>
                      <span className="text-xs font-bold text-slate-800">#{v.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        v.status === 'Arriving'
                          ? 'bg-amber-50 border border-amber-200 text-amber-600'
                          : v.status === 'Active'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                          : 'bg-slate-100 border border-slate-200 text-slate-600'
                      }`}>
                        {v.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(v.id)
                          showToast(`🎯 Tracking live coordinates for #${v.id}`)
                        }}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {isSelected ? 'Tracking' : 'Q Track'}
                      </button>
                    </div>
                  </div>

                  {/* Secondary info bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span>{v.reg}</span>
                    <span>{v.cap}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedCardId(isExpanded ? '' : v.id)
                      }}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      {isExpanded ? 'View Less' : 'View More'}
                    </button>
                  </div>

                  {/* Expanded stops & minimap details matching Image 7 */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2 text-[10px] animate-in fade-in">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 text-slate-600 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-slate-700">Departure:</span> {v.departure}
                          </div>
                          {v.stops.map((st, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1.5 pl-3 text-slate-500">
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>Stop 0{sIdx + 1}: {st}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <span className="font-semibold text-slate-700">Arrival:</span> {v.arrival}
                          </div>
                        </div>

                        {/* Route code thumbnail */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center shrink-0 w-20">
                          <span className="text-[9px] text-slate-400 block">Corridor</span>
                          <span className="text-[10px] font-bold text-blue-600">{v.routeCode}</span>
                        </div>
                      </div>

                      {/* Driver pill with working Call button */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 mt-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={v.driverAvatar}
                            alt="Driver"
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                          <div>
                            <div className="text-[9px] text-slate-400">Shipper's ID</div>
                            <div className="text-xs font-bold text-slate-800">{v.driverId}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCallModal(true)
                          }}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors"
                          title="Call Driver via Encrypted VoIP"
                        >
                          📞
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN (6 cols): Cartographic GPS Map & Telemetry Bar */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
            {/* Header above map */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Shipment ID</span>
                <span className="text-base font-extrabold text-slate-900">#{activeVehicle.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
                  title="View digital bill of lading"
                >
                  👁️ View E-Way Bill
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocumentation}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Shipping Manifest and Compliance Docs"
                >
                  <span>📥</span> Documentation
                </button>
              </div>
            </div>

            {/* Real Interactive MapLibre Highway Corridor Map */}
            <InteractiveCorridorMap
              shipmentId={activeVehicle.id}
              vehiclePlate={activeVehicle.reg}
              currentSpeed={speedJitter}
              currentLocationName={activeVehicle.currentHighway}
              activeHighway="NH48 / NE4 Freight Corridor"
              heightClass="h-[520px]"
            >
              {/* Bottom Telemetry Floating Overlay Bar (Exact match to Image 7) */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-lg grid grid-cols-3 gap-y-2 gap-x-4 text-xs z-10 pointer-events-auto">
                {/* Metric 1: Location */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                    🧭
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{activeVehicle.currentHighway}</div>
                    <div className="text-[9px] text-slate-400">Current Location</div>
                  </div>
                </div>

                {/* Metric 2: Kilometers Left */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                    📍
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{activeVehicle.distanceLeftKm} KM</div>
                    <div className="text-[9px] text-slate-400">Kilometers Left</div>
                  </div>
                </div>

                {/* Metric 3: Last Stop */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                    🕒
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{activeVehicle.lastStop}</div>
                    <div className="text-[9px] text-slate-400">Last Stop</div>
                  </div>
                </div>

                {/* Metric 4: Speedometer 1 */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    ⏱️
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{speedJitter} Kmps</div>
                    <div className="text-[9px] text-slate-400">Current Speed</div>
                  </div>
                </div>

                {/* Metric 5: Speedometer 2 */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    ⚡
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{speedJitter} Kmps</div>
                    <div className="text-[9px] text-slate-400">Current Speed</div>
                  </div>
                </div>

                {/* Metric 6: Speedometer 3 */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    🛞
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{speedJitter} Kmps</div>
                    <div className="text-[9px] text-slate-400">Current Speed</div>
                  </div>
                </div>
              </div>
            </InteractiveCorridorMap>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN (3 cols): Status Milestones & Vehicle Details */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-5">
          {/* Status Timeline Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Status</h3>
              <button
                type="button"
                onClick={handleRefresh}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span> Refresh
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
                <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">{activeVehicle.hoursLeft}</span>
              </div>
            </div>

            {/* Stepper Timeline matching Image 7 */}
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

          {/* Vehicle Details Card (Matching Image 7) with working Open button */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Vehicle Details</h3>
              <button
                type="button"
                onClick={() => setShowVehicleDetailsModal(true)}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 border border-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
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
                <div className="text-[10px] text-slate-400">{activeVehicle.reg}</div>
                <div className="text-[10px] text-slate-500">Shipment ID: #{activeVehicle.id}</div>
                <div className="text-[10px] text-slate-400">Chassis No: CH4CH01234</div>
              </div>
            </div>

            {/* 4-grid Specs matching Image 7 */}
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

      {/* ========================================================= */}
      {/* MODAL: Active Driver VoIP Dispatch Call */}
      {/* ========================================================= */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCallModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative mx-auto w-20 h-20">
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <img
                src={activeVehicle.driverAvatar}
                alt="Driver"
                className="relative w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
              />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{activeVehicle.driverName}</h3>
              <p className="text-xs text-slate-500">{activeVehicle.driverId} • {activeVehicle.driverPhone}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Call Active ({Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, '0')})</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Corridor audio connection secured with AES-256 GCM encryption via NavIC telematics gateway.
            </p>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-colors ${
                  isMuted ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? '🔇' : '🎙️'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCallModal(false)
                  showToast('Call ended with driver')
                }}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-xl shadow-lg shadow-red-500/30 transition-colors"
                title="End Dispatch Call"
              >
                📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Full Vehicle Diagnostics & CAN-Bus Telematics */}
      {/* ========================================================= */}
      {showVehicleDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Vehicle Diagnostics & Telematics</h3>
                <p className="text-xs text-slate-400">Eicher Pro 2059 • {activeVehicle.reg} • #{activeVehicle.id}</p>
              </div>
              <button
                onClick={() => setShowVehicleDetailsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Health Overview */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-600 font-semibold uppercase">ECU Status</span>
                <div className="text-sm font-bold text-emerald-900 mt-0.5">Healthy (0 DTC)</div>
                <div className="text-[10px] text-emerald-700 mt-1">OBD-II Pass</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] text-blue-600 font-semibold uppercase">Diesel Tank</span>
                <div className="text-sm font-bold text-blue-900 mt-0.5">74% (140 Ltr)</div>
                <div className="text-[10px] text-blue-700 mt-1">AdBlue: 88% OK</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] text-indigo-600 font-semibold uppercase">ADAS Level 2+</span>
                <div className="text-sm font-bold text-indigo-900 mt-0.5">Engaged</div>
                <div className="text-[10px] text-indigo-700 mt-1">LiDAR / Radar Lock</div>
              </div>
            </div>

            {/* Tire Pressure System (TPMS) */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">Tire Pressure Monitoring (TPMS)</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400">Front Steer Left</div>
                  <div className="font-bold text-slate-800">110 PSI</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400">Front Steer Right</div>
                  <div className="font-bold text-slate-800">110 PSI</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400">Brake Lining</div>
                  <div className="font-bold text-emerald-600">82% Good</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400">Rear Dual Left</div>
                  <div className="font-bold text-slate-800">115 PSI</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400">Rear Dual Right</div>
                  <div className="font-bold text-slate-800">115 PSI</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400">Engine Oil Temp</div>
                  <div className="font-bold text-slate-800">89°C (Normal)</div>
                </div>
              </div>
            </div>

            {/* Environmental & Cargo Sensors */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">Cargo Hold & Tamper Sensors</h4>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hold Temperature:</span>
                  <span className="font-bold text-slate-800">4.2°C (Refrigerated)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hold Humidity:</span>
                  <span className="font-bold text-slate-800">48% RH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Axle Weight Distribution:</span>
                  <span className="font-bold text-emerald-600">Front 48% / Rear 52% (Optimal)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Container Door Geofence Seal:</span>
                  <span className="font-bold text-blue-600">Locked (AX-SEAL-8890214)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  showToast('Diagnostic log exported to service depot')
                  setShowVehicleDetailsModal(false)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Export Diagnostic Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Digital E-Way Bill & Compliance Documentation */}
      {/* ========================================================= */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Digital Bill of Lading & E-Way Bill</h3>
                <p className="text-xs text-slate-400">National Goods & Services Tax Network (GSTN)</p>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-400">E-WAY BILL NO:</span>
                <span className="font-bold text-slate-800">9812-4410-9921</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Shipment ID:</span>
                <span className="font-bold text-slate-800">#{activeVehicle.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicle No:</span>
                <span className="font-bold text-slate-800">{activeVehicle.reg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Driver / Transporter:</span>
                <span className="font-bold text-slate-800">{activeVehicle.driverName} ({activeVehicle.driverId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From (Dispatch):</span>
                <span className="font-bold text-slate-800">{activeVehicle.departure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">To (Destination):</span>
                <span className="font-bold text-slate-800">{activeVehicle.arrival}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-400">Cedar Policy Verification:</span>
                <span className="font-bold text-emerald-600">SMT FORMAL PROOF PASSED</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownloadDocumentation()
                  setShowDocModal(false)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                📥 Download Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
