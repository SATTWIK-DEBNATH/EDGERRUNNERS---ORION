import { useState } from 'react'
import type { Overview } from '../../types'

type Props = {
  overview: Overview | null
  onNavigateTracking: () => void
  onNavigateRoutes?: () => void
  onNavigateLoad?: () => void
  onOpenCreateOrder?: () => void
}

type OrderRequest = {
  id: string
  date: string
  pickup: string
  destination: string
  customer: string
  category: string
  location: string
  description: string
  route: string
  status: 'Pending' | 'Accepted' | 'Rejected'
}

const INITIAL_REQUESTS: OrderRequest[] = [
  {
    id: 'ORDERID01',
    date: '17 July 2024 18:00',
    pickup: '41 Sector 15, Scf, Delhi',
    destination: 'C6, Shah Colony, Mumbai',
    customer: 'Raj Industries',
    category: 'Manufacturing',
    location: 'Ludhiana, Punjab',
    description:
      "Raj Industries is one of the leading FMCG companies in northern India dealing in Personal and Home Care products. The company's leading product 'Raj Super White Laundry Bar' commands a high market share and is trusted by around 1,50,000 retail stores all over the country.",
    route: 'Mumbai ─── Delhi',
    status: 'Pending',
  },
  {
    id: 'ORDERID02',
    date: '17 July 2024 19:30',
    pickup: 'Plot 88, Okhla Phase III, Delhi',
    destination: 'Bhiwandi Warehousing Hub, Mumbai',
    customer: 'Apex Logistics Corp',
    category: 'Industrial Tech',
    location: 'Gurugram, Haryana',
    description:
      'High-priority electrical component batches requiring expedited transport via Western Express freight corridor.',
    route: 'Delhi ─── Mumbai',
    status: 'Pending',
  },
  {
    id: 'ORDERID03',
    date: '18 July 2024 09:15',
    pickup: 'Industrial Area Phase 2, Chandigarh',
    destination: 'JNPT Maritime Gateway, Navi Mumbai',
    customer: 'Zenith Pharma Chem',
    category: 'Cold-Chain Biologics',
    location: 'Baddi, Himachal Pradesh',
    description:
      'Temperature-monitored pharmaceutical cargo with strict zero-delay delivery SLA.',
    route: 'Chandigarh ─── Mumbai',
    status: 'Pending',
  },
  {
    id: 'ORDERID04',
    date: '18 July 2024 11:45',
    pickup: 'Sitapura Industrial Zone, Jaipur',
    destination: 'Sector 62, Electronic City, Noida',
    customer: 'Delta Engineering',
    category: 'Automotive Sub-assemblies',
    location: 'Jaipur, Rajasthan',
    description:
      'Precision machinery parts scheduled for JIT automotive factory assembly.',
    route: 'Jaipur ─── Noida',
    status: 'Pending',
  },
]

export default function LogisticsOverview({
  overview,
  onNavigateTracking,
  onNavigateRoutes,
  onNavigateLoad,
  onOpenCreateOrder,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState('July')
  const [shippingSearch, setShippingSearch] = useState('')
  const [requestSearch, setRequestSearch] = useState('')

  // Right Panel View State: 'requests' (Image 4 & 10) | 'details' (Image 9) | 'actions' (Image 6 & 8)
  const [rightPanelMode, setRightPanelMode] = useState<'requests' | 'details' | 'actions'>('requests')
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>(INITIAL_REQUESTS)
  const [selectedRequest, setSelectedRequest] = useState<OrderRequest>(INITIAL_REQUESTS[0])

  // Modals for the 6 Quick Actions
  const [activeModal, setActiveModal] = useState<
    'none' | 'cargo' | 'route' | 'createroute' | 'staff' | 'warehouse' | 'contacts'
  >('none')

  const [notification, setNotification] = useState('')

  // Stats calculation
  const totalOrders = overview?.orders.total ? overview.orders.total * 36 : 720
  const pendingOrders = overview?.orders.pending ? overview.orders.pending * 12 : 120
  const [acceptedCount, setAcceptedCount] = useState(450)
  const totalVehicles = overview?.vehicles.length ? overview.vehicles.length * 12 : 120

  const [latestShipping, setLatestShipping] = useState([
    { id: 'ORDERID01', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID02', status: 'Canceled', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID03', status: 'Active', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID04', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID05', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID06', status: 'Active', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID07', status: 'Active', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID08', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
  ])

  // Filter latest shipping
  const filteredShipping = latestShipping.filter(
    (item) =>
      item.id.toLowerCase().includes(shippingSearch.toLowerCase()) ||
      item.customer.toLowerCase().includes(shippingSearch.toLowerCase()) ||
      item.departure.toLowerCase().includes(shippingSearch.toLowerCase()) ||
      item.arrival.toLowerCase().includes(shippingSearch.toLowerCase()) ||
      item.status.toLowerCase().includes(shippingSearch.toLowerCase())
  )

  // Filter order requests
  const filteredRequests = orderRequests.filter(
    (req) =>
      req.id.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.customer.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.pickup.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.destination.toLowerCase().includes(requestSearch.toLowerCase())
  )

  function handleAcceptRequest() {
    setOrderRequests((prev) =>
      prev.map((r) => (r.id === selectedRequest.id ? { ...r, status: 'Accepted' } : r))
    )
    setSelectedRequest((prev) => ({ ...prev, status: 'Accepted' }))
    setAcceptedCount((c) => c + 1)
    setNotification(`Order ${selectedRequest.id} from ${selectedRequest.customer} has been ACCEPTED.`)
    setTimeout(() => setNotification(''), 4000)
  }

  function handleRejectRequest() {
    setOrderRequests((prev) =>
      prev.map((r) => (r.id === selectedRequest.id ? { ...r, status: 'Rejected' } : r))
    )
    setSelectedRequest((prev) => ({ ...prev, status: 'Rejected' }))
    setNotification(`Order ${selectedRequest.id} has been REJECTED.`)
    setTimeout(() => setNotification(''), 4000)
  }

  function handleAddCargoSubmit(e: React.FormEvent) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const newId = `ORD-NEW-${Math.floor(100 + Math.random() * 900)}`
    setLatestShipping([
      {
        id: newId,
        status: 'Active',
        customer: (formData.get('customer') as string) || 'Enterprise Client',
        departure: (formData.get('departure') as string) || 'Delhi',
        weight: `${formData.get('weight') || 300} KG`,
        arrival: (formData.get('arrival') as string) || 'Mumbai',
        date: 'Today',
      },
      ...latestShipping,
    ])
    setActiveModal('none')
    setNotification(`Cargo ${newId} successfully registered and added to active queue.`)
    setTimeout(() => setNotification(''), 4000)
  }

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] text-slate-800 space-y-6">
      {notification && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification('')} className="font-bold">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT 2 COLUMNS: Charts, Loading Donut, Latest Shipping, Cargo   */}
        {/* ============================================================== */}
        <div className="xl:col-span-2 space-y-6">
          {/* Top Row: Recent Orders & Loading Trucks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Recent Orders Area Chart */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Recent Orders</h3>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 pr-6 appearance-none focus:outline-none cursor-pointer"
                  >
                    <option value="July">July</option>
                    <option value="June">June</option>
                    <option value="August">August</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                {/* KPI Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                      📄
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Active Orders</div>
                      <div className="text-sm font-bold text-slate-800 leading-tight">{totalOrders}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                      🕒
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Pending Req</div>
                      <div className="text-sm font-bold text-slate-800 leading-tight">{pendingOrders}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Accepted</div>
                      <div className="text-sm font-bold text-slate-800 leading-tight">{acceptedCount}</div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <span>↑ 40%</span>
                      <span className="text-slate-400 font-normal text-[9px]">In comparison to last month</span>
                    </span>
                  </div>
                </div>

                {/* Simulated Curve Line/Area Chart */}
                <div className="h-32 flex flex-col justify-end relative">
                  <svg className="w-full h-24 overflow-visible" viewBox="0 0 160 80">
                    <defs>
                      <linearGradient id="orderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M 0,70 Q 30,60 60,65 T 110,35 T 160,15 L 160,80 L 0,80 Z"
                      fill="url(#orderGrad)"
                    />
                    {/* Curve line */}
                    <path
                      d="M 0,70 Q 30,60 60,65 T 110,35 T 160,15"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* End point dot */}
                    <circle cx="160" cy="15" r="3" fill="#2563eb" />
                  </svg>
                  <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-2 pt-1 border-t border-slate-100">
                    <span>01</span>
                    <span>05</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                    <span>25</span>
                    <span>30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Loading Trucks Donut */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Loading Trucks</h3>
                <button
                  type="button"
                  onClick={onNavigateLoad}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                {/* SVG Donut Chart */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="14" fill="none" />
                    {/* Active Slice (Blue ~33%) */}
                    <circle
                      cx="50" cy="50" r="38"
                      stroke="#2563eb" strokeWidth="14" fill="none"
                      strokeDasharray="80 240" strokeDashoffset="0"
                    />
                    {/* Delayed Slice (Red ~19%) */}
                    <circle
                      cx="50" cy="50" r="38"
                      stroke="#ef4444" strokeWidth="14" fill="none"
                      strokeDasharray="45 240" strokeDashoffset="-80"
                    />
                    {/* Ready to Load Slice (Navy ~10%) */}
                    <circle
                      cx="50" cy="50" r="38"
                      stroke="#1e3a8a" strokeWidth="14" fill="none"
                      strokeDasharray="24 240" strokeDashoffset="-125"
                    />
                    {/* Unloading Delayed (Light Red ~10%) */}
                    <circle
                      cx="50" cy="50" r="38"
                      stroke="#f87171" strokeWidth="14" fill="none"
                      strokeDasharray="24 240" strokeDashoffset="-149"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-extrabold text-slate-900 leading-none">{totalVehicles}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Total Trucks</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs flex-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-600" /> Active
                    </div>
                    <span className="font-bold text-slate-800 text-xs">40</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Loading Delayed
                    </div>
                    <span className="font-bold text-slate-800 text-xs">23</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-indigo-900" /> Ready to Load
                    </div>
                    <span className="font-bold text-slate-800 text-xs">12</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> Unloading Delayed
                    </div>
                    <span className="font-bold text-slate-800 text-xs">12</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-300" /> Ready to Un-load
                    </div>
                    <span className="font-bold text-slate-800 text-xs">3</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-slate-300" /> Canceled
                    </div>
                    <span className="font-bold text-slate-800 text-xs">3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Shipping Table Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Latest Shipping</h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={shippingSearch}
                  onChange={(e) => setShippingSearch(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={onNavigateTracking}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Departure</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">Arrival</th>
                    <th className="py-2.5 px-3">Arrival Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipping.map((item, idx) => {
                    const statusClass = {
                      Delivered: 'bg-blue-50 text-blue-600 border-blue-200',
                      Canceled: 'bg-red-50 text-red-600 border-red-200',
                      Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    }[item.status] || 'bg-slate-50 text-slate-600 border-slate-200'

                    return (
                      <tr
                        key={idx}
                        onClick={onNavigateTracking}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 font-bold text-slate-800 group-hover:text-blue-600 font-mono text-[11px]">
                          {item.id}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">{item.customer}</td>
                        <td className="py-3 px-3 text-slate-600">{item.departure}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{item.weight}</td>
                        <td className="py-3 px-3 text-slate-600">{item.arrival}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{item.date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Row: Unloading Cargo & Available Cargo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Unloading Cargo */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Unloading Cargo</h3>
                <button type="button" onClick={onNavigateLoad} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'SHIPID03', corridor: 'Mumbai ┄┄┄ Delhi', status: 'Delivered', date: '17 July 2024' },
                  { id: 'SHIPID04', corridor: 'Mumbai ┄┄┄ Delhi', status: 'Delivered', date: '17 July 2024' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">{c.id}</span>
                    <span className="text-slate-500 text-[11px]">{c.corridor}</span>
                    <span className="bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {c.status}
                    </span>
                    <span className="text-slate-400 text-[10px]">{c.date}</span>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <button
                        type="button"
                        onClick={() => {
                          setNotification(`Downloaded Proof of Delivery for ${c.id}`)
                          setTimeout(() => setNotification(''), 3000)
                        }}
                        className="hover:text-blue-600"
                        title="Download POD"
                      >
                        📥
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotification(`Printed shipping label for ${c.id}`)
                          setTimeout(() => setNotification(''), 3000)
                        }}
                        className="hover:text-blue-600"
                        title="Print Invoice"
                      >
                        🖨️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Available Cargo */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Available Cargo</h3>
                <button type="button" onClick={onNavigateLoad} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'SHIPID03', pct: 40, barClass: 'bg-blue-500' },
                  { id: 'SHIPID03', pct: 80, barClass: 'bg-blue-600' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">{item.id}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${item.barClass}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 mr-3">{item.pct}%</span>
                    <span className="text-slate-500 text-[11px] mr-2">Mumbai ── Delhi</span>
                    <button
                      type="button"
                      onClick={onNavigateLoad}
                      className="text-slate-400 hover:text-blue-600"
                      title="View Cargo Details"
                    >
                      ↗
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: Order Requests (A), Details (B), or Actions (C)  */}
        {/* ============================================================== */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col min-h-[720px]">
          {/* Header Switcher Tabs between Requests and Quick Actions */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRightPanelMode('requests')}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                  rightPanelMode === 'requests' || rightPanelMode === 'details'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Order Requests
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('actions')}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                  rightPanelMode === 'actions'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Quick Actions
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                type="button"
                onClick={() => setRightPanelMode(rightPanelMode === 'actions' ? 'requests' : 'actions')}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xs"
                title="Toggle Mode"
              >
                {rightPanelMode === 'actions' ? '📋' : '⚡'}
              </button>
            </div>
          </div>

          {/* STATE B: Order Request Details (Matching Image 9) */}
          {rightPanelMode === 'details' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">Order Request Details</span>
                <button
                  type="button"
                  onClick={() => setRightPanelMode('requests')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  ‹ BACK
                </button>
              </div>

              {/* Customer Header + Accept/Reject Buttons */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      RI
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedRequest.customer}</h4>
                      <p className="text-[10px] text-slate-500">{selectedRequest.category} · {selectedRequest.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptRequest}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-2xs transition-all"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectRequest}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-[11px] pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400">Status: <strong className="text-slate-700">{selectedRequest.status}</strong></span>
                  <span className="text-slate-400 font-mono">{selectedRequest.date}</span>
                </div>
              </div>

              {/* Full Specs List */}
              <div className="space-y-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Order ID</div>
                  <div className="font-bold text-slate-800 font-mono text-xs">{selectedRequest.id}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Description</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">{selectedRequest.description}</p>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pickup Address</div>
                  <p className="text-slate-700 text-[11px] font-medium">{selectedRequest.pickup}</p>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Delivery Address</div>
                  <p className="text-slate-700 text-[11px] font-medium">{selectedRequest.destination}</p>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Route Corridor</div>
                  <p className="text-blue-600 font-bold text-[11px]">{selectedRequest.route}</p>
                </div>
              </div>
            </div>
          )}

          {/* STATE C: 6 Quick Action Grid (Matching Image 6 & 8) */}
          {rightPanelMode === 'actions' && (
            <div className="space-y-4 flex-1">
              <div className="text-xs text-slate-500 font-medium">
                Click any action below to quickly add cargo, plan corridors, or manage warehouse nodes:
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 1. ADD CARGO */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCreateOrder) {
                      onOpenCreateOrder()
                    } else {
                      setActiveModal('cargo')
                    }
                  }}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🚛
                  </div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">ADD CARGO</span>
                  <p className="text-[9px] text-slate-400 line-clamp-2">Register new shipment cargo payload into dispatch</p>
                </button>

                {/* 2. ADD ROUTE */}
                <button
                  type="button"
                  onClick={() => onNavigateRoutes ? onNavigateRoutes() : setActiveModal('route')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    〰️
                  </div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">ADD ROUTE</span>
                  <p className="text-[9px] text-slate-400 line-clamp-2">Configure waypoint corridors between transit cities</p>
                </button>

                {/* 3. CREATE ROUTE */}
                <button
                  type="button"
                  onClick={() => onNavigateRoutes ? onNavigateRoutes() : setActiveModal('createroute')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🗺️
                  </div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">CREATE ROUTE</span>
                  <p className="text-[9px] text-slate-400 line-clamp-2">Autonomous road network route optimization</p>
                </button>

                {/* 4. ADD STAFF */}
                <button
                  type="button"
                  onClick={() => setActiveModal('staff')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🪪
                  </div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">ADD STAFF</span>
                  <p className="text-[9px] text-slate-400 line-clamp-2">Register drivers, operators, and logistics engineers</p>
                </button>

                {/* 5. ADD WAREHOUSE */}
                <button
                  type="button"
                  onClick={() => setActiveModal('warehouse')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🏢
                  </div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">ADD WAREHOUSE</span>
                  <p className="text-[9px] text-slate-400 line-clamp-2">Expand node network with capacity & safety bounds</p>
                </button>

                {/* 6. CONTACTS */}
                <button
                  type="button"
                  onClick={() => setActiveModal('contacts')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📖
                  </div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">CONTACTS</span>
                  <p className="text-[9px] text-slate-400 line-clamp-2">Logistics enterprise directory & client accounts</p>
                </button>
              </div>
            </div>
          )}

          {/* STATE A: Order Requests List (Matching Image 4 & 10) */}
          {rightPanelMode === 'requests' && (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Search by order id */}
              <div className="relative flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none z-10">🔍</span>
                <input
                  type="text"
                  placeholder="Search by order id, Date etc"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-none"
                />
              </div>

              <div className="text-[11px] font-semibold text-slate-500">Recent Order Requests</div>

              {/* Scrollable Order Request Cards */}
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[640px] pr-1">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/40 hover:border-blue-300 transition-all shadow-2xs space-y-2.5"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                          📦
                        </div>
                        <span className="text-xs font-bold text-slate-800">{req.id}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{req.date}</span>
                    </div>

                    {/* Locations with thumbnail */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2 text-xs flex-1">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-300 mt-1" />
                          <div>
                            <div className="text-[9px] text-slate-400 leading-none">Pickup Location</div>
                            <div className="text-slate-700 font-medium text-[11px]">{req.pickup}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full border-2 border-blue-500 bg-white mt-1" />
                          <div>
                            <div className="text-[9px] text-slate-400 leading-none">Destination</div>
                            <div className="text-slate-700 font-medium text-[11px]">{req.destination}</div>
                          </div>
                        </div>
                      </div>

                      {/* Mini map thumbnail */}
                      <img
                        src="/assets/order_minimap.png"
                        alt="Route minimap"
                        className="w-16 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>

                    {/* Footer customer row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] flex items-center justify-center">
                          RI
                        </span>
                        <span className="font-semibold text-slate-700 text-xs">{req.customer}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(req)
                          setRightPanelMode('details')
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* FUNCTIONAL MODALS FOR THE 6 QUICK ACTIONS                      */}
      {/* ============================================================== */}
      {activeModal === 'cargo' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🚛</span> Add Cargo Shipment
              </h3>
              <button type="button" onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCargoSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer / Consignor</label>
                <input name="customer" defaultValue="Raj Industries" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Departure</label>
                  <input name="departure" defaultValue="Delhi NCR" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Arrival</label>
                  <input name="arrival" defaultValue="Mumbai Port" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Weight (KG)</label>
                <input name="weight" type="number" defaultValue="350" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">
                  Add Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'staff' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🪪</span> Add Staff & Driver
              </h3>
              <button type="button" onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input placeholder="e.g. Rajesh Kumar" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">License & Shipper ID</label>
                <input placeholder="e.g. #Driv012345" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Vehicle</label>
                <input placeholder="e.g. DL04MP7045 (Eicher Pro 2059)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('none')
                    setNotification('Staff member registered successfully.')
                    setTimeout(() => setNotification(''), 3000)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  Save Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'warehouse' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🏢</span> Add Warehouse Node
              </h3>
              <button type="button" onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Warehouse Facility Name</label>
                <input placeholder="e.g. Ahmedabad Western Central Hub" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City / Region</label>
                  <input placeholder="e.g. Ahmedabad" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Capacity (KG)</label>
                  <input type="number" placeholder="e.g. 60000" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('none')
                    setNotification('Warehouse registered into Cedar authorization registry.')
                    setTimeout(() => setNotification(''), 3000)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  Register Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'contacts' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📖</span> Logistics Contacts Directory
              </h3>
              <button type="button" onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
              {[
                { name: 'Raj Industries Dispatch Desk', phone: '+91 98140 12345', role: 'FMCG Consignor', loc: 'Ludhiana, Punjab' },
                { name: 'Eicher Fleet Controller - Harsh Vani', phone: '+91 98765 43210', role: 'Deportation Manager', loc: 'Delhi NCR' },
                { name: 'Driver Rajesh Kumar (#Driv012345)', phone: '+91 98220 99887', role: 'Senior Heavy Axle Driver', loc: 'On Route NH04' },
                { name: 'Jaipur SEZ Freight Terminal Office', phone: '+91 141 277 8899', role: 'Terminal Manager', loc: 'Sitapura, Jaipur' },
              ].map((c, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.role} · {c.loc}</div>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="px-2.5 py-1 bg-white border border-blue-200 text-blue-600 font-semibold rounded-lg text-[11px] hover:bg-blue-50"
                  >
                    📞 Call
                  </a>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
