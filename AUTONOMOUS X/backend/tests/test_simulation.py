import unittest

from app.domain.models import DeliveryLocation, Order, OrderStatus, Scenario, Vehicle, Warehouse
from app.agents.coordinator import CoordinatorAgent
from app.graph.road_graph import RoadEdge, RoadGraph
from app.events.bus import EventBus
from app.recovery.recovery_engine import RecoveryEngine
from app.simulation.engine import SimulationEngine
from app.simulation.scenario import generate_scenario


class SimulationTests(unittest.TestCase):
    def test_engine_can_advance_in_steps_and_finish(self):
        scenario = generate_scenario(seed=2, warehouse_count=1, vehicle_count=1, order_count=1)
        engine = SimulationEngine(scenario)
        first = engine.advance(30)
        self.assertEqual(first.simulated_time_s, 30)
        second = engine.advance()
        self.assertEqual(second.delivered_order_ids, ("ord-1",))
        self.assertGreater(second.simulated_time_s, first.simulated_time_s)

    def test_incident_can_be_scheduled_after_engine_start(self):
        scenario = generate_scenario(seed=2, warehouse_count=1, vehicle_count=1, order_count=0)
        engine = SimulationEngine(scenario)
        engine.start()
        called = []
        engine.schedule_incident(2, lambda: called.append("applied"))
        engine.advance(3)
        self.assertEqual(called, ["applied"])
    def test_order_is_assigned_moved_and_delivered(self):
        scenario = Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.97, 77.59, {"parcel": 2}),),
            vehicles=(Vehicle("veh-1", 50, 12.97, 77.59),),
            locations=(DeliveryLocation("loc-1", 12.98, 77.60),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )

        result = SimulationEngine(scenario).run()

        self.assertEqual(result.delivered_order_ids, ("ord-1",))
        self.assertGreater(result.simulated_time_s, 0)
        self.assertEqual(scenario.orders[0].status.value, "delivered")
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 1)
        self.assertEqual(result.routing_source, "approximate_straight_line")
        self.assertIn("VehicleMoved", [event.event_type for event in result.events])

    def test_empty_route_completes_without_advancing_time(self):
        scenario = generate_scenario(seed=5, order_count=0)
        result = SimulationEngine(scenario).run()
        self.assertEqual(result.simulated_time_s, 0)
        self.assertEqual(result.delivered_order_ids, ())

    def test_fixed_seed_repeats_delivery_result(self):
        first = SimulationEngine(generate_scenario(seed=9)).run()
        second = SimulationEngine(generate_scenario(seed=9)).run()
        self.assertEqual(first.delivered_order_ids, second.delivered_order_ids)
        self.assertEqual(first.simulated_time_s, second.simulated_time_s)

    def test_vehicle_moves_along_graph_edges_when_graph_is_supplied(self):
        scenario = Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 2}),),
            vehicles=(Vehicle("veh-1", 50, 12.0, 77.0), Vehicle("veh-2", 50, 12.0, 77.0)),
            locations=(DeliveryLocation("loc-1", 12.0, 77.02),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.0, 77.02)},
            [RoadEdge("a", "b", 100, 5), RoadEdge("b", "c", 100, 5)],
            source="test_road_graph",
        )

        result = SimulationEngine(scenario, road_graph=graph).run()

        self.assertEqual(result.routing_source, "test_road_graph")
        self.assertEqual(result.simulated_time_s, 10)
        moved = [event for event in result.events if event.event_type == "VehicleMoved"]
        self.assertEqual([(event.latitude, event.longitude) for event in moved], [(12.0, 77.01), (12.0, 77.02)])

    def test_graph_unreachable_order_is_unfulfilled_and_stock_is_released(self):
        scenario = Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 2}),),
            vehicles=(Vehicle("veh-1", 50, 12.0, 77.0),),
            locations=(DeliveryLocation("loc-1", 13.0, 78.0),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (13.0, 78.0)}, [], source="test_road_graph"
        )

        result = SimulationEngine(scenario, road_graph=graph).run()

        self.assertEqual(result.unfulfilled_order_ids, ("ord-1",))
        self.assertEqual(scenario.orders[0].status.value, "unfulfillable")
        self.assertEqual(scenario.warehouses[0].inventory["parcel"], 2)
        self.assertEqual(scenario.vehicles[0].load_kg, 0)

    def test_simulation_processes_preassigned_order_without_double_reserving(self):
        warehouse = Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 1})
        vehicle = Vehicle("veh-1", 50, 12.0, 77.0, load_kg=2)
        order = Order("ord-1", "loc-1", "parcel", 1, 2)
        order.warehouse_id = warehouse.id
        order.vehicle_id = vehicle.id
        order.transition_to(OrderStatus.ASSIGNED)
        scenario = Scenario(
            seed=1,
            warehouses=(warehouse,),
            vehicles=(vehicle,),
            locations=(DeliveryLocation("loc-1", 12.0, 77.01),),
            orders=(order,),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01)}, [RoadEdge("a", "b", 100, 5)], source="test"
        )
        result = SimulationEngine(scenario, road_graph=graph).run()
        self.assertEqual(result.delivered_order_ids, ("ord-1",))
        self.assertEqual(warehouse.inventory["parcel"], 1)
        self.assertEqual(vehicle.load_kg, 0)

    def test_vehicle_breakdown_during_simulation_reassigns_and_completes_order(self):
        scenario = Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 2}),),
            vehicles=(Vehicle("veh-1", 50, 12.0, 77.0), Vehicle("veh-2", 50, 12.0, 77.0)),
            locations=(DeliveryLocation("loc-1", 12.0, 77.02),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.0, 77.02)},
            [RoadEdge("a", "b", 100, 10), RoadEdge("b", "c", 100, 10)],
            source="test_road_graph",
        )
        bus = EventBus()
        coordinator = CoordinatorAgent(graph, bus)
        initial = coordinator.assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles,
            {"loc-1": scenario.locations[0]}, "run-1"
        )
        self.assertTrue(initial.assigned)
        recovery = RecoveryEngine(scenario, graph, coordinator, bus)
        engine = SimulationEngine(scenario, road_graph=graph)
        engine.schedule_incident(
            5,
            lambda: recovery.vehicle_breakdown("veh-1", "run-1", occurred_at_s=engine.now),
        )

        result = engine.run()

        self.assertEqual(result.delivered_order_ids, ("ord-1",))
        self.assertEqual(scenario.orders[0].vehicle_id, "veh-2")
        self.assertFalse(scenario.vehicles[0].available)
        self.assertEqual(scenario.vehicles[1].load_kg, 0)

    def test_road_closure_during_simulation_recalculates_remaining_path(self):
        scenario = Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 2}),),
            vehicles=(Vehicle("veh-1", 50, 12.0, 77.0),),
            locations=(DeliveryLocation("loc-1", 12.0, 77.02),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.0, 77.02), "d": (12.01, 77.01)},
            [
                RoadEdge("a", "b", 100, 10), RoadEdge("b", "c", 100, 10),
                RoadEdge("a", "d", 120, 12), RoadEdge("d", "c", 120, 12),
            ],
            source="test_road_graph",
        )
        bus = EventBus()
        coordinator = CoordinatorAgent(graph, bus)
        self.assertTrue(coordinator.assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles,
            {"loc-1": scenario.locations[0]}, "run-1"
        ).assigned)
        recovery = RecoveryEngine(scenario, graph, coordinator, bus)
        engine = SimulationEngine(scenario, road_graph=graph)
        engine.schedule_incident(5, lambda: recovery.road_closure("a", "b", "run-1", engine.now))

        result = engine.run()

        self.assertEqual(result.delivered_order_ids, ("ord-1",))
        self.assertIn("ord-1", recovery.latest_paths)
        self.assertNotIn(("a", "b"), tuple(zip(recovery.latest_paths["ord-1"].node_ids, recovery.latest_paths["ord-1"].node_ids[1:])))
        self.assertNotIn((12.0, 77.01), [(event.latitude, event.longitude) for event in result.events if event.event_type == "VehicleMoved"])

    def test_urgent_order_inserted_during_simulation_is_processed(self):
        scenario = Scenario(
            seed=1,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 4}),),
            vehicles=(Vehicle("veh-1", 50, 12.0, 77.0), Vehicle("veh-2", 50, 12.0, 77.0)),
            locations=(DeliveryLocation("loc-1", 12.0, 77.02),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 2),),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.0, 77.02)},
            [RoadEdge("a", "b", 100, 10), RoadEdge("b", "c", 100, 10)],
            source="test_road_graph",
        )
        bus = EventBus()
        coordinator = CoordinatorAgent(graph, bus)
        coordinator.assign_order(
            scenario.orders[0], scenario.warehouses, scenario.vehicles,
            {"loc-1": scenario.locations[0]}, "run-1"
        )
        recovery = RecoveryEngine(scenario, graph, coordinator, bus)
        engine = SimulationEngine(scenario, road_graph=graph)
        urgent = Order("urgent-1", "loc-1", "parcel", 1, 2, priority=5)

        def insert_urgent():
            engine.register_order(urgent)
            return recovery.insert_urgent_order(urgent, "run-1", engine.now)

        engine.schedule_incident(5, insert_urgent)
        result = engine.run()

        self.assertEqual(set(result.delivered_order_ids), {"ord-1", "urgent-1"})
        self.assertIn("RecoveryCommitted", [event.event_type for event in result.events])


if __name__ == "__main__":
    unittest.main()
