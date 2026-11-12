export type TabType = 'overview' | 'tracking' | 'orders' | 'fleet' | 'streaming' | 'analytics'

type Props = {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  onLogout: () => void
}

export default function Sidebar({ activeTab, onSelectTab, onLogout }: Props) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[68px] bg-white border-r border-slate-200 flex flex-col items-center py-4 z-30 select-none">
      {/* Brand Fast Delivery Logo */}
      <div
        className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white cursor-pointer shadow-md shadow-blue-500/20 mb-6 shrink-0"
        style={{ width: 40, height: 40 }}
        onClick={() => onSelectTab('overview')}
        title="Autonomous Logistics Platform"
      >
        <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M19.5 9.5l-7.5-4.5-7.5 4.5v5l7.5 4.5 7.5-4.5v-5zm-7.5 7.64l-6-3.6v-3.88l6 3.6 6-3.6v3.88l-6 3.6zM6.5 9.1l5.5-3.3 5.5 3.3-5.5 3.3-5.5-3.3z" />
          <path d="M2 5h7v2H2zm0 4h5v2H2zm0 4h3v2H2z" />
        </svg>
      </div>

      {/* Navigation Icons Group */}
      <nav className="flex-1 flex flex-col items-center gap-2 w-full px-2">
        {/* Tab 1: Overview (Image 2) */}
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
          style={{ width: 44, height: 44 }}
          title="Logistics Overview Dashboard"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>

        {/* Tab 2: Delivery Tracking & Live Map (Image 3) */}
        <button
          type="button"
          onClick={() => onSelectTab('tracking')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all relative shrink-0 ${
            activeTab === 'tracking'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
          style={{ width: 44, height: 44 }}
          title="Delivery Tracking & Route Map"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L19 21L12 17L5 21L12 2Z" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </button>

        {/* Tab 3: Orders Directory */}
        <button
          type="button"
          onClick={() => onSelectTab('orders')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTab === 'orders'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
          style={{ width: 44, height: 44 }}
          title="Orders Directory & Dispatch"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Tab 4: Fleet & Capacity */}
        <button
          type="button"
          onClick={() => onSelectTab('fleet')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTab === 'fleet'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
          style={{ width: 44, height: 44 }}
          title="Autonomous Fleet Status"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        </button>

        {/* Tab 5: Real-time Stream Monitor (Kafka, Flink, Cedar) */}
        <button
          type="button"
          onClick={() => onSelectTab('streaming')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTab === 'streaming'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
          style={{ width: 44, height: 44 }}
          title="Kafka Event Stream & Flink CEP"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>

        {/* Tab 6: Analytics & Solver Optimization */}
        <button
          type="button"
          onClick={() => onSelectTab('analytics')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
          style={{ width: 44, height: 44 }}
          title="Optimization & Demand Forecasts"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-2 pt-3 border-t border-slate-100 w-full px-2 shrink-0">
        <button
          type="button"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          style={{ width: 40, height: 40 }}
          title="Notifications"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          style={{ width: 40, height: 40 }}
          title="Sign out to Public Landing"
        >
          <svg width={20} height={20} style={{ width: 20, height: 20 }} className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

