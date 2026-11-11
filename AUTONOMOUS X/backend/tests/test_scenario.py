import unittest

from app.simulation.scenario import generate_scenario


class ScenarioTests(unittest.TestCase):
    def test_scenario_generation_is_reproducible(self):
        first = generate_scenario(seed=17)
        second = generate_scenario(seed=17)
        self.assertEqual(first, second)
        self.assertEqual((len(first.warehouses), len(first.vehicles), len(first.orders)), (3, 10, 20))

    def test_scenario_sizes_are_configurable(self):
        scenario = generate_scenario(seed=4, warehouse_count=2, vehicle_count=3, order_count=5)
        self.assertEqual((len(scenario.warehouses), len(scenario.vehicles), len(scenario.orders)), (2, 3, 5))


if __name__ == "__main__":
    unittest.main()
