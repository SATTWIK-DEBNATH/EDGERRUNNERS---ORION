import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts'
import { request } from '../api'
import type { Overview } from '../types'

type Forecast = { source: string; seed: number; test_periods: number; baseline_mae: number; baseline_rmse: number; random_forest_mae: number; random_forest_rmse: number }
type RLResult = { episode_count: number; accepted_recommendations: number; rejected_recommendations: number; policy_mean_cost_on_accepted: number; baseline_mean_cost_same_episodes: number }
type Props = { overview: Overview; comparison: Record<string, number | string> | null; rlResult: RLResult | null; rlBusy: boolean }

export default function Analytics({ overview, comparison, rlResult, rlBusy }: Props) {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [forecastError, setForecastError] = useState('')
  useEffect(() => {
    if (!overview.simulation) return
    request<Forecast>(`/api/forecasts?simulation_id=${encodeURIComponent(overview.simulation.id)}`)
      .then(setForecast).catch((error: unknown) => setForecastError(error instanceof Error ? error.message : 'Forecast unavailable'))
  }, [overview.simulation?.id])
  const delivered = overview.delivery_timeline.filter((event) => event.event === 'DeliveryCompleted').map((event, index) => ({
    minute: Math.round(event.time_s / 60), delivered: index + 1,
  }))
  return <section className="analytics-grid">
    <article className="panel chart-panel">
      <div className="panel-heading"><div><span className="eyebrow">THROUGHPUT</span><h3>Completed deliveries</h3></div><span className="chart-unit">orders / sim time</span></div>
      {delivered.length ? <div className="chart"><ResponsiveContainer width="100%" height={100}><LineChart data={delivered}><CartesianGrid stroke="#27302a" vertical={false} /><XAxis dataKey="minute" tick={{ fill: '#87928b', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#87928b', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#151b17', border: '1px solid #313b33', borderRadius: 10 }} /><Line type="monotone" dataKey="delivered" stroke="#62d6a5" strokeWidth={2.5} dot={{ r: 3, fill: '#62d6a5' }} /></LineChart></ResponsiveContainer></div> : <div className="chart-empty">Delivery events will appear here as the simulation advances.</div>}
    </article>
    <article className="panel chart-panel">
      <div className="panel-heading"><div><span className="eyebrow">NETWORK BALANCE</span><h3>Warehouse workload</h3></div></div>
      {overview.metrics.warehouse_workload.length ? <div className="chart"><ResponsiveContainer width="100%" height={100}><BarChart data={overview.metrics.warehouse_workload} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="#27302a" vertical={false} /><XAxis dataKey="warehouse_id" tick={{ fill: '#87928b', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#87928b', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#151b17', border: '1px solid #313b33', borderRadius: 10 }} /><Bar dataKey="orders" fill="#e6b65d" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="chart-empty">No warehouse data yet.</div>}
    </article>
    <article className="panel comparison-panel">
      <div className="panel-heading"><div><span className="eyebrow">SAME SEEDED SCENARIO</span><h3>Baseline vs optimizer</h3></div><button className="quiet-button" onClick={() => window.dispatchEvent(new Event('run-optimization'))}>Run comparison</button></div>
      {comparison ? <div className="comparison-values">
        <div><span>OR-Tools</span><strong>{String(comparison.optimized_assigned ?? 0)} orders</strong><small>{Math.round(Number(comparison.optimized_time_s ?? 0) / 60)} min · {String(comparison.solver ?? 'not run')}</small></div>
        <div><span>Greedy baseline</span><strong>{String(comparison.baseline_assigned ?? 0)} orders</strong><small>{Math.round(Number(comparison.baseline_time_s ?? 0) / 60)} min</small></div>
      </div> : <div className="chart-empty">Run the comparison to calculate actual solver and baseline results.</div>}
    </article>
    <article className="panel chart-panel forecast-panel">
      <div className="panel-heading"><div><span className="eyebrow">DEMAND FORECAST</span><h3>Holdout error</h3></div><span className="chart-unit">MAE / RMSE</span></div>
      {forecast ? <><div className="forecast-summary">{forecast.test_periods} future periods · {forecast.source.replaceAll('_', ' ')}</div><div className="chart"><ResponsiveContainer width="100%" height={120}><BarChart data={[{ model: 'Moving avg', MAE: forecast.baseline_mae, RMSE: forecast.baseline_rmse }, { model: 'Random forest', MAE: forecast.random_forest_mae, RMSE: forecast.random_forest_rmse }]}><CartesianGrid stroke="#27302a" vertical={false} /><XAxis dataKey="model" tick={{ fill: '#87928b', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#87928b', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#151b17', border: '1px solid #313b33', borderRadius: 10 }} /><Bar dataKey="MAE" fill="#62d6a5" radius={[4, 4, 0, 0]} /><Bar dataKey="RMSE" fill="#73c7f7" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></> : <div className="chart-empty">{forecastError || 'Forecast evaluation is loading…'}</div>}
    </article>
    <article className="panel comparison-panel rl-panel">
      <div className="panel-heading"><div><span className="eyebrow">WAREHOUSE POLICY</span><h3>CPU PPO experiment</h3></div><button className="quiet-button" disabled={rlBusy} onClick={() => window.dispatchEvent(new Event('run-rl'))}>{rlBusy ? 'Training…' : 'Train + evaluate'}</button></div>
      {rlResult ? <div className="rl-result"><div><span>Feasible recommendations</span><strong>{rlResult.accepted_recommendations}/{rlResult.episode_count}</strong></div><div><span>Rejected proposals</span><strong>{rlResult.rejected_recommendations}</strong></div><div><span>Cost: policy / baseline</span><strong>{rlResult.policy_mean_cost_on_accepted.toFixed(1)} / {rlResult.baseline_mean_cost_same_episodes.toFixed(1)}</strong></div></div> : <div className="chart-empty">Train to compare policy recommendations with the feasible greedy baseline.</div>}
      <small className="rl-note">Recommendations remain subject to deterministic stock and capacity checks.</small>
    </article>
    <article className="panel analytics-metric"><span className="eyebrow">FLEET UTILIZATION</span><strong>{Math.round(overview.metrics.fleet_utilization * 100)}%</strong><div className="meter"><i style={{ width: `${Math.min(100, overview.metrics.fleet_utilization * 100)}%` }} /></div><small>Current load / total vehicle capacity</small></article>
  </section>
}
