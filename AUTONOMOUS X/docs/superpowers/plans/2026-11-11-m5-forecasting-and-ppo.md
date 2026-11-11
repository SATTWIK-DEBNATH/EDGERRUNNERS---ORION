# M5 Forecasting and PPO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reproducible demand forecasting and a small CPU PPO warehouse-choice experiment whose recommendations are checked by deterministic rules.

**Architecture:** `app/intelligence/forecasting` owns deterministic demand history, moving-average and RandomForest evaluation. `app/intelligence/reinforcement_learning` owns a Gymnasium environment, PPO training/evaluation, and a deterministic safety gate. No model output commits operational state.

**Tech Stack:** Python, NumPy, pandas, scikit-learn, Gymnasium, Stable-Baselines3 PPO, PyTorch CPU.

**Spec:** Master build prompt sections 10, 20, 21 (M5), 23 and 26.

## Global Constraints

- Use fixed seeds and chronological train/test separation for time-series evaluation.
- Report MAE and RMSE; compare the model to moving-average baseline.
- PPO recommendation cannot bypass stock, warehouse availability, or capacity checks.
- Keep local run possible without credentials or network services.

## Review Focus

- Too-short or negative demand histories fail clearly; tested in forecasting contract tests.
- Forecast evaluation uses future-only holdout rows; tested through chronological split assertions.
- No feasible warehouse returns a rejected recommendation; tested in RL policy tests.
- Fixed seed repeats demand data and environment observations; tested in deterministic tests.
- PPO action dimensions and invalid warehouse choices are bounded; tested in Gymnasium environment tests.

## Files

- Create `backend/app/intelligence/forecasting/demand.py` and `backend/app/intelligence/forecasting/__init__.py`.
- Create `backend/app/intelligence/reinforcement_learning/warehouse_env.py`, `policy.py`, and package init.
- Create `backend/tests/test_forecasting.py` and `test_rl_policy.py`.
- Modify `backend/requirements.txt`, README, and milestone tracker.

## Tasks

### Task 1: Forecast data, baseline, and evaluation

- [x] Write tests for fixed-seed history, moving-average prediction, chronological split, metrics, and RandomForest evaluation.
- [x] Run targeted tests and observe expected missing-module failures.
- [x] Implement seeded demand history, moving average, time-aware RandomForest metrics, and replenishment recommendation.
- [x] Run targeted tests.

### Task 2: Warehouse-choice environment and safety gate

- [x] Write tests for reset/step, reward and seeded repeatability, plus stock/unavailable/vehicle-capacity rejection.
- [x] Run targeted tests and observe expected missing-module failures.
- [x] Implement a single-order Gymnasium environment and deterministic recommendation gate; policy inference does not mutate logistics state.
- [x] Run targeted tests.

### Task 3: PPO training and reproducible evaluation

- [x] Write tests for bounded action output, fixed-seed evaluation, PPO training smoke result, and save/load inference.
- [x] Run targeted tests and observe expected missing-module failures.
- [x] Implement CPU PPO train/evaluate/save/load helpers with configurable timesteps and baseline comparison.
- [x] Run full backend suite and module demo; record actual seed 7 metrics.

### Task 4: Dependencies and documentation

- [x] Add bounded dependency versions after verifying Python 3.14 install compatibility.
- [x] Update M5 checklist, README setup/status, and progress log with measured results and any integration limits.
- [x] Run the full suite after docs/dependency updates.
