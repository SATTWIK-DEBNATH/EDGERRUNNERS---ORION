import unittest

from app.intelligence.forecasting.demand import (
    evaluate_forecasts,
    generate_demand_history,
    moving_average_forecast,
    recommend_replenishment,
)


class ForecastingTests(unittest.TestCase):
    def test_synthetic_history_repeats_for_fixed_seed(self):
        self.assertEqual(generate_demand_history(8, 24, ("north", "south")), generate_demand_history(8, 24, ("north", "south")))

    def test_moving_average_uses_only_requested_recent_window(self):
        self.assertEqual(moving_average_forecast((1, 2, 10, 20), 2), 15.0)

    def test_forecast_evaluation_is_chronological_and_reports_baselines(self):
        points = generate_demand_history(13, 48, ("north", "south"))
        result = evaluate_forecasts(points, test_fraction=0.25, seed=13)
        self.assertGreater(result.train_through_period, 0)
        self.assertGreater(result.test_periods, 0)
        self.assertEqual(result.test_periods, 12)
        self.assertGreaterEqual(result.random_forest.mae, 0)
        self.assertGreaterEqual(result.random_forest.rmse, 0)
        self.assertGreaterEqual(result.moving_average.mae, 0)

    def test_forecast_recommends_only_stock_needed_above_current_inventory(self):
        self.assertEqual(recommend_replenishment(12.2, 9), 4)
        self.assertEqual(recommend_replenishment(8, 9), 0)

    def test_forecast_rejects_too_short_series(self):
        with self.assertRaisesRegex(ValueError, "at least"):
            evaluate_forecasts(generate_demand_history(1, 5, ("north",)), test_fraction=0.25)


if __name__ == "__main__":
    unittest.main()
