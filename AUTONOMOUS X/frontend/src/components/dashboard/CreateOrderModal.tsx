import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Overview } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  overview: Overview | null
  onSubmit: (data: {
    location_id: string
    item_id: string
    quantity: number
    weight_kg: number
    priority: number
    urgent: boolean
  }) => Promise<void>
}

export default function CreateOrderModal({ isOpen, onClose, overview, onSubmit }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const locations = overview?.locations ?? []

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    try {
      await onSubmit({
        location_id: String(form.get('location_id') || (locations[0]?.id ?? 'loc_1')),
        item_id: String(form.get('item_id') || 'parcel'),
        quantity: Number(form.get('quantity') || 1),
        weight_kg: Number(form.get('weight_kg') || 2.5),
        priority: Number(form.get('priority') || 3),
        urgent: form.get('urgent') === 'on',
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-blue-500/20">
              +
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Create New Dispatch Order</h3>
              <p className="text-xs text-slate-500">Fast autonomous assignment via Flink CEP & Timefold solver</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Delivery Destination Location
            </label>
            <select
              name="location_id"
              required
              defaultValue={locations[0]?.id ?? ''}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              {locations.length > 0 ? (
                locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.id} — Destination Node
                  </option>
                ))
              ) : (
                <option value="loc_1">loc_1 — Default Sector</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Product Category
              </label>
              <select
                name="item_id"
                defaultValue="parcel"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="parcel">Parcel / Standard Box</option>
                <option value="grocery">Grocery & Perishables</option>
                <option value="medical">Medical / Cold Chain</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantity (Units)
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                defaultValue="1"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Total Weight (kg)
              </label>
              <input
                type="number"
                name="weight_kg"
                min="0.1"
                step="0.1"
                defaultValue="2.5"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Priority Tier
              </label>
              <select
                name="priority"
                defaultValue="3"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="1">Tier 1 · Economy / Low</option>
                <option value="3">Tier 2 · Standard Fastline</option>
                <option value="5">Tier 3 · High Priority / Critical</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                name="urgent"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Mark as urgent dispatch (triggers autonomous recovery agent reroute)
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm shadow-blue-500/30 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Dispatching…</span>
                </>
              ) : (
                'Create & Dispatch'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

