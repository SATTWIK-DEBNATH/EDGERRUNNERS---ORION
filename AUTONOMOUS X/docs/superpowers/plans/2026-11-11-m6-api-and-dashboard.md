# M6 Operations API and Dashboard Implementation Plan

> **Implementation workflow:** This plan was executed task-by-task with checkbox tracking.

**Goal:** Provide an interactive local operations dashboard backed by typed FastAPI endpoints, with map, charts, simulation controls, order and incident input, and optional Supabase Realtime/Ollama adapters.

**Architecture:** FastAPI owns a local in-memory simulation session and validates all commands before applying them. The React/TypeScript client consumes typed API responses, polls local state, and optionally subscribes to Supabase when public connection settings exist. Ollama receives a bounded read-only operational summary, never executable commands.

**Tech Stack:** FastAPI, Pydantic, Uvicorn, HTTPX; Vite, React, TypeScript, MapLibre GL, Recharts, Supabase JS.

**Spec:** Master build prompt sections 11–17, 19, 20, 21 (M6), 23 and 26.

## Global Constraints

- Local mode must run without database, Ollama, or sign-up credentials.
- Validate request bodies and deterministic operations; privileged secrets never reach browser code.
- All map and chart values must come from API state.
- Optional integrations report disabled/error states honestly.
- UI supports loading, empty, error, and local-mode states.

## Review Focus

- Unknown simulation/order/incident IDs return controlled 404/422; tested in API tests.
- Bad quantities, coordinates and incident inputs do not mutate state; tested in API tests.
- Repeated start/pause/step controls preserve stable lifecycle; tested in service/API tests.
- Empty scenario data renders without fabricated map/chart values; tested in frontend build and component behavior.
- Missing Supabase/Ollama settings never crash startup or claim connected status; tested in backend config/API tests.

## Files

- Create backend `app/api/{main,schemas,service,routes}.py`, tests, and `docs/api.md`.
- Add `fastapi`, `uvicorn`, `httpx` dependencies.
- Create `frontend/` Vite React TypeScript app with API client, dashboard components, MapLibre visualization, charts, and optional Realtime hook.
- Modify simulation lifecycle API only when tests identify needed stepping semantics.

## Tasks

### Task 1: API contract and local session service

- [x] Write tests for health, overview, simulation create/start/pause/resume/step/reset, order creation, and incident validation.
- [x] Run targeted tests to observe expected missing API failures.
- [x] Add request/response schemas, session service, and FastAPI routes. Expose actual simulation state and deterministic metrics.
- [x] Support stepwise SimPy advancement and mid-run incident insertion without breaking `run()` behavior.
- [x] Run API tests.

### Task 2: Optional external adapters

- [x] Write tests for Ollama disabled/timeout/unsafe-input and Supabase Realtime disabled configuration.
- [x] Run tests to observe expected missing adapter behavior.
- [x] Add allowlisted, read-only Ollama summary endpoint and browser-only Supabase Realtime subscription when configured.
- [x] Keep local mode default and never echo credentials.
- [x] Run integration tests without credentials; mark live checks pending if no user config exists.

### Task 3: Frontend dashboard

- [x] Create React components and typed API client; implement tests for loading/empty/error and command validation.
- [x] Install npm dependencies and observe targeted frontend tests fail before implementation.
- [x] Implement responsive overview, MapLibre route/warehouse/vehicle/order/incident layers, analytics charts, simulation controls, order/incident forms, agent activity, and assistant panel.
- [x] Poll local API and activate Supabase subscription only with public Vite configuration.
- [x] Run frontend tests and production build.

### Task 4: Documentation and milestone verification

- [x] Document API and exact local startup steps for backend/frontend.
- [x] Update M6 checklist/progress/README with actual verification and external integration status.
- [x] Run full backend suite, frontend tests, and build.
