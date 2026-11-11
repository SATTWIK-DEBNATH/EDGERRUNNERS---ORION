"""Command-line entry points for local demonstrations."""

import argparse
import json
import os

from app.graph.osm_loader import load_road_graph
from app.graph.travel_matrix import GraphLocation, TravelMatrixBuilder
from app.agents.coordinator import CoordinatorAgent
from app.optimization.baseline import greedy_baseline
from app.optimization.execution import optimize_initial_execution
from app.optimization.ortools_solver import OrToolsRoutingSolver
from app.optimization.problem_builder import build_routing_input
from app.events.bus import EventBus
from app.recovery.recovery_engine import RecoveryEngine
from app.simulation.engine import SimulationEngine
from app.simulation.scenario import generate_scenario


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="autonomous-x")
    commands = parser.add_subparsers(dest="command", required=True)
    demo = commands.add_parser("demo", help="run a deterministic local logistics simulation")
    demo.add_argument("--seed", type=int, default=7)
    demo.add_argument("--warehouses", type=int, default=3)
    demo.add_argument("--vehicles", type=int, default=10)
    demo.add_argument("--orders", type=int, default=20)
    demo.add_argument("--osm", action="store_true", help="download and cache a small OSM road graph")
    demo.add_argument("--graph-cache", default="data/cache/bengaluru.graphml")
    demo.add_argument(
        "--route-strategy", choices=("baseline", "ortools"),
        default=os.getenv("ROUTE_OPTIMIZATION_STRATEGY", "baseline"),
        help="initial assignment strategy (defaults to ROUTE_OPTIMIZATION_STRATEGY or baseline)",
    )
    args = parser.parse_args(argv)

    scenario = generate_scenario(args.seed, args.warehouses, args.vehicles, args.orders)
    graph = load_road_graph(cache_path=args.graph_cache, enable_download=args.osm)
    matrix_locations = tuple(
        [GraphLocation(w.id, w.latitude, w.longitude) for w in scenario.warehouses]
        + [GraphLocation(location.id, location.latitude, location.longitude) for location in scenario.locations]
    )
    travel_matrix = TravelMatrixBuilder().build(graph, matrix_locations)
    problem = build_routing_input(scenario, travel_matrix)
    optimized = OrToolsRoutingSolver().solve(problem)
    baseline = greedy_baseline(problem)
    event_bus = EventBus()
    coordinator = CoordinatorAgent(graph, event_bus)
    assignment_results = tuple(
        coordinator.assign_order(
            order,
            scenario.warehouses,
            scenario.vehicles,
            {location.id: location for location in scenario.locations},
            simulation_run_id=f"seed-{scenario.seed}",
        )
        for order in scenario.orders
    )
    agent_assignment_events = event_bus.drain()
    initial_routes = None
    actual_strategy = "baseline"
    strategy_reason = None
    if args.route_strategy == "ortools":
        try:
            initial_routes = optimize_initial_execution(scenario, graph, OrToolsRoutingSolver())
            actual_strategy = "ortools"
        except Exception as error:
            actual_strategy = "baseline_fallback"
            strategy_reason = f"{type(error).__name__}: {error}"
    recovery = RecoveryEngine(scenario, graph, coordinator, event_bus)
    simulation = SimulationEngine(
        scenario, road_graph=graph, initial_routes=initial_routes,
        route_strategy=actual_strategy, route_strategy_reason=strategy_reason,
    )
    incident_scheduled = False
    for order in scenario.orders:
        if order.status.value != "assigned":
            continue
        warehouse = next((item for item in scenario.warehouses if item.id == order.warehouse_id), None)
        vehicle = next((item for item in scenario.vehicles if item.id == order.vehicle_id), None)
        location = next((item for item in scenario.locations if item.id == order.location_id), None)
        if warehouse is None or vehicle is None or location is None:
            continue
        leg_to_warehouse = graph.shortest_path(
            (vehicle.latitude, vehicle.longitude), (warehouse.latitude, warehouse.longitude)
        )
        delivery_path = graph.shortest_path(
            (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
        )
        if leg_to_warehouse is None or delivery_path is None or len(delivery_path.node_ids) < 2:
            continue
        edge_start, edge_end = delivery_path.node_ids[0], delivery_path.node_ids[1]
        edge_time = graph.graph.edges[edge_start, edge_end]["travel_time_s"]
        incident_at = leg_to_warehouse.travel_time_s + delivery_path.start_access_time_s + edge_time / 2
        simulation.schedule_incident(
            incident_at,
            lambda start=edge_start, end=edge_end: recovery.road_closure(
                start, end, f"seed-{scenario.seed}", simulation.now
            ),
        )
        incident_scheduled = True
        break
    result = simulation.run()
    recovery_bus_events = event_bus.drain()
    print(
        json.dumps(
            {
                "seed": scenario.seed,
                "orders_created": len(scenario.orders),
                "orders_delivered": len(result.delivered_order_ids),
                "orders_unfulfilled": len(result.unfulfilled_order_ids),
                "simulated_time_s": round(result.simulated_time_s, 2),
                "events_emitted": len(result.events),
                "routing_source": result.routing_source,
                "route_strategy": result.route_strategy,
                "route_strategy_reason": result.route_strategy_reason,
                "unfulfilled_order_ids": result.unfulfilled_order_ids,
                "road_graph_source": graph.source,
                "road_graph_fallback_reason": graph.fallback_reason,
                "agent_assignment_events": agent_assignment_events,
                "incident_scheduled": incident_scheduled,
                "recovery_bus_events": recovery_bus_events,
                "incident_events": sum(event.event_type == "IncidentApplied" for event in result.events),
                "recovery_events": sum(event.event_type == "RecoveryCommitted" for event in result.events),
                "agent_assignments": [
                    {
                        "order_id": assignment.order_id,
                        "assigned": assignment.assigned,
                        "warehouse_id": assignment.warehouse_id,
                        "vehicle_id": assignment.vehicle_id,
                        "reason": assignment.reason,
                        "decisions": [
                            {
                                "agent": decision.agent_name,
                                "accepted": decision.accepted,
                                "reason": decision.reason,
                            }
                            for decision in assignment.decisions
                        ],
                    }
                    for assignment in assignment_results
                ],
                "optimizer": {
                    "solver": "Google OR-Tools",
                    "status": optimized.solver_status,
                    "feasible": optimized.feasible,
                    "runtime_ms": optimized.runtime_ms,
                    "objective_value": optimized.objective_value,
                    "assigned_orders": len(optimized.assigned_order_ids),
                    "unassigned_order_ids": optimized.unassigned_order_ids,
                    "estimated_route_time_s": sum(route.total_time_s for route in optimized.routes),
                    "vehicle_routes": [
                        {
                            "vehicle_index": route.vehicle_index,
                            "order_ids": route.order_ids,
                            "node_indices": route.node_indices,
                            "estimated_time_s": route.total_time_s,
                            "load_units": route.total_load,
                        }
                        for route in optimized.routes
                    ],
                },
                "baseline": {
                    "strategy": "greedy_append_to_lowest_incremental_time",
                    "assigned_orders": len(baseline.assignments),
                    "unassigned_order_ids": baseline.unassigned_order_ids,
                    "estimated_route_time_s": baseline.total_time_s,
                    "assignments": baseline.assignments,
                },
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
