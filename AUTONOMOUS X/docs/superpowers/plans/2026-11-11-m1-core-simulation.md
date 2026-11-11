# M1 Core Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a deterministic synthetic logistics scenario whose orders can be assigned, moved, and delivered by a SimPy simulation, with safe domain state and a persistence boundary.

**Architecture:** Python modular monolith. Domain dataclasses own invariants; scenario generation returns domain entities; the SimPy engine advances lifecycle state; repository protocols isolate persistence. The initial runnable mode uses in-memory state, while an SQL migration defines the Supabase persistence contract.

**Tech Stack:** Python 3.12+, dataclasses, SimPy, SQL migrations, standard-library `unittest`.

**Spec:** `docs/architecture.md`, M1 in `docs/milestones.md`, and the supplied AUTONOMOUS X master prompt.

## Global Constraints

- Initial scenario defaults to 3 warehouses, 10 vehicles, and 20 orders.
- Quantities are nonnegative; capacity is positive; times use simulation seconds and UTC persistence timestamps.
- Every generated scenario is reproducible for a fixed seed.
- Simulation and tests do not require Supabase credentials.
- Inventory reservation and state transitions reject invalid operations.

## Review Focus

- Reserving more stock than available must fail without changing stock: test `test_reserve_rejects_insufficient_stock_without_mutation`.
- Invalid coordinates or capacities must be rejected: test `test_domain_rejects_invalid_capacity_and_coordinates`.
- Reusing a seed must reproduce entity identifiers and locations: test `test_scenario_generation_is_reproducible`.
- Delivery must only complete assigned/in-transit work: test `test_order_lifecycle_rejects_skipped_states`.
- A zero-duration or empty route must not strand the simulation: test `test_empty_route_completes_without_advancing_time`.

---

### Task 1: Domain models and deterministic scenario

**Files:**
- Create: `backend/app/domain/models.py`
- Create: `backend/app/simulation/scenario.py`
- Test: `backend/tests/test_domain.py`
- Test: `backend/tests/test_scenario.py`

**Interfaces:**
- Produces: `Warehouse`, `Vehicle`, `DeliveryLocation`, `Order`, `OrderStatus`, `Scenario`, and `generate_scenario(seed: int, warehouse_count: int = 3, vehicle_count: int = 10, order_count: int = 20) -> Scenario`.

- [ ] Write failing tests for inventory reserve/release, order transitions, capacity/coordinate validation, and reproducibility.
- [ ] Run `python -m unittest discover -s backend/tests -v`; confirm failures are due to missing production modules.
- [ ] Implement the minimal dataclasses and seeded Bengaluru-area generator.
- [ ] Run the same unittest command and confirm all tests pass.

### Task 2: SimPy delivery lifecycle

**Files:**
- Create: `backend/app/simulation/engine.py`
- Test: `backend/tests/test_simulation.py`
- Modify: `backend/requirements.txt`

**Interfaces:**
- Consumes: domain models and scenario from Task 1.
- Produces: `SimulationEngine(scenario: Scenario)` with `run(until: float | None = None) -> SimulationResult`.

- [ ] Write tests for assignment, movement, delivery, inventory consistency, fixed-seed outcome, and empty routes.
- [ ] Run the targeted test and confirm it fails because the engine is absent.
- [ ] Implement bounded SimPy processes and explicit transition events.
- [ ] Install only SimPy in an isolated project environment if missing; run all tests.

### Task 3: Persistence contract and setup

**Files:**
- Create: `backend/app/repositories/protocols.py`
- Create: `backend/app/repositories/memory.py`
- Create: `backend/supabase/migrations/001_initial_schema.sql`
- Create: `backend/.env.example`
- Create: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: repository protocols for simulation runs, warehouses, vehicles, orders, and events; in-memory implementation for local demos.

- [ ] Write repository contract tests for duplicate IDs, nonnegative stock, and order lookup.
- [ ] Run tests to confirm missing implementation failures.
- [ ] Implement in-memory repositories and SQL constraints, indexes, PostGIS geography, and RLS ownership scaffold.
- [ ] Run all tests and inspect migration SQL for foreign keys and consistency constraints.

### Task 4: Runnable local demonstration

**Files:**
- Create: `backend/app/cli.py`
- Create: `backend/tests/test_cli.py`
- Modify: `README.md`, `docs/milestones.md`

- [ ] Write a test for a fixed-seed summary showing created/delivered/unfulfilled counts.
- [ ] Confirm it fails before CLI implementation.
- [ ] Implement `python -m app.cli demo --seed 7` with honest simulation metrics.
- [ ] Run the test suite and demo command; record real output and M1 acceptance status.

**M1 scope boundary:** OSMnx/NetworkX/OR-Tools, agents, recovery, forecasting/RL/LLM, API, and frontend remain in later milestones.
