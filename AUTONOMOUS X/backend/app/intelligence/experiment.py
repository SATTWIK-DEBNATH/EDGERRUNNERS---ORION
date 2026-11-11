"""Run a reproducible forecasting and constrained PPO demonstration."""

import argparse
import json

from app.intelligence.forecasting.demand import evaluate_forecasts, generate_demand_history
from app.intelligence.reinforcement_learning.policy import evaluate_policy, train_policy


def run_experiment(
    seed: int = 7,
    total_timesteps: int = 1024,
    periods: int = 84,
    region_count: int = 4,
    evaluation_episodes: int = 32,
) -> dict[str, object]:
    if region_count < 1:
        raise ValueError("region_count must be positive")
    regions = tuple(f"region-{index + 1}" for index in range(region_count))
    forecast = evaluate_forecasts(generate_demand_history(seed, periods, regions), seed=seed)
    model = train_policy(seed=seed, total_timesteps=total_timesteps)
    policy = evaluate_policy(model, seed=seed, episode_count=evaluation_episodes)
    return {
        "seed": seed,
        "forecast": {
            "regions": region_count,
            "periods": periods,
            "train_through_period": forecast.train_through_period,
            "test_periods": forecast.test_periods,
            "test_observations": forecast.observations,
            "baseline_mae": round(forecast.moving_average.mae, 4),
            "baseline_rmse": round(forecast.moving_average.rmse, 4),
            "random_forest_mae": round(forecast.random_forest.mae, 4),
            "random_forest_rmse": round(forecast.random_forest.rmse, 4),
        },
        "policy": {
            "algorithm": "Stable-Baselines3 PPO",
            "device": "cpu",
            "training_timesteps": total_timesteps,
            "episode_count": policy.episode_count,
            "accepted_recommendations": policy.accepted_recommendations,
            "rejected_recommendations": policy.rejected_recommendations,
            "policy_mean_cost_on_accepted": round(policy.policy_mean_cost, 4),
            "baseline_mean_cost_same_episodes": round(policy.baseline_mean_cost, 4),
        },
        "interpretation": "Policy actions are recommendations; deterministic validation rejects infeasible warehouse choices.",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="autonomous-x-intelligence")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--timesteps", type=int, default=1024)
    parser.add_argument("--periods", type=int, default=84)
    parser.add_argument("--regions", type=int, default=4)
    parser.add_argument("--episodes", type=int, default=32)
    args = parser.parse_args(argv)
    print(json.dumps(run_experiment(args.seed, args.timesteps, args.periods, args.regions, args.episodes), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
