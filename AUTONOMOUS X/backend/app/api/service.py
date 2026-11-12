"""In-memory application service shared by the local API routes."""

from dataclasses import dataclass, field
from uuid import uuid4
import os

from app.agents.coordinator import CoordinatorAgent
from app.domain.models import DeliveryLocation, Order, OrderStatus, Scenario
from app.events.bus import EventBus
from app.graph.osm_loader import create_synthetic_bengaluru_graph
from app.graph.travel_matrix import GraphLocation, TravelMatrixBuilder
from app.optimization.baseline import greedy_baseline
from app.optimization.execution import optimize_initial_execution
from app.optimization.ortools_solver import OrToolsRoutingSolver
from app.optimization.problem_builder import build_routing_input
from app.recovery.recovery_engine import RecoveryEngine
from app.simulation.engine import SimulationEngine
from app.simulation.scenario import generate_scenario


@dataclass
class SimulationSession:
    id: str
    seed: int
    warehouse_count: int
    vehicle_count: int
    order_count: int
    scenario: Scenario
    graph: object
    event_bus: EventBus
    coordinator: CoordinatorAgent
    recovery: RecoveryEngine
    engine: SimulationEngine
    status: str = "created"
    assignment_results: list = field(default_factory=list)
    incidents: list[dict] = field(default_factory=list)


class LogisticsService:
    def __init__(self, route_strategy: str | None = None, route_optimizer=None) -> None:
        configured_strategy = (
            route_strategy if route_strategy is not None
            else os.getenv("ROUTE_OPTIMIZATION_STRATEGY", "baseline")
        )
        if configured_strategy not in {"baseline", "ortools"}:
            raise ValueError("route strategy must be 'baseline' or 'ortools'")
        self.route_strategy = configured_strategy
        self.route_optimizer = route_optimizer if route_optimizer is not None else OrToolsRoutingSolver()
        self.sessions: dict[str, SimulationSession] = {}
        self.active_simulation_id: str | None = None
        self._policy = None
        self._policy_evaluation: dict | None = None

    def create_simulation(self, seed: int, warehouse_count: int, vehicle_count: int, order_count: int, simulation_id: str | None = None) -> SimulationSession:
        identifier = simulation_id or f"sim-{uuid4().hex[:12]}"
        scenario = generate_scenario(seed, warehouse_count, vehicle_count, order_count)
        graph = create_synthetic_bengaluru_graph()
        event_bus = EventBus()
        coordinator = CoordinatorAgent(graph, event_bus)
        locations = {location.id: location for location in scenario.locations}
        assignments = [
            coordinator.assign_order(order, scenario.warehouses, scenario.vehicles, locations, identifier)
            for order in scenario.orders
        ]
        event_bus.drain()
        initial_routes = None
        actual_strategy = "baseline"
        strategy_reason = None
        if self.route_strategy == "ortools":
            try:
                initial_routes = optimize_initial_execution(scenario, graph, self.route_optimizer)
                actual_strategy = "ortools"
            except Exception as error:
                # The coordinator has already made valid, stock-reserved assignments; retain them.
                initial_routes = None
                actual_strategy = "baseline_fallback"
                strategy_reason = f"{type(error).__name__}: {error}"
        recovery = RecoveryEngine(scenario, graph, coordinator, event_bus)
        engine = SimulationEngine(
            scenario,
            road_graph=graph,
            initial_routes=initial_routes,
            route_strategy=actual_strategy,
            route_strategy_reason=strategy_reason,
        )
        session = SimulationSession(
            identifier, seed, warehouse_count, vehicle_count, order_count, scenario, graph, event_bus,
            coordinator, recovery, engine, assignment_results=assignments,
        )
        self.sessions[identifier] = session
        self.active_simulation_id = identifier
        return session

    def get_session(self, simulation_id: str | None = None) -> SimulationSession | None:
        identifier = simulation_id or self.active_simulation_id
        return self.sessions.get(identifier) if identifier else None

    def require_session(self, simulation_id: str | None = None) -> SimulationSession:
        session = self.get_session(simulation_id)
        if session is None:
            raise KeyError(f"unknown simulation: {simulation_id or ''}")
        return session

    def reset(self, simulation_id: str) -> SimulationSession:
        current = self.require_session(simulation_id)
        return self.create_simulation(
            current.seed, current.warehouse_count, current.vehicle_count, current.order_count, simulation_id
        )

    def add_order(self, simulation_id: str, location_id: str, item_id: str, quantity: int, weight_kg: float, priority: int, urgent: bool) -> Order:
        session = self.require_session(simulation_id)
        locations = {location.id: location for location in session.scenario.locations}
        location = locations.get(location_id)
        if location is None:
            raise KeyError(f"unknown delivery location: {location_id}")
        order = Order(
            id=f"ord-api-{uuid4().hex[:10]}", location_id=location_id, item_id=item_id,
            quantity=quantity, weight_kg=weight_kg, priority=5 if urgent else priority,
        )
        if urgent:
            action = session.recovery.insert_urgent_order(order, session.id, session.engine.now)
            session.assignment_results.extend(action.assignment_results)
            session.incidents.append({
                "id": action.incident.id, "simulation_id": session.id, "kind": "urgent_order",
                "entity_id": order.id, "occurred_at_s": session.engine.now, "status": "applied",
                "affected_order_ids": list(action.affected_order_ids),
                "reassigned_order_ids": list(action.reassigned_order_ids),
                "unresolved_order_ids": list(action.unresolved_order_ids),
            })
        else:
            result = session.coordinator.assign_order(
                order, session.scenario.warehouses, session.scenario.vehicles, locations, session.id
            )
            session.assignment_results.append(result)
            session.recovery.additional_orders.append(order)
        session.engine.register_order(order)
        return order

    def add_incident(self, simulation_id: str, request) -> dict:
        session = self.require_session(simulation_id)
        kind = request.kind
        if kind in {"traffic", "road_closure"}:
            if not session.graph.graph.has_edge(request.start_node, request.end_node):
                raise KeyError(f"unknown directed road edge: {request.start_node}->{request.end_node}")
        elif kind == "vehicle_breakdown":
            if not any(vehicle.id == request.entity_id for vehicle in session.scenario.vehicles):
                raise KeyError(f"unknown vehicle: {request.entity_id}")
        elif kind == "warehouse_outage":
            if not any(warehouse.id == request.entity_id for warehouse in session.scenario.warehouses):
                raise KeyError(f"unknown warehouse: {request.entity_id}")

        incident_id = f"incident-{uuid4().hex[:10]}"
        record = {
            "id": incident_id, "simulation_id": session.id, "kind": kind,
            "entity_id": request.entity_id,
            "start_node": request.start_node, "end_node": request.end_node,
            "factor": request.factor if kind == "traffic" else None,
            "occurred_at_s": session.engine.now, "status": "scheduled",
        }
        session.incidents.append(record)
        def apply():
            if kind == "traffic":
                action = session.recovery.traffic_slowdown(request.start_node, request.end_node, request.factor, session.id, session.engine.now)
            elif kind == "road_closure":
                action = session.recovery.road_closure(request.start_node, request.end_node, session.id, session.engine.now)
            elif kind == "vehicle_breakdown":
                action = session.recovery.vehicle_breakdown(request.entity_id, session.id, session.engine.now)
            else:
                action = session.recovery.warehouse_outage(request.entity_id, session.id, session.engine.now)
            record["status"] = "applied"
            record["affected_order_ids"] = list(action.affected_order_ids)
            record["reassigned_order_ids"] = list(action.reassigned_order_ids)
            record["unresolved_order_ids"] = list(action.unresolved_order_ids)
            return action
        session.engine.schedule_incident(session.engine.now, apply)
        return record

    def start(self, simulation_id: str) -> SimulationSession:
        session = self.require_session(simulation_id)
        session.engine.start()
        session.status = "running"
        return session

    def advance(self, simulation_id: str, seconds: float) -> SimulationSession:
        session = self.require_session(simulation_id)
        if session.status not in {"running", "paused"}:
            raise ValueError("simulation must be running or paused to step")
        session.engine.advance(seconds)
        if session.engine._completed:
            session.status = "completed"
        return session

    def overview(self, simulation_id: str | None = None) -> dict:
        session = self.get_session(simulation_id)
        if session is None:
            return {
                "simulation": None, "orders": {"total": 0, "pending": 0, "assigned": 0, "in_transit": 0, "delivered": 0, "unfulfillable": 0, "fulfillment_rate": 0.0},
                "orders_list": [],
                "warehouses": [], "vehicles": [], "routes": [], "road_edges": [], "locations": [], "incidents": [],
                "agent_activity": [], "delivery_timeline": [], "metrics": {"fleet_utilization": 0.0, "warehouse_workload": []},
            }
        orders = (*session.scenario.orders, *session.recovery.additional_orders)
        counts = {status.value: sum(order.status == status for order in orders) for status in OrderStatus}
        delivered = counts[OrderStatus.DELIVERED.value]
        fulfillment = delivered / len(orders) if orders else 0.0
        locations = {location.id: location for location in session.scenario.locations}
        warehouses = {warehouse.id: warehouse for warehouse in session.scenario.warehouses}
        routes = []
        for order in orders:
            if not order.warehouse_id or order.location_id not in locations:
                continue
            warehouse = warehouses.get(order.warehouse_id)
            location = locations[order.location_id]
            if not warehouse:
                continue
            path = session.recovery.latest_paths.get(order.id) or session.graph.shortest_path(
                (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
            )
            node_points = []
            if path:
                for node_id in path.node_ids:
                    node = session.graph.graph.nodes[node_id]
                    node_points.append({"id": str(node_id), "latitude": node["latitude"], "longitude": node["longitude"]})
            routes.append({"order_id": order.id, "vehicle_id": order.vehicle_id, "warehouse_id": order.warehouse_id, "status": order.status.value, "coordinates": node_points})
        vehicles = [
            {"id": vehicle.id, "latitude": vehicle.latitude, "longitude": vehicle.longitude, "capacity_kg": vehicle.capacity_kg, "load_kg": vehicle.load_kg, "available": vehicle.available, "in_transit": vehicle.in_transit}
            for vehicle in session.scenario.vehicles
        ]
        wh_values = [
            {"id": warehouse.id, "name": warehouse.name, "latitude": warehouse.latitude, "longitude": warehouse.longitude, "available": warehouse.available, "inventory": warehouse.inventory,
             "assigned_orders": sum(order.warehouse_id == warehouse.id and order.status != OrderStatus.DELIVERED for order in orders)}
            for warehouse in session.scenario.warehouses
        ]
        road_edges = []
        for start, end, edge in session.graph.graph.edges(data=True):
            start_node, end_node = session.graph.graph.nodes[start], session.graph.graph.nodes[end]
            road_edges.append({
                "start": str(start), "end": str(end), "travel_time_s": edge["travel_time_s"], "closed": edge.get("closed", False),
                "start_latitude": start_node["latitude"], "start_longitude": start_node["longitude"],
                "end_latitude": end_node["latitude"], "end_longitude": end_node["longitude"],
            })
        timeline = []
        for event in session.engine.events:
            if event.event_type in {"DeliveryCompleted", "OrderAssigned", "OrderUnfulfilled", "IncidentApplied", "RecoveryCommitted"}:
                timeline.append({"time_s": event.time_s, "event": event.event_type, "order_id": event.order_id, "detail": event.detail})
        agent_activity = []
        for assignment in session.assignment_results:
            for decision in assignment.decisions:
                agent_activity.append({"order_id": assignment.order_id, "agent": decision.agent_name, "accepted": decision.accepted, "reason": decision.reason})
        utilization = sum(vehicle.load_kg / vehicle.capacity_kg for vehicle in session.scenario.vehicles) / len(session.scenario.vehicles) if session.scenario.vehicles else 0.0
        orders_list = [
            {
                "id": o.id, "location_id": o.location_id, "item_id": o.item_id,
                "quantity": o.quantity, "weight_kg": o.weight_kg, "priority": o.priority,
                "status": o.status.value, "warehouse_id": o.warehouse_id, "vehicle_id": o.vehicle_id,
            }
            for o in orders
        ]
        return {
            "simulation": {"id": session.id, "seed": session.seed, "status": session.status, "simulated_time_s": session.engine.now, "routing_source": session.graph.source, "route_strategy": session.engine.route_strategy, "route_strategy_reason": session.engine.route_strategy_reason},
            "orders": {"total": len(orders), "pending": counts["pending"], "assigned": counts["assigned"], "in_transit": counts["in_transit"], "delivered": delivered, "unfulfillable": counts["unfulfillable"], "fulfillment_rate": fulfillment},
            "orders_list": orders_list,
            "warehouses": wh_values, "vehicles": vehicles, "routes": routes, "road_edges": road_edges,
            "locations": [{"id": location.id, "latitude": location.latitude, "longitude": location.longitude} for location in locations.values()],
            "incidents": session.incidents, "agent_activity": agent_activity, "delivery_timeline": timeline,
            "metrics": {"fleet_utilization": utilization, "warehouse_workload": [{"warehouse_id": warehouse["id"], "orders": warehouse["assigned_orders"]} for warehouse in wh_values]},
        }

    def optimization_comparison(self, simulation_id: str) -> dict:
        session = self.require_session(simulation_id)
        matrix_locations = tuple(
            [GraphLocation(w.id, w.latitude, w.longitude) for w in session.scenario.warehouses]
            + [GraphLocation(location.id, location.latitude, location.longitude) for location in session.scenario.locations]
        )
        matrix = TravelMatrixBuilder().build(session.graph, matrix_locations)
        problem = build_routing_input(session.scenario, matrix)
        optimized = OrToolsRoutingSolver().solve(problem)
        baseline = greedy_baseline(problem)
        return {
            "solver": optimized.solver_status, "feasible": optimized.feasible, "runtime_ms": optimized.runtime_ms,
            "optimized_assigned": len(optimized.assigned_order_ids), "optimized_time_s": sum(route.total_time_s for route in optimized.routes),
            "baseline_assigned": len(baseline.assignments), "baseline_time_s": baseline.total_time_s,
            "unassigned_order_ids": optimized.unassigned_order_ids,
        }

    def integrations(self) -> dict[str, bool]:
        return {
            "supabase_realtime": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_PUBLISHABLE_KEY")),
            "ollama": os.getenv("ENABLE_LLM", "false").lower() == "true" and bool(os.getenv("OLLAMA_BASE_URL") and os.getenv("OLLAMA_MODEL")),
        }
