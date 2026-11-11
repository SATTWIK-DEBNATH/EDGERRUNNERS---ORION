"""Seeded demand history and chronological forecast evaluation."""

from dataclasses import dataclass
import math
import random
from collections.abc import Sequence

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


@dataclass(frozen=True)
class DemandPoint:
    region: str
    period: int
    demand: int


@dataclass(frozen=True)
class ForecastMetrics:
    mae: float
    rmse: float


@dataclass(frozen=True)
class ForecastEvaluation:
    moving_average: ForecastMetrics
    random_forest: ForecastMetrics
    train_through_period: int
    test_periods: int
    observations: int


def generate_demand_history(seed: int, periods: int, regions: Sequence[str]) -> tuple[DemandPoint, ...]:
    """Generate deterministic daily regional counts with weekly seasonality and trend."""
    if periods < 1 or not regions or any(not region.strip() for region in regions):
        raise ValueError("periods and non-empty region names are required")
    rng = random.Random(seed)
    output: list[DemandPoint] = []
    for region_index, region in enumerate(regions):
        offset = rng.randrange(2, 9)
        for period in range(periods):
            weekly = 3.0 * math.sin((period + region_index * 2) * 2 * math.pi / 7)
            trend = period * (0.08 + region_index * 0.015)
            demand = max(0, round(offset + trend + weekly + rng.gauss(0, 1.8)))
            output.append(DemandPoint(region, period, demand))
    return tuple(output)


def moving_average_forecast(values: Sequence[float], window: int = 3) -> float:
    if window <= 0 or len(values) < window:
        raise ValueError("history must contain at least the requested positive moving-average window")
    return sum(values[-window:]) / window


def _features(history: Sequence[int], period: int) -> list[float]:
    return [float(history[-1]), float(history[-2]), float(history[-3]), sum(history[-3:]) / 3, float(period % 7)]


def evaluate_forecasts(
    points: Sequence[DemandPoint], test_fraction: float = 0.25, seed: int = 7
) -> ForecastEvaluation:
    """Evaluate one-step forecasts on the final chronological segment per region."""
    if not 0 < test_fraction < 0.5:
        raise ValueError("test_fraction must be between 0 and 0.5")
    regions = sorted({point.region for point in points})
    series = {region: sorted((p for p in points if p.region == region), key=lambda p: p.period) for region in regions}
    lengths = {len(values) for values in series.values()}
    if not regions or len(lengths) != 1 or min(lengths) < 8:
        raise ValueError("each region needs at least 8 aligned periods for time-aware evaluation")
    period_count = next(iter(lengths))
    boundary = int(period_count * (1 - test_fraction))
    if boundary < 5:
        raise ValueError("training segment must contain at least 5 periods")

    train_x: list[list[float]] = []
    train_y: list[int] = []
    test_x: list[list[float]] = []
    test_y: list[int] = []
    baseline_y: list[float] = []
    for region_points in series.values():
        demands = [point.demand for point in region_points]
        if any(value < 0 for value in demands) or [p.period for p in region_points] != list(range(period_count)):
            raise ValueError("demand must be nonnegative and periods contiguous from zero")
        for target_period in range(3, period_count):
            row = _features(demands[:target_period], target_period)
            if target_period < boundary:
                train_x.append(row)
                train_y.append(demands[target_period])
            else:
                test_x.append(row)
                test_y.append(demands[target_period])
                baseline_y.append(moving_average_forecast(demands[:target_period], 3))

    model = RandomForestRegressor(n_estimators=80, min_samples_leaf=2, random_state=seed, n_jobs=1)
    model.fit(train_x, train_y)
    forest_y = [max(0.0, prediction) for prediction in model.predict(test_x)]
    def metrics(actual: list[int], predicted: list[float]) -> ForecastMetrics:
        return ForecastMetrics(
            float(mean_absolute_error(actual, predicted)),
            float(math.sqrt(mean_squared_error(actual, predicted))),
        )

    return ForecastEvaluation(
        metrics(test_y, baseline_y), metrics(test_y, forest_y), boundary - 1, period_count - boundary, len(test_y)
    )


def recommend_replenishment(predicted_demand: float, current_stock: int) -> int:
    """Return a nonnegative stock top-up for forecast demand, rounded up to units."""
    if predicted_demand < 0 or current_stock < 0:
        raise ValueError("demand and stock cannot be negative")
    return max(0, math.ceil(predicted_demand - current_stock))
