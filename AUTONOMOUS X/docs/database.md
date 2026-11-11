# Database Design

The production persistence adapter is Supabase PostgreSQL with PostGIS. Local simulation and unit tests can use in-memory repositories implementing the same repository interfaces. A graph file or intermediate shortest-path matrix is never stored as relational rows.

## Tables

The initial schema covers `simulation_runs`, `warehouses`, `inventory_items`, `warehouse_inventory`, `vehicles`, `delivery_locations`, `orders`, `order_items`, `routes`, `route_stops`, `incidents`, `simulation_events`, `optimization_runs`, `agent_decisions`, `demand_forecasts`, and `metrics_snapshots`.

Operational records are scoped to a run. User-owned runs carry an owner identity for RLS. Inventory rows have a unique `(warehouse_id, item_id)` key and nonnegative quantity checks. Vehicle capacities are positive. Order and vehicle statuses use constrained values. Foreign keys protect all operational references. A partial unique index prevents an order from appearing in more than one active route. Spatial columns use PostGIS geography/geometry with GiST indexes where spatial lookups are needed.

## Consistency rules

- Reserve/release stock in the same transaction as assignment state changes.
- Lock inventory rows or use a safe database function for concurrent reservations.
- Only commit routes after capacity, stock, availability and route constraints pass deterministic validation.
- Use idempotency keys for order creation and simulation event handling.
- Keep service-role credentials in backend-only environment variables; never expose them to frontend code.
- Enable RLS on user-owned data and scope policies by authenticated owner. Local synthetic mode does not require Supabase credentials.

## Planned migrations

M1 introduces the normalized operational tables and indexes. Later milestones add fields only when their behavior is implemented. Seed/reset scripts use explicit synthetic fixtures and do not mutate remote data unless the user configures a database URL and runs the documented command.
