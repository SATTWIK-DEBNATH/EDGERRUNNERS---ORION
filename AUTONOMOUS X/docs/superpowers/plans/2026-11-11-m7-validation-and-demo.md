# M7 Validation and Demonstration Plan

**Goal:** Verify the local prototype from a clean, documented setup and provide a reproducible, honest end-to-end demo.

## Tasks

- [x] Fix and visually verify the MapLibre layout and worker loading.
- [x] Run the complete backend test suite, frontend test suite, and production build; fix regressions.
- [x] Run the same-seed OR-Tools versus greedy comparison and record actual metrics and fallback source.
- [x] Document a UI/API demo sequence that demonstrates simulation control, dynamic incidents, urgent orders, forecasts, and RL evaluation using real application state.
- [x] Document what the local demo does not validate: live Supabase persistence/Realtime, Ollama, and external OSM download.
- [x] Update milestone, README, API docs, and demo instructions with observed results.

## Acceptance

Local setup, tests, build, and demo work without database or LLM credentials. Any cloud or local-service integration requiring user setup is left optional and described precisely; no unsupported claims of improved performance are made.

## Executed evidence

- Backend unit/integration suite: 84 passed. Frontend suite: 4 passed. Vite production build: success.
- Browser check rendered OSM tiles overlaid with routes and markers after fixing the MapLibre worker URL and map container sizing.
- Live local API demo exercised same-seed comparison, simulation control, regular and urgent orders, traffic, vehicle breakdown, warehouse outage, forecast, PPO, assistant-disabled response, and reset. All three incidents reached `applied`; assistant returned expected HTTP 503 while unconfigured.
- Seed 7 CLI run: 20/20 orders delivered, OR-Tools estimated 36,459 s versus greedy 42,483 s. This is one synthetic run and not a general performance guarantee.
- Supabase project/Auth/persistence and Ollama model are absent; live external integration checks remain user-setup work.
