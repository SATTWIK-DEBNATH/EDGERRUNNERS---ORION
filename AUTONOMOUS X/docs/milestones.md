# AUTONOMOUS X Milestones

Implementation proceeds in dependency order. Each milestone leaves a runnable increment; incomplete external integrations remain visibly disabled or labeled rather than represented by fabricated success.

## M0 — Repository inspection and architecture

- [x] Inspect repository and preserve existing work (workspace was empty except `outputs/` and `work/`).
- [x] Define architecture, layer boundaries, ER diagram, events, resource strategy, requirements-to-modules mapping.
- [x] Document local setup and dependency versions as implementation stabilizes.

**Acceptance:** architecture documentation exists and each major requirement has an implementation location.

## M1 — Core simulation and data models

- [x] Typed domain models and lifecycle validation.
- [x] Synthetic scenario generation with a fixed seed and defaults of 3 warehouses, 10 vehicles, and 20 orders.
- [x] SimPy clock, vehicle movement, and delivery lifecycle.
- [x] Supabase migration and repository boundary; local mode remains usable without credentials.
- [x] Tests prove assignment, movement, delivery, inventory safety, and deterministic generation.

**Acceptance:** a generated order is assigned, moves through a route, and reaches delivered state with correct inventory and timestamps.

## M2 — Road graph and optimization

- [x] OSMnx loader, local cache, configurable small Bengaluru extract, and synthetic fallback.
- [x] NetworkX directed paths, closure-aware weights, travel matrix and unreachable semantics.
- [x] OR-Tools VRP with multi-depot vehicles, capacities, priorities, time windows, time limits, vehicle availability, and unassigned orders.
- [x] Greedy baseline and result feasibility validation.

**Acceptance:** valid graph-based plans for multiple warehouses and orders, with honest solver status and fallback labels.

## M3 — Multi-agent coordination

- [x] Typed Warehouse, Fleet, Routing, Demand, Recovery and Coordinator proposals.
- [x] Bounded, idempotent in-process event bus and decision log.
- [x] Coordinator validates proposals before commit.

**Acceptance:** new order completes a proposal/validation/commit workflow; infeasible proposals are rejected.

## M4 — Dynamic events and recovery

- [x] Traffic changes, closures, vehicle breakdown, warehouse outage, urgent-order insertion.
- [x] Preserve completed stops and configurable near-term frozen stops.
- [x] Route stability threshold, recovery audit events and affected-order re-optimization.

**Acceptance:** inject disruptions during simulation and recover affected orders where feasible; otherwise explain unfulfillable work.

## M5 — Forecasting and RL

- [x] Synthetic regional demand history, moving-average baseline, time-aware RandomForest evaluation (MAE/RMSE).
- [x] Forecast informs inventory/allocation recommendation.
- [x] Small CPU PPO/Gymnasium warehouse-choice experiment with fixed seeds and deterministic feasibility validation.
- [x] Compare both forecast and policy against simple baselines.

**Acceptance:** reproducible metrics and visible policy recommendation results; no claim of full MARL.

## M6 — Dashboard and live integration

- [x] React/TypeScript operations dashboard and typed API client.
- [x] MapLibre route/vehicle/warehouse/order/incident layers and simulation controls.
- [x] Recharts based on API data for operational metrics and comparison.
- [x] Optional Supabase Realtime subscription; clear loading, empty, error and local-mode states.
- [x] Restricted Ollama assistant endpoint; deterministic validation of requested actions.

**Acceptance:** start/control simulation, create order, inject incident and view resulting actual state without manual refresh. Local mode verified. Persistent Supabase storage, Auth, and live Realtime require user project credentials and are not configured; the simulation service remains in-memory.

## M7 — Validation and demonstration

- [x] Automated unit and integration coverage from the master prompt (84 backend tests and 4 frontend tests pass).
- [x] Clean local setup procedures, optional integrations off, synthetic map fallback.
- [x] Baseline versus optimized run on same seed; report wins and regressions without claims unsupported by metrics.
- [x] Reproducible 17-step local demo, README, architecture, API and resource notes.

**Acceptance:** local demo runs from documented setup without manual database edits and reports actual solver and simulation outcomes. Full prompt acceptance still depends on live Supabase persistence/Auth and Ollama, which need user-provided project/service setup.

## Progress log

| Date | Milestone | Result |
|---|---|---|
| 2026-11-11 | M0 | Workspace inspected; architecture, boundaries, ER model, event contracts, resource strategy and requirement mapping documented. |
| 2026-11-11 | M1 | Domain, deterministic data, SimPy delivery lifecycle, in-memory repository, Supabase migration/RLS, setup, and CLI demo implemented. 13 tests pass; seed 7 delivered 20/20 orders in 4,475.6 simulated seconds. Travel is labeled approximate straight-line pending M2. |
| 2026-11-11 | M2 | OSMnx cache/download adapter, directed NetworkX paths, closure-aware bounded travel-matrix cache, SimPy graph movement, OR-Tools multi-depot CVRP, constraints, and greedy baseline implemented. 36 tests pass. Default seed 7 used labeled synthetic roads and delivered 20/20; OR-Tools assigned 20, estimated 35,931 seconds vs baseline 41,741 seconds. This is one synthetic run, not a general performance claim. Optional OSM download was attempted and Overpass returned 502; fallback path ran successfully. |
| 2026-11-11 | M3 | Typed warehouse/fleet/routing/demand/recovery proposals and coordinator implemented. The bounded idempotent event bus and rollback on full queue are covered. CLI orders now flow through agents and the coordinator before SimPy processing. |
| 2026-11-11 | M4 | Mid-run traffic, closure, breakdown, warehouse outage, and urgent-order recovery implemented with frozen next stop, route stability policy, and audit events. Full backend suite: 60 tests passed. |
| 2026-11-11 | M5 | Seeded regional demand, moving-average and chronological RandomForest evaluation, replenishment recommendation, Gymnasium warehouse choice, SB3 PPO CPU train/evaluate/save/load, feasibility gate, and CLI report implemented. Full backend suite: 71 tests passed. Seed 7 run (84 periods × 4 regions): RF MAE/RMSE 2.4513/3.0242 vs moving-average 2.5754/3.3565; PPO accepted 22/32 recommendations, with mean accepted-choice cost 12.9091 vs same-episode baseline 10.5455. These are single-run metrics; PPO underperformed and rejected 10 actions. |
| 2026-11-11 | M6 | FastAPI local API and React dashboard implemented with simulation controls, live map routes/markers, charts, incidents, urgent orders, forecasts, PPO, and disabled-by-default read-only Ollama. MapLibre worker bundling and zero-height container issues fixed and browser visually verified. Supabase Realtime remains optional; there is no operational database persistence or login UI. |
| 2026-11-11 | M7 | Full validation: backend 84/84 tests, frontend 4/4 tests, TypeScript/Vite production build succeeded. Seed 7 synthetic-fallback run delivered 20/20 orders in 43,409.86 simulated seconds; OR-Tools estimated 36,459 seconds (20 assigned, 1,030 ms solver runtime) vs greedy 42,483 seconds (20 assigned), about 14.2% lower estimated route time in this single synthetic run. PPO's separate seed-7 evaluation was worse than its feasible baseline. Build emits a bundle-size advisory for the lazy MapLibre chunk (1.07 MB raw, 290 KB gzip). Live Supabase/Ollama and live OSM download remain unconfigured/upstream unavailable. |

## R1 — Operational route optimization integration

- [x] Apply one validated OR-Tools initial vehicle allocation and stop order to the SimPy task queues, after coordinator stock and warehouse decisions and before simulation start.
- [x] Retain baseline dispatch as the default and configurable strategy; identify `ortools` or `baseline_fallback` in simulation results and API overview.
- [x] Reject incomplete, duplicate, infeasible, unavailable-vehicle, and over-capacity results without mutating coordinator assignments.
- [x] Cover optimizer-to-execution flow, strategy selection, fallback, capacity, duplicate protection, recovery compatibility, and seeded determinism.

**Limitations:** OR-Tools redistributes coordinator-approved assignments and plans their order. Warehouse selection and stock reservation remain coordinator-owned. Execution recalculates each road path, so the planned objective is an estimate and does not freeze live routing under incidents. Strategy defaults to baseline unless configured otherwise.
