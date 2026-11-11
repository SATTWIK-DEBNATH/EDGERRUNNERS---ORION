"""CPU PPO training and deterministic policy evaluation."""

from dataclasses import dataclass

from stable_baselines3 import PPO

from app.intelligence.reinforcement_learning.warehouse_env import (
    WarehouseChoiceEnv,
    generate_choice_cases,
    validate_recommendation,
)


@dataclass(frozen=True)
class PolicyEvaluation:
    episode_count: int
    accepted_recommendations: int
    rejected_recommendations: int
    policy_mean_cost: float
    baseline_mean_cost: float


def train_policy(seed: int = 7, total_timesteps: int = 1024, warehouse_count: int = 3) -> PPO:
    if total_timesteps < 1:
        raise ValueError("total_timesteps must be positive")
    cases = generate_choice_cases(seed, max(32, warehouse_count * 8), warehouse_count)
    env = WarehouseChoiceEnv(cases)
    model = PPO(
        "MlpPolicy", env, seed=seed, device="cpu", n_steps=32, batch_size=32,
        learning_rate=0.0003, gamma=0.95, verbose=0,
    )
    model.learn(total_timesteps=total_timesteps)
    return model


def evaluate_policy(model: PPO, seed: int = 7, warehouse_count: int = 3, episode_count: int = 32) -> PolicyEvaluation:
    if episode_count < 1:
        raise ValueError("episode_count must be positive")
    cases = generate_choice_cases(seed + 10_000, episode_count, warehouse_count)
    accepted_costs = []
    baseline_costs = []
    accepted = 0
    for case in cases:
        observation, _ = WarehouseChoiceEnv((case,)).reset(seed=seed)
        action, _ = model.predict(observation, deterministic=True)
        index = int(action)
        validation = validate_recommendation(case, index)
        feasible = [i for i in range(warehouse_count) if validate_recommendation(case, i).accepted]
        if validation.accepted:
            accepted += 1
            accepted_costs.append(case.travel_costs[index])
            baseline_costs.append(min(case.travel_costs[i] for i in feasible))
    return PolicyEvaluation(
        episode_count, accepted, episode_count - accepted,
        sum(accepted_costs) / len(accepted_costs) if accepted_costs else 0.0,
        sum(baseline_costs) / len(baseline_costs),
    )


def save_policy(model: PPO, path) -> None:
    """Save a Stable-Baselines3 archive at the supplied local path."""
    model.save(str(path))


def load_policy(path) -> PPO:
    """Load a PPO archive for CPU inference."""
    return PPO.load(str(path), device="cpu")
