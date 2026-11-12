import { useState } from 'react'
import type { Overview } from '../../types'

type Props = {
  overview: Overview | null
  onNavigateTracking: () => void
}

export default function LogisticsOverview({ overview, onNavigateTracking }: Props) {
  const [selectedMonth, setSelectedMonth] = useState('July')

  const totalOrders = overview?.orders.total ? overview.orders.total * 36 : 720
  const pendingOrders = overview?.orders.pending ? overview.orders.pending * 12 : 120
  const acceptedOrders = overview?.orders.assigned ? overview.orders.assigned * 25 : 450
  const totalVehicles = overview?.vehicles.length ? overview.vehicles.length * 12 : 120

  const activeVehicles = overview?.vehicles.filter((v) => v.available).length
    ? Math.round(totalVehicles * 0.35)
    : 40

  // Order items mapped from live simulation data or fallback mock to match Image 2
  const latestShipping = [
    { id: 'ORDERID01', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Canceled', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Active', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Active', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Active', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
    { id: 'ORDERID01', status: 'Delivered', customer: 'Raj Industries', departure: 'Delhi', weight: '250 KG', arrival: 'Mumbai', date: '17 July 2024' },
  ]

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] text-slate-800">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Orders Chart, Loading Trucks, Latest Shipping, Cargo */}
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
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Active Orders</div>
                      <div className="text-sm font-bold text-slate-800 leading-tight">{totalOrders}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Pending Req</div>
                      <div className="text-sm font-bold text-slate-800 leading-tight">{pendingOrders}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Accepted</div>
                      <div className="text-sm font-bold text-slate-800 leading-tight">{acceptedOrders}</div>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 pt-1">
                    <span>↑ 40%</span>
                    <span className="text-[9px] text-slate-400 font-normal">in comparison to last month</span>
                  </div>
                </div>

                {/* SVG Area Line Chart */}
                <div className="w-full h-32 flex flex-col justify-end">
                  <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M 0 90 Q 30 85, 60 70 T 120 40 T 160 25 T 200 10 L 200 100 L 0 100 Z"
                      fill="url(#orderGrad)"
                    />
                    {/* Line stroke */}
                    <path
                      d="M 0 90 Q 30 85, 60 70 T 120 40 T 160 25 T 200 10"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="flex justify-between text-[8px] text-slate-400 mt-2 px-1 font-mono">
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

            {/* Card 2: Loading Trucks Donut Chart */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Loading Trucks</h3>
                <button
                  type="button"
                  onClick={onNavigateTracking}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Donut Chart */}
                <div className="relative flex items-center justify-center">
                  <svg width={112} height={112} style={{ width: 112, height: 112 }} className="w-28 h-28 transform -rotate-90 shrink-0" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                    {/* Segment 1: Active (Navy Blue) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e3a8a" strokeWidth="12" strokeDasharray="95 238" strokeDashoffset="0" />
                    {/* Segment 2: Loading Delayed (Sky Blue) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#38bdf8" strokeWidth="12" strokeDasharray="55 238" strokeDashoffset="-95" />
                    {/* Segment 3: Ready to Load (Blue) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563eb" strokeWidth="12" strokeDasharray="40 238" strokeDashoffset="-150" />
                    {/* Segment 4: Canceled (Red) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="12" strokeDasharray="20 238" strokeDashoffset="-190" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-base font-extrabold text-slate-800 leading-none">{totalVehicles}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Total Trucks</span>
                  </div>
                </div>

                {/* Status List */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="border-l-2 border-[#1e3a8a] pl-2">
                    <div className="text-[9px] text-slate-400">Active</div>
                    <div className="font-bold text-slate-800">{activeVehicles}</div>
                  </div>
                  <div className="border-l-2 border-[#38bdf8] pl-2">
                    <div className="text-[9px] text-slate-400">Loading Delayed</div>
                    <div className="font-bold text-slate-800">23</div>
                  </div>
                  <div className="border-l-2 border-[#2563eb] pl-2">
                    <div className="text-[9px] text-slate-400">Ready to Load</div>
                    <div className="font-bold text-slate-800">12</div>
                  </div>
                  <div className="border-l-2 border-slate-300 pl-2">
                    <div className="text-[9px] text-slate-400">Unloading Delayed</div>
                    <div className="font-bold text-slate-800">12</div>
                  </div>
                  <div className="border-l-2 border-blue-400 pl-2">
                    <div className="text-[9px] text-slate-400">Ready to Un-load</div>
                    <div className="font-bold text-slate-800">3</div>
                  </div>
                  <div className="border-l-2 border-red-500 pl-2">
                    <div className="text-[9px] text-slate-400">Canceled</div>
                    <div className="font-bold text-slate-800">3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Latest Shipping Data Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Latest Shipping</h3>
              <button
                type="button"
                onClick={onNavigateTracking}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
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
                  {latestShipping.map((item, idx) => (
                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-700">{item.id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                            item.status === 'Delivered'
                              ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : item.status === 'Active'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : 'bg-red-50 border-red-200 text-red-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{item.customer}</td>
                      <td className="py-3 px-3 text-slate-600">{item.departure}</td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{item.weight}</td>
                      <td className="py-3 px-3 text-slate-600">{item.arrival}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{item.date}</td>
                    </tr>
                  ))}
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
                <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">SHIPID03</span>
                    <span className="text-slate-500 text-[11px]">Mumbai ┄┄┄ Delhi</span>
                    <span className="bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Delivered
                    </span>
                    <span className="text-slate-400 text-[10px]">17 July 2024</span>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <button type="button" className="hover:text-slate-700" title="Download POD">📥</button>
                      <button type="button" className="hover:text-slate-700" title="Print Invoice">🖨️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Available Cargo */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Available Cargo</h3>
                <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
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
                    <button type="button" className="text-slate-400 hover:text-blue-600" title="View Cargo Details">
                      ↗
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Requests (Matching Image 2) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Order Requests</h3>
            <div className="flex items-center gap-2">
              <button type="button" className="text-slate-400 hover:text-slate-600 text-sm">⊞</button>
              <button type="button" className="text-slate-400 hover:text-slate-600 text-sm">🕒</button>
            </div>
          </div>

          {/* Search by order id */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by order id, Date etc"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 mb-3">Recent Order Requests</div>

          {/* Scrollable Order Request Cards */}
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[720px] pr-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-red-50/20 hover:border-blue-200 transition-all shadow-sm"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                      📦
                    </div>
                    <span className="text-xs font-bold text-slate-800">ORDERID01</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">17 July 2024 18:00</span>
                </div>

                {/* Locations with thumbnail */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-300 mt-1" />
                      <div>
                        <div className="text-[9px] text-slate-400 leading-none">Pickup Location</div>
                        <div className="text-slate-700 font-medium text-[11px]">41 Sector 15, Scf, Delhi</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full border-2 border-blue-500 bg-white mt-1" />
                      <div>
                        <div className="text-[9px] text-slate-400 leading-none">Destination</div>
                        <div className="text-slate-700 font-medium text-[11px]">C6, Shah Colony, Mumbai</div>
                      </div>
                    </div>
                  </div>

                  {/* Mini map thumbnail */}
                  <img
                    src="/assets/order_minimap.png"
                    alt="Route minimap"
                    className="w-16 h-14 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>

                {/* Footer customer row */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] flex items-center justify-center">
                      RI
                    </span>
                    <span className="font-semibold text-slate-700 text-xs">Raj Industries</span>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateTracking}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

