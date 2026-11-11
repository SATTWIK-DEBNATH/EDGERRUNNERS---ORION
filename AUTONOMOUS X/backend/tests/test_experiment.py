import unittest

from app.intelligence.experiment import run_experiment


class IntelligenceExperimentTests(unittest.TestCase):
    def test_report_contains_seeded_forecast_and_policy_metrics(self):
        result = run_experiment(seed=6, total_timesteps=32, periods=24, region_count=2, evaluation_episodes=4)
        self.assertEqual(result["seed"], 6)
        self.assertEqual(result["forecast"]["test_periods"], 6)
        self.assertEqual(result["policy"]["episode_count"], 4)
        self.assertGreaterEqual(result["policy"]["accepted_recommendations"], 0)
        self.assertIn("baseline_mae", result["forecast"])
        self.assertIn("random_forest_rmse", result["forecast"])


if __name__ == "__main__":
    unittest.main()
