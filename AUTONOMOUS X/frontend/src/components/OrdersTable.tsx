import { useMemo, useState } from 'react'
import type { OrderItem } from '../types'

type Props = {
  orders?: OrderItem[]
}

export default function OrdersTable({ orders = [] }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.item_id.toLowerCase().includes(search.toLowerCase()) ||
        (order.warehouse_id && order.warehouse_id.toLowerCase().includes(search.toLowerCase())) ||
        (order.vehicle_id && order.vehicle_id.toLowerCase().includes(search.toLowerCase())) ||
        order.location_id.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === 'all' || order.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orders, search, statusFilter])

  return (
    <article className="panel orders-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ORDER INVENTORY · DISPATCH QUEUE</span>
          <h2>Live Orders Directory</h2>
        </div>
        <span className="subtle-count">{filtered.length} of {orders.length} orders</span>
      </div>

      <div className="orders-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Filter by Order, Product, Warehouse, Vehicle, Location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-chips">
          {['all', 'pending', 'assigned', 'in_transit', 'delivered', 'unfulfillable'].map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Item</th>
              <th>Qty / Weight</th>
              <th>Priority</th>
              <th>Destination</th>
              <th>Warehouse</th>
              <th>Vehicle</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((order) => (
                <tr key={order.id} className={`status-row-${order.status}`}>
                  <td className="id-col">{order.id}</td>
                  <td><span className="product-tag">{order.item_id}</span></td>
                  <td>{order.quantity} × {order.weight_kg} kg</td>
                  <td>
                    <span className={`priority-tag p-${order.priority}`}>
                      {order.priority >= 5 ? 'High' : order.priority >= 3 ? 'Standard' : 'Low'}
                    </span>
                  </td>
                  <td className="loc-col">{order.location_id}</td>
                  <td>{order.warehouse_id ?? '—'}</td>
                  <td>{order.vehicle_id ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${order.status}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="empty-cell">
                  {orders.length ? 'No orders match your filter criteria.' : 'No orders loaded yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  )
}

