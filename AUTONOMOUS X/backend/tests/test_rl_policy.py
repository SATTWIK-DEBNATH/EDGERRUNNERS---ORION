import unittest
import tempfile
from pathlib import Path

from app.intelligence.reinforcement_learning.policy import (
    evaluate_policy,
    load_policy,
    save_policy,
    train_policy,
    validate_recommendation,
)
from app.intelligence.reinforcement_learning.warehouse_env import (
    WarehouseChoiceCase,
    WarehouseChoiceEnv,
    generate_choice_cases,
)


class WarehouseChoiceTests(unittest.TestCase):
    def test_environment_is_seed_reproducible_and_returns_finite_reward(self):
        cases = generate_choice_cases(4, 4, 3)
        first = WarehouseChoiceEnv(cases)
        second = WarehouseChoiceEnv(cases)
        first_obs, _ = first.reset(seed=4)
        second_obs, _ = second.reset(seed=4)
        self.assertTrue((first_obs == second_obs).all())
        _, reward, terminated, truncated, _ = first.step(0)
        self.assertTrue(terminated)
        self.assertFalse(truncated)
        self.assertTrue(float("-inf") < reward < float("inf"))

    def test_deterministic_gate_rejects_unavailable_or_infeasible_warehouse(self):
        case = WarehouseChoiceCase((2, 10), (False, True), (20, 3), 1, 5, (4.0, 8.0))
        self.assertFalse(validate_recommendation(case, 0).accepted)
        self.assertFalse(validate_recommendation(case, 1).accepted)

    def test_deterministic_gate_accepts_feasible_recommendation(self):
        case = WarehouseChoiceCase((2, 10), (True, True), (20, 10), 1, 5, (4.0, 8.0))
        self.assertTrue(validate_recommendation(case, 0).accepted)

    def test_saved_policy_loads_and_runs_inference(self):
        model = train_policy(seed=3, total_timesteps=32, warehouse_count=2)
        case = generate_choice_cases(4, 1, 2)[0]
        observation, _ = WarehouseChoiceEnv((case,)).reset(seed=4)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "warehouse_policy"
            save_policy(model, path)
            restored = load_policy(path)
            action, _ = restored.predict(observation, deterministic=True)
            self.assertTrue(0 <= int(action) < 2)

    def test_trained_policy_returns_bounded_action_and_comparable_metrics(self):
        model = train_policy(seed=9, total_timesteps=128, warehouse_count=3)
        result = evaluate_policy(model, seed=9, warehouse_count=3, episode_count=6)
        self.assertEqual(result.episode_count, 6)
        self.assertGreaterEqual(result.accepted_recommendations, 0)
        self.assertLessEqual(result.accepted_recommendations, result.episode_count)
        self.assertGreaterEqual(result.policy_mean_cost, 0)
        self.assertGreaterEqual(result.baseline_mean_cost, 0)


if __name__ == "__main__":
    unittest.main()
