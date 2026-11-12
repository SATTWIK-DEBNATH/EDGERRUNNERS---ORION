import { useState } from 'react'

type Props = {
  userName?: string
  userOrg?: string
  realtimeStatus: string
  simulationId?: string
  simulations?: { id: string }[]
  onSelectSimulation?: (id: string) => void
  onOpenCreateOrder: () => void
  onReturnLanding: () => void
  onToggleTour?: () => void
  onSearch?: (query: string) => void
}

export default function TopNavbar({
  userName = 'Harsh Vani',
  userOrg = 'Deportation Manager',
  realtimeStatus,
  simulationId,
  simulations,
  onSelectSimulation,
  onOpenCreateOrder,
  onReturnLanding,
  onToggleTour,
  onSearch,
}: Props) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left Search Bar */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative flex-1 flex items-center">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
            <svg width={16} height={16} className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by User id, User Name, Date etc"
            onChange={(e) => onSearch?.(e.target.value)}
            style={{ paddingLeft: '42px', backgroundColor: '#f8fafc', color: '#1e293b' }}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-none"
          />
        </div>

        <button
          type="button"
          onClick={() => onOpenCreateOrder()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0"
          title="Filter results / Actions"
        >
          <svg width={16} height={16} className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        {/* Switch back to landing page */}
        <button
          type="button"
          onClick={onReturnLanding}
          className="hidden sm:inline-flex text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          ‹ Public Landing
        </button>

        {/* Guided Tour Trigger Button */}
        {onToggleTour && (
          <button
            type="button"
            onClick={onToggleTour}
            className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            title="Start Interactive Walkthrough"
          >
            <span>🎯</span>
            <span className="hidden md:inline">Tour Walkthrough</span>
          </button>
        )}

        {/* Simulation Selector or ID Tag */}
        {simulations && simulations.length > 1 ? (
          <select
            value={simulationId ?? ''}
            onChange={(e) => onSelectSimulation?.(e.target.value)}
            className="text-[11px] font-mono bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none cursor-pointer"
            aria-label="Select simulation"
          >
            {simulations.map((s) => (
              <option key={s.id} value={s.id}>{s.id}</option>
            ))}
          </select>
        ) : simulationId ? (
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono font-medium border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {simulationId}
          </span>
        ) : null}

        {/* WebSocket Stream Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{realtimeStatus === 'connected' ? 'Live Stream' : 'Connecting…'}</span>
        </div>

        {/* Primary Create Button (+) */}
        <button
          type="button"
          onClick={onOpenCreateOrder}
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-500/30 transition-colors"
          title="Create New Order / Quick Actions"
        >
          +
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowMessages(false)
              setShowProfileMenu(false)
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Notifications"
          >
            <svg width={16} height={16} className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>Notifications (3)</span>
                <button type="button" onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                  <div className="font-semibold text-blue-900 text-[11px]">New Order Request #ORDERID01</div>
                  <p className="text-[10px] text-slate-500">Raj Industries requested dispatch Delhi to Mumbai</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <div className="font-semibold text-emerald-900 text-[11px]">Vehicle SHIPID03 Loading</div>
                  <p className="text-[10px] text-slate-500">60% payload verified via automated axle sensor</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800 text-[11px]">Cedar Authorization Validated</div>
                  <p className="text-[10px] text-slate-500">SMT formal proof check passed without violations</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMessages(!showMessages)
              setShowNotifications(false)
              setShowProfileMenu(false)
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Messages"
          >
            <svg width={16} height={16} className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {showMessages && (
            <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>Dispatch Comms</span>
                <button type="button" onClick={() => setShowMessages(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 text-[11px]">Driver Rajesh Kumar (#Driv012345)</div>
                <p className="text-[10px] text-slate-500">"Arrived at Kotputli toll bypass. Highway speed holding steady at 120 km/h."</p>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
              setShowMessages(false)
            }}
            className="flex items-center gap-2.5 pl-2 border-l border-slate-200 cursor-pointer select-none"
          >
            <img
              src="/assets/harsh_avatar.png"
              alt={userName}
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">{userName}</span>
              <span className="text-[10px] text-slate-400 font-medium">{userOrg}</span>
            </div>
            <svg width={14} height={14} className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in">
              <div className="p-2 border-b border-slate-100">
                <div className="font-bold text-slate-900">{userName}</div>
                <div className="text-[10px] text-slate-400">{userOrg}</div>
              </div>
              <button
                type="button"
                onClick={onReturnLanding}
                className="w-full text-left px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
