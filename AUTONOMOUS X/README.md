# AUTONOMOUS X

An extensible logistics simulation and operations dashboard. The local default runs a deterministic SimPy scenario with an explicitly labeled synthetic road graph. Graph routing, OR-Tools optimization, coordinated agents, disruption recovery, forecasting, PPO evaluation, FastAPI, and the React dashboard are implemented.

## Current status

- **M0 complete:** architecture, entity boundaries, event contracts, ER diagram, requirements map, and milestone plan are in [`docs/architecture.md`](docs/architecture.md) and [`docs/milestones.md`](docs/milestones.md).
- **M1 complete:** domain models, deterministic synthetic data, SimPy delivery lifecycle, in-memory repository, and initial Supabase schema are implemented.
- **M2 complete:** directed NetworkX paths, OSMnx GraphML cache/download adapter, explicit synthetic road fallback, cached travel matrix, graph-based SimPy movement, OR-Tools multi-depot VRP, and greedy baseline are implemented. The default demo uses `synthetic_fallback`; it is not live traffic or real-world road data.
- **M3 complete:** warehouse, fleet, routing, demand, recovery, and coordinator proposal agents use typed contracts. Coordinator commits only after stock, capacity, reachability, and event-queue checks. The CLI demo exercises these agents before moving assigned orders.
- **M4 complete:** traffic, closures, vehicle breakdown, warehouse outage, and urgent-order incidents can be injected during simulation; feasible work is re-optimized, with route stability and recovery audit events.
- **M5 complete:** seeded regional demand forecasting, moving-average and chronological RandomForest evaluation, a stock replenishment signal, and a Gymnasium/SB3 PPO warehouse-choice experiment are implemented. PPO results show accepted and rejected actions and are checked deterministically; single-run metrics are not presented as general improvement.

- **M6 complete for local mode:** FastAPI endpoints and the React/MapLibre/Recharts dashboard expose actual simulation controls, route and fleet state, incidents, agents, analytics, forecasting, PPO comparison, and a read-only assistant panel. Supabase Realtime and Ollama remain optional and are not live-configured in this workspace.
- **M7 local validation complete:** backend and frontend suites pass, the production build succeeds, and a 17-step reproducible demo is documented. Live Supabase persistence/Auth and Ollama still require user setup; the simulation currently stores state in memory.

## Run locally

Requires Python 3.12 or later. From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m app.cli demo --seed 7
uvicorn app.api.main:app --reload
```

Start the API from `backend/` with `uvicorn app.api.main:app --reload`. Open a second terminal from the repository root and run `cd frontend; npm install; npm run dev`. The UI opens at `http://127.0.0.1:5173`; Vite proxies `/api` to FastAPI on port 8000.

To run forecasting and RL evaluation, use `python -m app.intelligence.experiment --seed 7 --timesteps 512 --periods 84 --regions 4 --episodes 32`. The JSON output reports holdout MAE/RMSE and PPO versus feasible baseline costs. It is a reproducible experiment, not an operationally trained policy.

The default scenario uses 3 warehouses, 10 vehicles, and 20 orders. Configure another reproducible size with `--warehouses`, `--vehicles`, and `--orders`.

By default the CLI uses a small synthetic Bengaluru road grid. Use `python -m app.cli demo --osm` to request a small OSMnx road extract and cache it at `data/cache/bengaluru.graphml`. If the download or cached file is unavailable, the output reports the reason and uses a visibly labeled synthetic fallback. Attribute displayed OpenStreetMap data as **© OpenStreetMap contributors** and follow the [OpenStreetMap copyright and attribution guidance](https://www.openstreetmap.org/copyright).

## Optional integrations

Local mode needs no `.env`, database account, or LLM. To enable browser Realtime, create `frontend/.env` from `frontend/.env.example` with the project URL and publishable key; apply `backend/supabase/migrations/001_initial_schema.sql` and configure Supabase Auth/RLS so the signed-in browser user can read permitted table changes. This prototype does not yet persist local simulations to Supabase. To enable the read-only Ollama assistant, configure the backend values in `backend/.env.example` and set `ENABLE_LLM=true`; no LLM action tools are exposed.

The API contract and optional integration details are in [docs/api.md](docs/api.md).

Follow the [17-step local demonstration](docs/demo-script.md) to compare routing strategies, advance deliveries, inject incidents, inspect forecasting and PPO results, and review final metrics.

## Project documents

- [Architecture and entity boundaries](docs/architecture.md)
- [Milestone checklist](docs/milestones.md)
- [Database design](docs/database.md)
- [M1 implementation plan](docs/superpowers/plans/2026-11-11-m1-core-simulation.md)
- [M2 implementation plan](docs/superpowers/plans/2026-11-11-m2-road-graph-and-optimization.md)
- [M3 implementation plan](docs/superpowers/plans/2026-11-11-m3-agent-coordination.md)
- [M4 implementation plan](docs/superpowers/plans/2026-11-11-m4-disruption-recovery.md)
- [M5 implementation plan](docs/superpowers/plans/2026-11-11-m5-forecasting-and-ppo.md)
- [M6 implementation plan](docs/superpowers/plans/2026-11-11-m6-api-and-dashboard.md)
- [API contract](docs/api.md)
- [Reproducible local demo](docs/demo-script.md)
