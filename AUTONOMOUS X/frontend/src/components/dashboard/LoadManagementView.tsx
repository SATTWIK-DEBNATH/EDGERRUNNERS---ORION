import { useState } from 'react'

type Vehicle = {
  id: string
  name: string
  plate: string
  status: 'Loading' | 'Arriving' | 'Available' | 'Unloading' | 'Departed' | 'Active'
  loadVolumeM3: number
  maxWeightTon: number
  currentLoadTon: number
  capacityPct: number
  timeline: {
    arriving: string
    unloading: string
    loading: string
    preparing: string
  }
  routeBadge: string
}

type OrderItem = {
  id: string
  weightKg: number
  route: string
  assignedBlockId?: string
}

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'SHIPID03',
    name: 'Eicher Pro 2059',
    plate: 'DL04MP7045',
    status: 'Loading',
    loadVolumeM3: 372.45,
    maxWeightTon: 6.5,
    currentLoadTon: 4.0,
    capacityPct: 60,
    timeline: {
      arriving: '17 July 2024, 18:00',
      unloading: '17 July 2024, 19:00',
      loading: '19 July 2024, 10:00',
      preparing: '19 July 2024, 01:00',
    },
    routeBadge: 'Route A002',
  },
  {
    id: 'SHIPID01',
    name: 'Tata Ultra T.7',
    plate: 'MH02CV4421',
    status: 'Arriving',
    loadVolumeM3: 310.2,
    maxWeightTon: 5.0,
    currentLoadTon: 4.25,
    capacityPct: 85,
    timeline: {
      arriving: '17 July 2024, 14:00',
      unloading: '17 July 2024, 16:30',
      loading: '18 July 2024, 09:00',
      preparing: '18 July 2024, 02:00',
    },
    routeBadge: 'Route A001',
  },
  {
    id: 'SHIPID02',
    name: 'BharatBenz 1217C',
    plate: 'KA05D9022',
    status: 'Available',
    loadVolumeM3: 420.0,
    maxWeightTon: 7.0,
    currentLoadTon: 1.4,
    capacityPct: 20,
    timeline: {
      arriving: '16 July 2024, 21:00',
      unloading: '17 July 2024, 08:00',
      loading: '17 July 2024, 14:00',
      preparing: '17 July 2024, 06:00',
    },
    routeBadge: 'Route B003',
  },
  {
    id: 'SHIPID04',
    name: 'Mahindra Blazo X',
    plate: 'HR26BR8819',
    status: 'Unloading',
    loadVolumeM3: 480.0,
    maxWeightTon: 8.5,
    currentLoadTon: 7.65,
    capacityPct: 90,
    timeline: {
      arriving: '17 July 2024, 17:30',
      unloading: '17 July 2024, 18:45',
      loading: '19 July 2024, 11:00',
      preparing: '19 July 2024, 03:00',
    },
    routeBadge: 'Route C004',
  },
  {
    id: 'SHIPID05',
    name: 'Ashok Leyland Partner',
    plate: 'DL01EA1144',
    status: 'Departed',
    loadVolumeM3: 260.0,
    maxWeightTon: 4.0,
    currentLoadTon: 3.8,
    capacityPct: 95,
    timeline: {
      arriving: '18 July 2024, 06:00',
      unloading: '18 July 2024, 08:00',
      loading: '18 July 2024, 12:00',
      preparing: '18 July 2024, 04:00',
    },
    routeBadge: 'Route A005',
  },
]

const INITIAL_ORDERS: OrderItem[] = [
  { id: 'ORDERID0123', weightKg: 88.9, route: 'ROUTEAA001' },
  { id: 'ORDERID0124', weightKg: 95.4, route: 'ROUTEAA001' },
  { id: 'ORDERID0125', weightKg: 104.2, route: 'ROUTEAA001' },
  { id: 'ORDERID0126', weightKg: 82.0, route: 'ROUTEAA001' },
  { id: 'ORDERID0127', weightKg: 110.5, route: 'ROUTEAA001' },
  { id: 'ORDERID0128', weightKg: 78.6, route: 'ROUTEAA001' },
  { id: 'ORDERID0129', weightKg: 91.2, route: 'ROUTEAA001' },
  { id: 'ORDERID0130', weightKg: 88.9, route: 'ROUTEAA001' },
  { id: 'ORDERID0131', weightKg: 120.0, route: 'ROUTEAA001' },
  { id: 'ORDERID0132', weightKg: 88.9, route: 'ROUTEAA001' },
  { id: 'ORDERID0133', weightKg: 88.9, route: 'ROUTEAA001' },
  { id: 'ORDERID0134', weightKg: 92.5, route: 'ROUTEAA001' },
  { id: 'ORDERID0135', weightKg: 105.0, route: 'ROUTEAA001' },
  { id: 'ORDERID0136', weightKg: 88.9, route: 'ROUTEAA001' },
]

export default function LoadManagementView() {
  const [vehicles] = useState<Vehicle[]>(INITIAL_VEHICLES)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('SHIPID03')
  const [vehicleFilter, setVehicleFilter] = useState<string>('All')
  const [vehicleSearch, setVehicleSearch] = useState<string>('')
  const [orderSearch, setOrderSearch] = useState<string>('')

  // Active blocks state: 18 slots for 100KG, 18 slots for 200KG
  // Pre-fill some slots to match Image 2 (bottom row filled, middle row partially filled)
  const [slots100, setSlots100] = useState<{ id: string; filled: boolean; orderId?: string }[]>(
    Array.from({ length: 18 }, (_, i) => ({
      id: `100kg-slot-${i}`,
      filled: i >= 6, // Rows 2 and 3 filled
      orderId: i >= 6 ? `ORDERID${100 + i}` : undefined,
    }))
  )

  const [slots200, setSlots200] = useState<{ id: string; filled: boolean; orderId?: string }[]>(
    Array.from({ length: 18 }, (_, i) => ({
      id: `200kg-slot-${i}`,
      filled: i >= 6, // Rows 2 and 3 filled in purple
      orderId: i >= 6 ? `ORDERID${200 + i}` : undefined,
    }))
  )

  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS)
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null)
  const [notification, setNotification] = useState<string>('')

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]

  // Calculate dynamic load metrics based on filled slots
  const filledCount100 = slots100.filter((s) => s.filled).length
  const filledCount200 = slots200.filter((s) => s.filled).length
  const totalWeightKg = filledCount100 * 100 + filledCount200 * 200
  const totalWeightTon = Number((totalWeightKg / 1000).toFixed(2))
  const maxTon = activeVehicle.maxWeightTon
  const capacityPct = Math.min(100, Math.round((totalWeightTon / maxTon) * 100))
  const availableTon = Math.max(0, Number((maxTon - totalWeightTon).toFixed(1)))

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesFilter =
      vehicleFilter === 'All' || v.status.toLowerCase() === vehicleFilter.toLowerCase()
    const matchesSearch =
      v.id.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.name.toLowerCase().includes(vehicleSearch.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Filter orders
  const filteredOrders = orders.filter((o) =>
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.route.toLowerCase().includes(orderSearch.toLowerCase())
  )

  function handleAssignOrderToBlock(type: '100' | '200', index: number) {
    if (type === '100') {
      const current = slots100[index]
      if (current.filled) {
        // Unload block
        const updated = [...slots100]
        updated[index] = { ...current, filled: false, orderId: undefined }
        setSlots100(updated)
        setNotification(`Unloaded 100 KG slot #${index + 1}. Available capacity increased.`)
      } else {
        // Load block with selected order or generic 100kg
        const updated = [...slots100]
        const orderIdToLoad = selectedOrder?.id || `ORDERID0${150 + index}`
        updated[index] = { ...current, filled: true, orderId: orderIdToLoad }
        setSlots100(updated)
        setNotification(`Assigned ${orderIdToLoad} (100 KG) to slot #${index + 1}.`)
        if (selectedOrder) {
          setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id))
          setSelectedOrder(null)
        }
      }
    } else {
      const current = slots200[index]
      if (current.filled) {
        const updated = [...slots200]
        updated[index] = { ...current, filled: false, orderId: undefined }
        setSlots200(updated)
        setNotification(`Unloaded 200 KG slot #${index + 1}. Available capacity increased.`)
      } else {
        const updated = [...slots200]
        const orderIdToLoad = selectedOrder?.id || `ORDERID0${250 + index}`
        updated[index] = { ...current, filled: true, orderId: orderIdToLoad }
        setSlots200(updated)
        setNotification(`Assigned ${orderIdToLoad} (200 KG) to slot #${index + 1}.`)
        if (selectedOrder) {
          setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id))
          setSelectedOrder(null)
        }
      }
    }

    setTimeout(() => setNotification(''), 4000)
  }

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] text-slate-800">
      {notification && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification('')} className="font-bold">✕</button>
        </div>
      )}

      {/* 3-Column Layout: Vehicles (Left), Load Management (Center), Orders (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ============================================================== */}
        {/* COLUMN 1: Vehicles List (3 Cols)                                */}
        {/* ============================================================== */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Vehicles</h2>
            <span className="text-[11px] text-slate-400 font-medium">{filteredVehicles.length} total</span>
          </div>

          {/* Search by Shipment ID */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search by Shipment ID, No."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-medium text-slate-600 no-scrollbar">
            {['Active', 'Loading', 'Unloading', 'Arriving', 'Preparing'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setVehicleFilter(vehicleFilter === status ? 'All' : status)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 border ${
                  vehicleFilter === status
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Vehicles List */}
          <div className="space-y-3 max-h-[740px] overflow-y-auto pr-1">
            {filteredVehicles.map((v) => {
              const isSelected = v.id === selectedVehicleId
              const statusColors = {
                Loading: 'bg-amber-50 text-amber-700 border-amber-200',
                Arriving: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                Available: 'bg-blue-50 text-blue-700 border-blue-200',
                Unloading: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                Departed: 'bg-slate-100 text-slate-700 border-slate-200',
                Active: 'bg-blue-50 text-blue-700 border-blue-200',
              }[v.status]

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Top: Icon + ID + Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 text-base">🚛</span>
                      <span className="text-xs font-bold text-slate-900">{v.id}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors}`}>
                      {v.status}
                    </span>
                  </div>

                  {/* Middle: Timeline Details + Route map thumbnail */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-slate-400 text-[10px]">Arriving</span>
                        <span className="font-medium text-slate-700">{v.timeline.arriving}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full border border-slate-400 bg-white" />
                        <span className="text-slate-400 text-[10px]">Unloading</span>
                        <span className="font-medium text-slate-700">{v.timeline.unloading}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full border border-slate-400 bg-white" />
                        <span className="text-slate-400 text-[10px]">Loading</span>
                        <span className="font-medium text-slate-700">{v.timeline.loading}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full border border-slate-400 bg-white" />
                        <span className="text-slate-400 text-[10px]">Preparing</span>
                        <span className="font-medium text-slate-700">{v.timeline.preparing}</span>
                      </div>
                    </div>

                    {/* Route thumbnail */}
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="w-14 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                        <img
                          src="/assets/order_minimap.png"
                          alt="Route"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-white/90 px-1 rounded font-bold text-slate-600">
                          🗺️
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold text-slate-500 mt-1 flex items-center gap-0.5">
                        <span>◇</span> {v.routeBadge}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: Load Management & Truck Visualization (6 Cols)        */}
        {/* ============================================================== */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          {/* Truck Header Info */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                🚛
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{activeVehicle.name}</h3>
                <span className="text-[11px] font-mono text-slate-500">{activeVehicle.plate}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📦</span>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Load Volume</div>
                  <div className="font-bold text-slate-800">{activeVehicle.loadVolumeM3} m³</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">⚖️</span>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Max Weight</div>
                  <div className="font-bold text-slate-800">{activeVehicle.maxWeightTon} Tone</div>
                </div>
              </div>
            </div>
          </div>

          {/* Truck Illustration with Dynamic Fill Bar */}
          <div className="relative bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center justify-center overflow-hidden">
            <div className="relative max-w-lg w-full">
              {/* Truck image container */}
              <div className="relative">
                <img
                  src="/assets/eicher_truck.png"
                  alt="Eicher Pro Cargo Truck"
                  className="w-full h-auto object-contain select-none"
                  onError={(e) => {
                    // Fallback stylized SVG truck if image not present
                    e.currentTarget.style.display = 'none'
                  }}
                />

                {/* Floating Load Percentage Badge over cargo bed */}
                <div
                  className="absolute top-1/4 right-[28%] -translate-y-1/2 px-4 py-1.5 rounded-lg font-bold text-white shadow-md text-sm transition-all"
                  style={{
                    background: 'linear-gradient(90deg, #f97316 0%, #eab308 100%)',
                  }}
                >
                  {capacityPct}%
                </div>
              </div>
            </div>
          </div>

          {/* Load Management Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">Load Management</span>
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center font-bold">
                  i
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800">
                <span className="text-blue-600">{availableTon} Ton</span> Out of {maxTon} Ton is Available
              </div>
            </div>

            {/* Percentage Scale */}
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>

            {/* Progress track */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200/80">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${capacityPct}%`,
                  background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)',
                }}
              />
            </div>
          </div>

          {/* Instructions Notice */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
            <span className="text-blue-600 font-bold">ℹ</span>
            <span>
              Drag and drop the orders into available weight blocks. You can also click any block to load/unload.
              The weight blocks are dynamically recommended based on selected orders and live axle distribution.
            </span>
          </div>

          {/* 100 KG Weight Blocks Grid (3 rows x 6 cols) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">100 KG</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {filledCount100} of 18 blocks allocated
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {slots100.map((slot, idx) => {
                // Tier colors: row 1 (light), row 2 (medium), row 3 (deep blue)
                const row = Math.floor(idx / 6)
                const filledColor =
                  row === 0
                    ? 'bg-blue-100 border-blue-200 hover:bg-blue-200'
                    : row === 1
                    ? 'bg-blue-400 border-blue-500 hover:bg-blue-500 text-white'
                    : 'bg-blue-600 border-blue-700 hover:bg-blue-700 text-white'

                const emptyColor = 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleAssignOrderToBlock('100', idx)}
                    title={slot.filled ? `100 KG (${slot.orderId || 'Loaded'}) · Click to remove` : 'Empty 100 KG block · Click to assign'}
                    className={`h-9 rounded-lg border transition-all cursor-pointer flex items-center justify-center font-bold text-[10px] shadow-2xs ${
                      slot.filled ? filledColor : emptyColor
                    }`}
                  >
                    {slot.filled ? (row === 0 ? '✓' : '100') : '+'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 200 KG Weight Blocks Grid (3 rows x 6 cols) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">200 KG</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {filledCount200} of 18 blocks allocated
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {slots200.map((slot, idx) => {
                const row = Math.floor(idx / 6)
                const filledColor =
                  row === 0
                    ? 'bg-purple-100 border-purple-200 hover:bg-purple-200 text-purple-900'
                    : row === 1
                    ? 'bg-purple-400 border-purple-500 hover:bg-purple-500 text-white'
                    : 'bg-purple-700 border-purple-800 hover:bg-purple-800 text-white'

                const emptyColor = 'bg-slate-50 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50'

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleAssignOrderToBlock('200', idx)}
                    title={slot.filled ? `200 KG (${slot.orderId || 'Loaded'}) · Click to remove` : 'Empty 200 KG block · Click to assign'}
                    className={`h-9 rounded-lg border transition-all cursor-pointer flex items-center justify-center font-bold text-[10px] shadow-2xs ${
                      slot.filled ? filledColor : emptyColor
                    }`}
                  >
                    {slot.filled ? (row === 0 ? '✓' : '200') : '+'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 3: Orders Queue & Recommendations (3 Cols)               */}
        {/* ============================================================== */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Orders</h2>
            <div className="flex items-center gap-1.5 text-slate-400">
              <button type="button" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-slate-700 text-xs" title="Cart view">
                👜
              </button>
              <button type="button" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-slate-700 text-xs" title="Map book">
                📖
              </button>
              <button type="button" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-slate-700 text-xs" title="Schedule">
                📅
              </button>
            </div>
          </div>

          {/* Search by Order ID */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search by Order ID, No."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="text-[11px] font-semibold text-slate-500">Recommendation</div>

          {selectedOrder && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-800">{selectedOrder.id}</span>
                <span className="text-blue-600 ml-1.5">({selectedOrder.weightKg} kg)</span>
                <div className="text-[10px] text-blue-500">Click any block to place</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* 2-Column Grid of Orders */}
          <div className="grid grid-cols-2 gap-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredOrders.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(isSelected ? null : ord)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 select-none ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">⋮⋮</span>
                    <span className="text-[10px] font-bold text-slate-800 truncate">{ord.id}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>⚖️</span>
                    <span className="font-semibold text-slate-700">{ord.weightKg} kg</span>
                  </div>

                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                    <span>📖</span>
                    <span className="truncate">{ord.route}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
