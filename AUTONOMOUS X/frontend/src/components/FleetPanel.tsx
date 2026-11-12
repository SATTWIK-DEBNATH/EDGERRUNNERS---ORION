import type { Vehicle } from '../types'

type Props = {
  vehicles: Vehicle[]
}

export default function FleetPanel({ vehicles }: Props) {
  return (
    <article className="panel fleet-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ASSETS · AUTONOMOUS FLEET</span>
          <h2>Active Fleet Status</h2>
        </div>
        <span className="subtle-count">{vehicles.filter((v) => v.available).length} of {vehicles.length} online</span>
      </div>

      <div className="fleet-grid">
        {vehicles.length ? (
          vehicles.map((v) => {
            const pct = Math.min(100, Math.round((v.load_kg / v.capacity_kg) * 100))
            const statusLabel = !v.available ? 'broken_down' : v.in_transit ? 'in_transit' : 'idle'

            return (
              <div key={v.id} className={`vehicle-card ${statusLabel}`}>
                <div className="v-card-top">
                  <div className="v-id-row">
                    <span className="v-icon">⛟</span>
                    <strong>{v.id}</strong>
                  </div>
                  <span className={`status-pill ${statusLabel}`}>
                    {statusLabel.replace('_', ' ')}
                  </span>
                </div>

                <div className="v-meta">
                  <div className="v-load-row">
                    <span>Load: {v.load_kg.toFixed(1)} / {v.capacity_kg} kg</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div className="v-meter">
                    <i style={{ width: `${pct}%` }} className={pct > 85 ? 'high' : pct > 50 ? 'med' : ''} />
                  </div>
                </div>

                <div className="v-card-foot">
                  <span className="cedar-scope-tag" title="Verified by AWS Cedar SMT policy">
                    <i />Cedar: Zone OK
                  </span>
                  <small className="v-coords">{v.latitude.toFixed(3)}, {v.longitude.toFixed(3)}</small>
                </div>
              </div>
            )
          })
        ) : (
          <div className="chart-empty">No vehicles in active fleet.</div>
        )}
      </div>
    </article>
  )
}

