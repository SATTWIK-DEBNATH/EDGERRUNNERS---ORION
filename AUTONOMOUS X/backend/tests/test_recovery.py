import unittest

from app.agents.coordinator import CoordinatorAgent
from app.domain.models import DeliveryLocation, Order, Scenario, Vehicle, Warehouse
from app.domain.models import OrderStatus
from app.domain.incidents import Incident, IncidentKind
from app.events.bus import EventBus
from app.graph.road_graph import RoadEdge, RoadGraph
from app.recovery.recovery_engine import RecoveryEngine, RouteStabilityPolicy


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.0, 77.02), "d": (12.01, 77.01)},
            [
                RoadEdge("a", "b", 100, 10),
                RoadEdge("b", "a", 100, 10),
                RoadEdge("b", "c", 100, 10),
                RoadEdge("c", "b", 100, 10),
                RoadEdge("a", "c", 500, 50),
                RoadEdge("c", "a", 500, 50),
                RoadEdge("a", "d", 120, 12),
                RoadEdge("d", "c", 120, 12),
            ],
            source="recovery_test_graph",
        )

    def scenario(self, vehicle_count=2, warehouse_count=2):
        warehouses = (
            Warehouse("wh-1", "Hub A", 12.0, 77.0, {"parcel": 5}),
            Warehouse("wh-2", "Hub B", 12.0, 77.01, {"parcel": 5}),
        )[:warehouse_count]
        vehicles = tuple(
            Vehicle(f"veh-{index+1}", 20, 12.0, 77.0) for index in range(vehicle_count)
        )
        locations = (DeliveryLocation("loc-1", 12.0, 77.02),)
        orders = (Order("ord-1", "loc-1", "parcel", 1, 2),)
        return Scenario(1, warehouses, vehicles, locations, orders)

    def engine_for(self, scenario):
        bus = EventBus()
        return RecoveryEngine(scenario, self.graph, CoordinatorAgent(self.graph, bus), bus)

    def assign_initial(self, scenario):
        result = CoordinatorAgent(self.graph).assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles,
            {location.id: location for location in scenario.locations}, "run-1"
        )
        self.assertTrue(result.assigned)
        return result

    def test_breakdown_reassigns_unfinished_order_to_other_vehicle(self):
        scenario = self.scenario(vehicle_count=2, warehouse_count=1)
        self.assign_initial(scenario)
        recovery = self.engine_for(scenario)
        action = recovery.vehicle_breakdown("veh-1", "run-1")
        self.assertEqual(action.incident.kind, IncidentKind.VEHICLE_BREAKDOWN)
        self.assertFalse(scenario.vehicles[0].available)
        self.assertEqual(scenario.orders[0].vehicle_id, "veh-2")
        self.assertEqual(scenario.orders[0].status.value, "assigned")
        self.assertEqual(scenario.vehicles[0].load_kg, 0)

    def test_warehouse_outage_reallocates_order(self):
        scenario = self.scenario(vehicle_count=1, warehouse_count=2)
        self.assign_initial(scenario)
        recovery = self.engine_for(scenario)
        action = recovery.warehouse_outage("wh-1", "run-1")
        self.assertEqual(action.incident.kind, IncidentKind.WAREHOUSE_OUTAGE)
        self.assertFalse(scenario.warehouses[0].available)
        self.assertEqual(scenario.orders[0].warehouse_id, "wh-2")
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 5)

    def test_road_closure_recalculates_affected_path(self):
        scenario = self.scenario(vehicle_count=1, warehouse_count=1)
        self.assign_initial(scenario)
        recovery = self.engine_for(scenario)
        action = recovery.road_closure("a", "b", "run-1")
        self.assertEqual(action.incident.kind, IncidentKind.ROAD_CLOSURE)
        self.assertIn("ord-1", action.affected_order_ids)
        new_path = recovery.latest_paths["ord-1"]
        self.assertNotIn(("a", "b"), tuple(zip(new_path.node_ids, new_path.node_ids[1:])))

    def test_route_stability_threshold_and_force(self):
        policy = RouteStabilityPolicy(minimum_improvement_ratio=0.1, freeze_next_stop=True)
        self.assertFalse(policy.should_reoptimize(100, 95))
        self.assertTrue(policy.should_reoptimize(100, 80))
        self.assertFalse(policy.should_reoptimize(100, 50, frozen=True))
        self.assertTrue(policy.should_reoptimize(100, 100, force=True))

    def test_road_incident_requires_a_directed_edge(self):
        with self.assertRaises(ValueError):
            Incident("i-1", IncidentKind.ROAD_CLOSURE, "run-1", 0)

    def test_breakdown_reassigns_only_unfinished_orders(self):
        scenario = self.scenario(vehicle_count=2, warehouse_count=1)
        first = self.assign_initial(scenario)
        self.assertTrue(first.assigned)
        delivered = scenario.orders[0]
        delivered.transition_to(OrderStatus.IN_TRANSIT)
        delivered.transition_to(OrderStatus.DELIVERED)
        scenario.vehicles[0].load_kg = 0
        pending = Order("ord-2", "loc-1", "parcel", 1, 2)
        scenario.warehouses[0].reserve("parcel", 1)
        scenario.vehicles[0].load_kg = 2
        pending.warehouse_id = "wh-1"
        pending.vehicle_id = "veh-1"
        pending.transition_to(OrderStatus.ASSIGNED)
        scenario = Scenario(
            scenario.seed,
            scenario.warehouses,
            scenario.vehicles,
            scenario.locations,
            (*scenario.orders, pending),
        )
        action = self.engine_for(scenario).vehicle_breakdown("veh-1", "run-1")
        self.assertEqual(action.affected_order_ids, ("ord-2",))
        self.assertEqual(delivered.status, OrderStatus.DELIVERED)

    def test_failed_recovery_preserves_stock_and_capacity_invariants(self):
        scenario = self.scenario(vehicle_count=1, warehouse_count=1)
        self.assign_initial(scenario)
        action = self.engine_for(scenario).vehicle_breakdown("veh-1", "run-1")
        self.assertEqual(action.unresolved_order_ids, ("ord-1",))
        self.assertEqual(scenario.orders[0].status, OrderStatus.PENDING)
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 5)
        self.assertEqual(scenario.vehicles[0].load_kg, 0)

    def test_traffic_slowdown_uses_stability_threshold(self):
        scenario = self.scenario(vehicle_count=1, warehouse_count=1)
        self.assign_initial(scenario)
        recovery = self.engine_for(scenario)
        small_change = recovery.traffic_slowdown("a", "b", 1.5, "run-1")
        self.assertEqual(small_change.route_updates, ())
        larger_change = recovery.traffic_slowdown("b", "c", 4, "run-1")
        self.assertIn("ord-1", larger_change.route_updates)

    def test_urgent_order_is_inserted_through_coordinator(self):
        scenario = self.scenario(vehicle_count=2, warehouse_count=2)
        urgent = Order("urgent-1", "loc-1", "parcel", 1, 2, priority=5)
        action = self.engine_for(scenario).insert_urgent_order(urgent, "run-1")
        self.assertIn("urgent-1", action.reassigned_order_ids)
        self.assertTrue(action.assignment_results[0].assigned)
        self.assertEqual(urgent.priority, 5)
        self.assertEqual(urgent.status.value, "assigned")


if __name__ == "__main__":
    unittest.main()
