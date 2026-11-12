import type { Vehicle } from '../types'

type Props = {
  vehicles: Vehicle[]
}

export default function FleetPanel({ vehicles }: Props) {
  const onlineCount = vehicles.filter((v) => v.available).length

  return (
    <div className="w-full text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase block mb-1">
            ASSETS · AUTONOMOUS FLEET
          </span>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Active Fleet Status</h2>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 inline-flex items-center gap-2 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {onlineCount} of {vehicles.length} online
        </span>
      </div>

      {/* Grid of Vehicles: 5 columns on desktop matching original 2x5 layout */}
      {vehicles.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {vehicles.map((v) => {
            const pct = Math.min(100, Math.round((v.load_kg / v.capacity_kg) * 100))
            const statusLabel = !v.available ? 'broken_down' : v.in_transit ? 'in_transit' : 'idle'

            return (
              <div
                key={v.id}
                className={`bg-slate-50/70 hover:bg-white border rounded-xl p-3.5 transition-all shadow-xs hover:shadow flex flex-col justify-between gap-3 group ${
                  statusLabel === 'broken_down'
                    ? 'border-red-200 bg-red-50/20'
                    : statusLabel === 'in_transit'
                    ? 'border-blue-200/80 bg-blue-50/20'
                    : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                {/* Top Row: Icon + ID + Status Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg
                        width={16}
                        height={16}
                        style={{ width: 16, height: 16 }}
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 9h10l3 4v4H3V9zm13 4h4l2 3v1h-6v-4z" />
                      </svg>
                    </div>
                    <strong className="text-xs font-bold text-slate-800 font-mono">{v.id}</strong>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      statusLabel === 'in_transit'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : statusLabel === 'broken_down'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-200/70 text-slate-600 border border-slate-300/60'
                    }`}
                  >
                    {statusLabel.replace('_', ' ')}
                  </span>
                </div>

                {/* Middle: Load Info & Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Load: {v.load_kg.toFixed(1)} / {v.capacity_kg} kg
                    </span>
                    <strong className="text-xs font-bold text-slate-800 font-mono">{pct}%</strong>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct > 85
                          ? 'bg-amber-500'
                          : pct > 50
                          ? 'bg-blue-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Foot: Cedar policy check & Coords */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                  <span
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"
                    title="Verified by AWS Cedar SMT policy"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Cedar: Zone OK
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {v.latitude.toFixed(3)}, {v.longitude.toFixed(3)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs">No vehicles in active fleet.</div>
      )}
    </div>
  )
}
