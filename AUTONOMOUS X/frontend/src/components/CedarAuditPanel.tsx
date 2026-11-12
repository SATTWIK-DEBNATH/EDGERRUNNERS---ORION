import { useEffect, useState } from 'react'
import { getCedarAudit } from '../api'
import type { CedarAuditRecord } from '../types'

export default function CedarAuditPanel() {
  const [records, setRecords] = useState<CedarAuditRecord[]>([])

  useEffect(() => {
    let alive = true
    const fetchAudit = () => {
      getCedarAudit()
        .then((data) => {
          if (alive) setRecords(data.slice(-8).reverse())
        })
        .catch(() => {})
    }

    fetchAudit()
    const timer = window.setInterval(fetchAudit, 4000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  return (
    <article className="panel cedar-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ZERO-TRUST · AWS CEDAR SMT</span>
          <h2>Policy Enforcement Audit (PEP)</h2>
        </div>
        <span className="cedar-latency-badge">
          Sub-Microsecond Engine
        </span>
      </div>

      <div className="cedar-records-list">
        {records.length ? (
          records.map((rec, idx) => (
            <div key={`${rec.timestamp}-${idx}`} className={`cedar-row ${rec.decision.toLowerCase()}`}>
              <div className="cedar-row-top">
                <span className={`cedar-tag ${rec.decision.toLowerCase()}`}>
                  {rec.decision}
                </span>
                <span className="cedar-principal">{rec.principal}</span>
                <span className="cedar-action">→ {rec.action.replace('Action::', '')}</span>
                <span className="cedar-latency">{rec.latency_us.toFixed(1)} µs</span>
              </div>
              <div className="cedar-row-foot">
                <small className="cedar-policy">{rec.policy || 'default_policy'}</small>
                <small className="cedar-time">{new Date(rec.timestamp).toLocaleTimeString()}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="chart-empty">Cedar audit trail will update as agent operations execute.</div>
        )}
      </div>
    </article>
  )
}

