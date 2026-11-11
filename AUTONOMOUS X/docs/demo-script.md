# Reproducible local demonstration

This walkthrough uses the actual local API and dashboard state. It needs no database, cloud account, or model service. The seeded scenario is deterministic (seed 7), while the simulation session ID is generated at runtime. Keep one browser tab open at `http://127.0.0.1:5173` and use the same simulation throughout.

## Start

1. Start FastAPI and Vite using the two-terminal commands in the README.
2. Open the dashboard and confirm the header reports **Local mode**. The map may need a few seconds to load OSM tiles; route geometry comes from the local synthetic graph.
3. Click **Create demo simulation**. The API creates 3 warehouses, 10 vehicles, 20 orders, and agent allocation decisions for seed 7.
4. Inspect warehouse inventory, order fulfillment, route lines, vehicle markers, and the agent decision trace.
5. Click **Run comparison** in **Baseline vs optimizer**. Record the API-reported OR-Tools and greedy assignment counts and estimated travel times. These estimates use the same seeded scenario and graph.
6. Click **Start simulation**, then use **Step +10 min** to advance simulated time. Watch vehicle locations, delivery metrics, and the timeline update.
7. In **Create an order**, select a listed delivery location and create a standard parcel order. Confirm it appears in the order totals and assignment trace.
8. Create another order with **Urgent insertion with recovery agent** checked. Confirm the incident log and assignment trace reflect its recovery decision.
9. In **Inject an incident**, choose **Traffic slowdown**, select a directed road edge, submit it, and advance one step. Check the incident log and changed/recovered route state.
10. Choose **Vehicle breakdown**, select a vehicle with active work when available, submit, and advance one step. Inspect reassigned and unresolved orders in the recovery activity.
11. Choose **Warehouse outage**, select a warehouse with active work when available, submit, and advance one step. Check whether the work was reassigned or marked unresolved.
12. Review **Demand forecast**. The chart reports moving-average and RandomForest holdout MAE/RMSE from deterministic synthetic regional history, not live demand.
13. Click **Train + evaluate** in **CPU PPO experiment**. Read accepted and rejected recommendations and policy/baseline costs. A worse policy result is a valid experiment outcome; the feasibility gate remains authoritative.
14. Ask the operations assistant to summarize the current state. Without Ollama configured, the API reports that the optional assistant is disabled; this is the expected local-only response.
15. Review final fulfillment, throughput, fleet utilization, incident outcomes, and the baseline comparison.
16. Capture a screenshot of the running dashboard with the map, route layers, and final metrics visible.
17. Use **Reset simulation** to repeat the same seed and verify that the scenario returns to its initial state.

The assistant step becomes live only after Ollama is installed, the `llama3.1:8b` model is available, and backend `.env` settings are configured. The dashboard's local mode remains usable without it.

## Command-line comparison

For a machine-readable run on the same seed, from `backend/` run:

```powershell
python -m app.cli demo --seed 7
```

The JSON includes OR-Tools and greedy results, solver status and runtime, delivery/recovery counts, and road graph source/fallback reason. Use `python -m app.cli demo --seed 7 --osm` to attempt downloading the configured Bengaluru OSM extract; if the external service is unavailable, the command reports the reason and uses the labeled synthetic graph.

## Scope of this demo

- Simulation records are held in process memory and disappear when the API stops. The SQL migration and optional browser Realtime adapter exist, but persistence, authenticated sessions, and live Realtime delivery require a user Supabase project and are not part of this local walkthrough.
- Ollama is optional and was not available in the local environment; its disabled/error behavior is exercised by API tests.
- Live Overpass download previously returned HTTP 502. The synthetic road graph and map visualization work without that service.
