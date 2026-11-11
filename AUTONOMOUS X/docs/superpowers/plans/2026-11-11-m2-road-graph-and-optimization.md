# M2 Road Graph and Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace approximate point-to-point routing with directed road-graph travel costs and produce capacity-feasible multi-depot delivery routes using OR-Tools.

**Architecture:** `RoadGraph` owns a directed NetworkX graph and exposes graph-based path/cost methods. OSMnx loading is an optional cached adapter with an explicit synthetic fallback. Solver DTOs remain separate from domain entities; the OR-Tools adapter maps a matrix problem to a validated solver result. A greedy baseline remains separately labeled.

**Tech Stack:** NetworkX, OSMnx, Google OR-Tools, Python dataclasses.

**Spec:** `docs/architecture.md`, M2 in `docs/milestones.md`, and the supplied AUTONOMOUS X master prompt.

## Global Constraints

- Directed edges preserve one-way travel and closures.
- Travel units are seconds, distance units are metres, and unreachable is explicit.
- OSM downloads are configurable and cached; synthetic fallback is clearly labeled.
- OR-Tools is the primary VRP solver; heuristics are only a labeled baseline/fallback.
- Every solution is checked for assignment uniqueness, capacity, availability, and route limits before acceptance.

## Review Focus

- Reverse traversal of a one-way road is unreachable: `test_one_way_edge_is_not_reversible`.
- Closed edges cannot appear in a returned path: `test_closed_edge_uses_open_alternative`.
- Disconnected destinations return no route instead of a fabricated direct distance: `test_unreachable_destination_is_explicit`.
- Orders exceeding vehicle capacity remain unassigned: `test_capacity_violation_is_reported_unassigned`.
- Vehicles start and end at their own depots: `test_multiple_depots_use_vehicle_specific_start_and_end`.

---

### Task 1: Directed graph model and pathfinding

**Files:** `backend/app/graph/road_graph.py`, `backend/tests/test_graph.py`.

- [x] Write failing tests for shortest path, one-way behavior, closure, dynamic costs, and unreachable nodes.
- [x] Run the targeted test and confirm the graph module is missing.
- [x] Implement `RoadGraph.from_edges`, `shortest_path`, `close_edge`, and `set_edge_cost`.
- [x] Run graph tests.

### Task 2: OSMnx loader and explicit fallback

**Files:** `backend/app/graph/osm_loader.py`, `backend/tests/test_osm_loader.py`, `backend/requirements.txt`.

- [x] Test the disabled-download path returns the synthetic graph with source label `synthetic_fallback`.
- [x] Implement a small configurable bbox loader with GraphML cache read/write and OSMnx-to-RoadGraph conversion.
- [x] Run loader tests without network access; document OSM attribution. A live download attempt reached Overpass but received a 502 queue/capacity response; output correctly used the fallback.

### Task 3: OR-Tools solver DTOs and adapter

**Files:** `backend/app/optimization/models.py`, `backend/app/optimization/ortools_solver.py`, `backend/tests/test_optimization.py`.

- [x] Write failing tests for capacity, multiple depots, unavailable vehicles, time windows, unassigned orders, priority, and invalid matrix handling.
- [x] Implement integer travel-time matrices, capacity dimension, optional time dimension/windows, priority-weighted unassigned penalties, and vehicle start/end indices.
- [x] Validate solver results and keep solver status/runtime/objective in the returned model.
- [x] Run all backend tests.

### Task 4: Graph matrix, baseline, and CLI integration

**Files:** `backend/app/graph/travel_matrix.py`, `backend/app/optimization/baseline.py`, `backend/app/cli.py`, related tests and docs.

- [x] Implement bounded cached graph travel matrices with explicit unreachable entries and approximate snap connectors.
- [x] Add a labeled greedy baseline for same-seed comparison.
- [x] Extend CLI to show graph source, solver status, vehicle routes, assignments, and baseline output without unsupported performance claims.
- [x] Run the complete backend suite and demo; 36 tests passed and seed 7 produced 20 assigned orders in both solver and baseline output.

**M2 boundary:** incident re-optimization and agent-based allocation remain M3/M4.
