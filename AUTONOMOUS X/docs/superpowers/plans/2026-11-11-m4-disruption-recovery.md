# M4 Dynamic Events and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply traffic changes, closures, vehicle breakdowns, warehouse outages, and urgent orders while preserving committed work where safe and deterministically recovering feasible assignments.

**Architecture:** A `RecoveryEngine` mutates incident state at simulation event boundaries, identifies affected uncompleted orders, releases old reservations safely, and asks the coordinator for replacements. Road closures reroute paths on the same directed graph. A route stability policy avoids low-value switches while closures and failures force recovery. Every action is recorded as typed incident/recovery output and events.

**Tech Stack:** SimPy time values, NetworkX graph weights, existing agent coordinator and event bus.

**Spec:** `docs/architecture.md`, M4 in `docs/milestones.md`, and the supplied AUTONOMOUS X master prompt.

## Global Constraints

- Completed orders remain completed and are not reassigned.
- Reservations and vehicle load are released before reassignment.
- Road closures never create a fabricated route; disconnected work remains explicitly unfulfilled/pending.
- Vehicle and warehouse outages make those entities unavailable before replacement proposals.
- Route freeze and improvement thresholds are configurable.
- Every incident and recovery action is auditable.

## Review Focus

- Vehicle breakdown cannot reassign completed orders: `test_breakdown_reassigns_only_unfinished_orders`.
- Warehouse outage releases prior stock and chooses an available stocked warehouse: `test_warehouse_outage_reallocates_order`.
- Closed edges are absent from revised paths: `test_road_closure_recalculates_affected_path`.
- Minor route improvements are suppressed but forced incidents still replan: `test_route_stability_threshold_and_force`.
- Failed recovery leaves no negative stock or excess vehicle load: `test_failed_recovery_preserves_invariants`.

---

### Task 1: Incident and recovery contracts

**Files:** `backend/app/domain/incidents.py`, `backend/app/recovery/contracts.py`, `backend/tests/test_recovery.py`.

- [ ] Write failing tests for incident validation and route stability policy.
- [ ] Implement typed incident kinds, affected-entity fields, and stability threshold.
- [ ] Run targeted tests.

### Task 2: Entity failure and order recovery

**Files:** `backend/app/recovery/recovery_engine.py`, `backend/tests/test_recovery.py`.

- [ ] Write failing tests for vehicle breakdown, warehouse outage, completed-order preservation, and stock/load restoration.
- [ ] Implement release/reset/reassign flow through `CoordinatorAgent`.
- [ ] Run targeted tests.

### Task 3: Road events and urgent insertion

**Files:** `backend/app/recovery/recovery_engine.py`, `backend/tests/test_recovery.py`, `backend/app/cli.py`.

- [ ] Write failing tests for slowdown, closure alternate path, blocked path, and urgent order insertion.
- [ ] Implement graph updates, affected-order detection, stability decisions, and event records.
- [ ] Add deterministic incident commands to the demo.
- [ ] Run the complete backend suite and record M4 acceptance.

**M4 boundary:** React incident controls and continuously streamed simulation events are wired in M6.
