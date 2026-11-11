import unittest

from app.agents.coordinator import CoordinatorAgent
from app.agents.demand_agent import DemandAgent
from app.agents.recovery_agent import RecoveryAgent
from app.domain.models import DeliveryLocation, Order, OrderStatus, Scenario, Vehicle, Warehouse
from app.graph.road_graph import RoadEdge, RoadGraph
from app.events.bus import EventBus


class AgentTests(unittest.TestCase):
    def setUp(self):
        self.graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.0, 77.02), "d": (12.1, 77.1)},
            [
                RoadEdge("a", "b", 100, 10),
                RoadEdge("b", "a", 100, 10),
                RoadEdge("b", "c", 100, 10),
                RoadEdge("c", "b", 100, 10),
            ],
            source="test_graph",
        )

    def scenario(self, stock=2, capacity=10, location=(12.0, 77.01)):
        return Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": stock}),),
            vehicles=(Vehicle("veh-1", capacity, 12.0, 77.0),),
            locations=(DeliveryLocation("loc-1", *location),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )

    def test_coordinator_assigns_new_order_through_agents(self):
        scenario = self.scenario()
        bus = EventBus()
        emitted = []
        bus.subscribe("OrderAssigned", emitted.append)
        result = CoordinatorAgent(self.graph, bus).assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, {"loc-1": scenario.locations[0]}, "run-1"
        )
        self.assertTrue(result.assigned)
        self.assertEqual(scenario.orders[0].warehouse_id, "wh-1")
        self.assertEqual(scenario.orders[0].vehicle_id, "veh-1")
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 1)
        self.assertEqual(scenario.vehicles[0].load_kg, 2)
        self.assertEqual({decision.agent_name for decision in result.decisions}, {"warehouse", "fleet", "routing", "demand", "coordinator"})
        self.assertEqual(bus.drain(), 1)
        self.assertEqual(len(emitted), 1)

    def test_coordinator_rejects_no_stock_without_mutation(self):
        scenario = self.scenario(stock=0)
        result = CoordinatorAgent(self.graph).assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, {"loc-1": scenario.locations[0]}, "run-1"
        )
        self.assertFalse(result.assigned)
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 0)
        self.assertEqual(scenario.orders[0].status.value, "pending")

    def test_coordinator_rejects_no_vehicle_capacity(self):
        scenario = self.scenario(capacity=1)
        result = CoordinatorAgent(self.graph).assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, {"loc-1": scenario.locations[0]}, "run-1"
        )
        self.assertFalse(result.assigned)
        self.assertEqual(scenario.vehicles[0].load_kg, 0)
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 2)

    def test_coordinator_rejects_unreachable_route(self):
        scenario = self.scenario(location=(12.1, 77.1))
        result = CoordinatorAgent(self.graph).assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, {"loc-1": scenario.locations[0]}, "run-1"
        )
        self.assertFalse(result.assigned)
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 2)

    def test_coordinator_rolls_back_if_event_queue_is_full(self):
        scenario = self.scenario()
        bus = EventBus(max_pending=1)
        from app.events.contracts import LogisticsEvent
        bus.publish(LogisticsEvent("occupied", "OtherEvent", "run-1", 0, {}))
        result = CoordinatorAgent(self.graph, bus).assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, {"loc-1": scenario.locations[0]}, "run-1"
        )
        self.assertFalse(result.assigned)
        self.assertEqual(scenario.orders[0].status.value, "pending")
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 2)
        self.assertEqual(scenario.vehicles[0].load_kg, 0)

    def test_recovery_agent_excludes_failed_entities(self):
        scenario = self.scenario()
        proposal = RecoveryAgent().propose(
            scenario.orders[0],
            scenario.warehouses,
            scenario.vehicles,
            unavailable_warehouse_ids=frozenset({"wh-1"}),
        )
        self.assertFalse(proposal.feasible)
        self.assertEqual(proposal.warehouse_ids, ())

    def test_order_can_be_reassigned_after_previous_assignment_is_released(self):
        scenario = self.scenario()
        coordinator = CoordinatorAgent(self.graph)
        location_map = {"loc-1": scenario.locations[0]}
        first = coordinator.assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, location_map, "run-1"
        )
        self.assertTrue(first.assigned)
        scenario.warehouses[0].release("parcel", 1)
        scenario.vehicles[0].load_kg = 0
        scenario.orders[0].transition_to(OrderStatus.PENDING)
        scenario.orders[0].warehouse_id = None
        scenario.orders[0].vehicle_id = None
        second = coordinator.assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles, location_map, "run-1"
        )
        self.assertTrue(second.assigned)

    def test_demand_agent_reports_historical_average(self):
        proposal = DemandAgent().propose("north", (2, 4, 6))
        self.assertEqual(proposal.average_orders, 4)
        self.assertEqual(proposal.region, "north")


if __name__ == "__main__":
    unittest.main()
