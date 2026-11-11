# M3 Agent Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Coordinate typed warehouse, fleet, routing, demand, and recovery proposals through a bounded event bus and commit only feasible order assignments.

**Architecture:** Agents are pure proposal components inside the modular monolith. A coordinator evaluates candidate pairs using road-graph costs, then performs the stock/order/vehicle mutation in one synchronous commit boundary and publishes an idempotent event. Decisions are recorded as typed results for later persistence and display.

**Tech Stack:** Python dataclasses and Protocols, NetworkX-backed `RoadGraph`, in-process bounded event bus.

**Spec:** `docs/architecture.md`, M3 in `docs/milestones.md`, and the supplied AUTONOMOUS X master prompt.

## Global Constraints

- Agent proposals never mutate operational state.
- Coordinator validates stock, capacity, availability, and graph reachability before commit.
- Event queue has a configured hard bound and duplicate event IDs are idempotent.
- Unavailable or infeasible choices are explained and logged.
- RL and LLM recommendations do not bypass deterministic validation.

## Review Focus

- Insufficient stock rejects without decrementing inventory: `test_coordinator_rejects_no_stock_without_mutation`.
- Insufficient capacity rejects without assigning: `test_coordinator_rejects_no_vehicle_capacity`.
- Unreachable road path rejects and releases no stock: `test_coordinator_rejects_unreachable_route`.
- Replayed event IDs do not dispatch twice: `test_event_bus_deduplicates_ids`.
- A full pending queue raises explicitly without silent loss: `test_event_bus_enforces_capacity`.

---

### Task 1: Event envelope and bounded bus

**Files:** `backend/app/events/contracts.py`, `backend/app/events/bus.py`, `backend/tests/test_event_bus.py`.

- [x] Write failing tests for typed event validation, subscription dispatch, deduplication, and queue overflow.
- [x] Implement bounded `publish`, `dispatch_next`, and `drain` behavior.
- [x] Run targeted tests.

### Task 2: Specialized agents and proposal contracts

**Files:** `backend/app/agents/contracts.py`, `warehouse_agent.py`, `fleet_agent.py`, `routing_agent.py`, `demand_agent.py`, `recovery_agent.py`, `backend/tests/test_agents.py`.

- [x] Write failing tests for stock, capacity, route, demand average, and recovery candidate proposals.
- [x] Implement read-only typed proposals.
- [x] Run targeted tests.

### Task 3: Coordinator validation and commit

**Files:** `backend/app/agents/coordinator.py`, `backend/tests/test_agents.py`.

- [x] Write failing end-to-end order assignment and rejection tests.
- [x] Implement deterministic candidate scoring, validation, atomic in-process state update, decision records, and event publication.
- [x] Run complete backend suite and record M3 acceptance evidence.

**M3 boundary:** incident recovery execution remains M4; persistence of decision rows remains Supabase adapter work.
