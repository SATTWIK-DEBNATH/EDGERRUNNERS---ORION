# API contract

Local base URL: `http://127.0.0.1:8000`. OpenAPI is available at `/docs` while the server runs. Requests and responses use JSON. Request bodies reject unknown fields and validate bounds; unknown entities return 404, invalid values return 422, and invalid lifecycle commands return 409.

## Simulation lifecycle

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Local mode and optional integration configuration status |
| GET | `/api/overview?simulation_id=` | Current simulation, actual orders, routes, map points, incidents, decisions and metrics |
| GET / POST | `/api/simulations` | List or create a seeded local simulation |
| GET | `/api/simulations/{id}` | Simulation status |
| POST | `/api/simulations/{id}/start` | Initialize the SimPy event queue |
| POST | `/api/simulations/{id}/pause` | Pause dashboard stepping |
| POST | `/api/simulations/{id}/resume` | Resume dashboard stepping |
| POST | `/api/simulations/{id}/step` | Advance simulation by a positive number of seconds (maximum 86,400) |
| POST | `/api/simulations/{id}/reset` | Recreate the same seeded scenario |

The UI advances a running simulation by 240 simulated seconds per 900 ms and polls actual state. Step calls remain available while paused.

Initial vehicle assignment uses the baseline coordinator strategy by default. Set backend `ROUTE_OPTIMIZATION_STRATEGY=ortools` before starting the API to apply validated OR-Tools vehicle routes and stop order to the actual SimPy queues. `ROUTE_OPTIMIZATION_STRATEGY=baseline` keeps the existing behavior. Simulation create/list/get/start responses and `GET /api/overview` report `route_strategy` as `baseline`, `ortools`, or `baseline_fallback`; a fallback also includes `route_strategy_reason`. OR-Tools runs once while a simulation is created. It optimizes vehicle assignment/order for the coordinator's already-reserved warehouse assignments; it does not jointly select warehouses or re-plan each delivery. Any solver, timeout, feasibility, or output-validation failure retains the coordinator assignments and allows the simulation to run.

## Operations

- `GET /api/orders[?simulation_id=]`, `GET /api/orders/{id}`, `POST /api/orders`
- `GET /api/warehouses[?simulation_id=]`, `GET /api/vehicles[?simulation_id=]`, `GET /api/routes[?simulation_id=]`
- `POST /api/incidents`, `GET /api/incidents[?simulation_id=]`
- `POST /api/optimization/run?simulation_id=...`, `GET /api/analytics/summary[?simulation_id=]`, `GET /api/analytics/comparison?simulation_id=...`
- `GET /api/forecasts[?simulation_id=]`, `POST /api/forecasts/train`
- `POST /api/rl/train`, `GET /api/rl/evaluation`
- `POST /api/assistant/query` (read-only Ollama summary; returns 503 when disabled)

Order creation uses an existing location from the selected scenario. Incidents accept traffic slowdown, directed road closure, vehicle breakdown, and warehouse outage. Unknown IDs are rejected before event scheduling. The PPO endpoint is CPU-only and caps training at 4,096 steps per request.

## Optional integrations

Local mode is the default. The browser listens to Supabase Postgres Changes on operational tables only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set. The selected tables must be included in the project's `supabase_realtime` publication and RLS must authorize the signed-in user. The API does not expose service-role credentials. This prototype does not include Supabase Auth or write local simulation state to Postgres; configuring those integrations requires a Supabase project and is not part of local startup.

Ollama is disabled unless `ENABLE_LLM=true`. Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL` on the backend. The endpoint sends current read-only summary data and the bounded user question; it exposes no tools for changing logistics state.
