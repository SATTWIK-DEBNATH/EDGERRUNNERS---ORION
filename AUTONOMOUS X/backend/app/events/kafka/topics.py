"""Kafka topic constants for AUTONOMOUS X v3.0."""

# Orders
ORDERS_NEW = "ax.orders.new"
ORDERS_UPDATED = "ax.orders.updated"

# Vehicles
VEHICLES_POSITION = "ax.vehicles.position"
VEHICLES_STATUS = "ax.vehicles.status"

# Warehouses & Inventory
WAREHOUSES_STATUS = "ax.warehouses.status"
INVENTORY_UPDATED = "ax.inventory.updated"

# Incidents & Recovery
INCIDENTS_CREATED = "ax.incidents.created"
INCIDENTS_CORRELATED = "ax.incidents.correlated"
INCIDENTS_RESOLVED = "ax.incidents.resolved"

# Routes & Deliveries
ROUTES_ASSIGNED = "ax.routes.assigned"
ROUTES_UPDATED = "ax.routes.updated"
DELIVERIES_COMPLETED = "ax.deliveries.completed"

# Agents
AGENTS_DECISIONS = "ax.agents.decisions"

# Intelligence & Telemetry
FORECASTS_UPDATED = "ax.forecasts.updated"
H3_HEATMAPS = "ax.h3.heatmaps"
METRICS_SNAPSHOTS = "ax.metrics.snapshots"

# Dead Letter Queue
DLQ = "ax.dlq"

ALL_TOPICS: tuple[str, ...] = (
    ORDERS_NEW,
    ORDERS_UPDATED,
    VEHICLES_POSITION,
    VEHICLES_STATUS,
    WAREHOUSES_STATUS,
    INVENTORY_UPDATED,
    INCIDENTS_CREATED,
    INCIDENTS_CORRELATED,
    INCIDENTS_RESOLVED,
    ROUTES_ASSIGNED,
    ROUTES_UPDATED,
    DELIVERIES_COMPLETED,
    AGENTS_DECISIONS,
    FORECASTS_UPDATED,
    H3_HEATMAPS,
    METRICS_SNAPSHOTS,
    DLQ,
)

