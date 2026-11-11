"""A small, seeded Gymnasium environment for warehouse choice."""

from dataclasses import dataclass
import random
from collections.abc import Sequence

import gymnasium as gym
import numpy as np
from gymnasium import spaces


@dataclass(frozen=True)
class WarehouseChoiceCase:
    stock: tuple[int, ...]
    available: tuple[bool, ...]
    capacities_kg: tuple[float, ...]
    order_quantity: int
    order_weight_kg: float
    travel_costs: tuple[float, ...]

    def __post_init__(self) -> None:
        count = len(self.stock)
        if not count or any(len(values) != count for values in (self.available, self.capacities_kg, self.travel_costs)):
            raise ValueError("warehouse case fields must have the same non-zero length")
        if self.order_quantity <= 0 or self.order_weight_kg <= 0:
            raise ValueError("order quantity and weight must be positive")
        if any(value < 0 for value in (*self.stock, *self.capacities_kg, *self.travel_costs)):
            raise ValueError("stock, capacities, and travel costs cannot be negative")


@dataclass(frozen=True)
class ValidationResult:
    accepted: bool
    reason: str


def generate_choice_cases(seed: int, count: int, warehouse_count: int) -> tuple[WarehouseChoiceCase, ...]:
    if count < 1 or warehouse_count < 1:
        raise ValueError("case and warehouse counts must be positive")
    rng = random.Random(seed)
    cases = []
    for _ in range(count):
        quantity = rng.randint(1, 4)
        weight = float(rng.choice((2, 5, 10, 20, 40)))
        stock = tuple(rng.randint(0, 8) for _ in range(warehouse_count))
        available = tuple(rng.random() > 0.15 for _ in range(warehouse_count))
        capacities = tuple(float(rng.choice((10, 25, 50, 100))) for _ in range(warehouse_count))
        costs = tuple(float(rng.randint(1, 30)) for _ in range(warehouse_count))
        feasible = [i for i in range(warehouse_count) if available[i] and stock[i] >= quantity and capacities[i] >= weight]
        if not feasible:
            chosen = rng.randrange(warehouse_count)
            stock = tuple(max(value, quantity) if i == chosen else value for i, value in enumerate(stock))
            available = tuple(True if i == chosen else value for i, value in enumerate(available))
            capacities = tuple(max(value, weight) if i == chosen else value for i, value in enumerate(capacities))
        cases.append(WarehouseChoiceCase(stock, available, capacities, quantity, weight, costs))
    return tuple(cases)


class WarehouseChoiceEnv(gym.Env):
    """One-step warehouse decision episodes; no operational state is mutated."""

    metadata = {"render_modes": []}

    def __init__(self, cases: Sequence[WarehouseChoiceCase]) -> None:
        if not cases:
            raise ValueError("at least one case is required")
        self.cases = tuple(cases)
        self.warehouse_count = len(self.cases[0].stock)
        if any(len(case.stock) != self.warehouse_count for case in self.cases):
            raise ValueError("all cases must use the same warehouse count")
        self.action_space = spaces.Discrete(self.warehouse_count)
        self.observation_space = spaces.Box(0.0, 1.0, shape=(self.warehouse_count * 4 + 2,), dtype=np.float32)
        self._cursor = 0
        self._case = self.cases[0]

    def _observation(self) -> np.ndarray:
        case = self._case
        max_stock = max(1, max(case.stock))
        max_capacity = max(1.0, max(case.capacities_kg))
        max_cost = max(1.0, max(case.travel_costs))
        values = []
        for index in range(self.warehouse_count):
            values.extend((
                float(case.available[index]),
                min(1.0, case.stock[index] / max_stock),
                min(1.0, case.capacities_kg[index] / max_capacity),
                min(1.0, case.travel_costs[index] / max_cost),
            ))
        values.extend((min(1.0, case.order_quantity / max_stock), min(1.0, case.order_weight_kg / max_capacity)))
        return np.asarray(values, dtype=np.float32)

    def reset(self, *, seed: int | None = None, options: dict | None = None):
        super().reset(seed=seed)
        index = int(options.get("case_index", self._cursor)) % len(self.cases) if options else self._cursor % len(self.cases)
        self._case = self.cases[index]
        self._cursor = (index + 1) % len(self.cases)
        return self._observation(), {"case_index": index}

    def step(self, action: int):
        action = int(action)
        if not self.action_space.contains(action):
            raise ValueError("warehouse action is outside the action space")
        case = self._case
        validation = validate_recommendation(case, action)
        reward = -case.travel_costs[action] / max(1.0, max(case.travel_costs)) if validation.accepted else -10.0
        return self._observation(), float(reward), True, False, {"accepted": validation.accepted, "reason": validation.reason}


def validate_recommendation(case: WarehouseChoiceCase, warehouse_index: int) -> ValidationResult:
    if not 0 <= warehouse_index < len(case.stock):
        return ValidationResult(False, "warehouse index is out of range")
    if not case.available[warehouse_index]:
        return ValidationResult(False, "warehouse is unavailable")
    if case.stock[warehouse_index] < case.order_quantity:
        return ValidationResult(False, "insufficient stock")
    if case.capacities_kg[warehouse_index] < case.order_weight_kg:
        return ValidationResult(False, "vehicle capacity is insufficient")
    return ValidationResult(True, "feasible")
