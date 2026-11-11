"""FastAPI application for Autonomous X local operations."""

from collections import defaultdict
import os

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.api.schemas import AssistantQuery, CreateIncidentRequest, CreateOrderRequest, CreateSimulationRequest, StepRequest, TrainingRequest
from app.api.service import LogisticsService
from app.intelligence.forecasting.demand import evaluate_forecasts, generate_demand_history
from app.intelligence.reinforcement_learning.policy import evaluate_policy, train_policy


def _order_json(order) -> dict:
    return {
        "id": order.id, "location_id": order.location_id, "item_id": order.item_id,
        "quantity": order.quantity, "weight_kg": order.weight_kg, "priority": order.priority,
        "status": order.status.value, "warehouse_id": order.warehouse_id, "vehicle_id": order.vehicle_id,
    }


def create_app(service: LogisticsService | None = None) -> FastAPI:
    app = FastAPI(title="Autonomous X API", version="1.0.0")
    app.state.logistics = service or LogisticsService()
    app.add_middleware(
        CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
    )

    def get_session(simulation_id: str | None = None):
        try:
            return app.state.logistics.require_session(simulation_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @app.get("/api/health")
    def health():
        return {"status": "ok", "mode": "local", "integrations": app.state.logistics.integrations()}

    @app.get("/api/overview")
    def overview(simulation_id: str | None = Query(default=None)):
        return app.state.logistics.overview(simulation_id)

    @app.get("/api/simulations")
    def list_simulations():
        return [
            {
                "id": session.id, "seed": session.seed, "status": session.status,
                "simulated_time_s": session.engine.now,
                "route_strategy": session.engine.route_strategy,
                "route_strategy_reason": session.engine.route_strategy_reason,
            }
            for session in app.state.logistics.sessions.values()
        ]

    @app.post("/api/simulations", status_code=201)
    def create_simulation(request: CreateSimulationRequest):
        session = app.state.logistics.create_simulation(
            request.seed, request.warehouse_count, request.vehicle_count, request.order_count
        )
        return {
            "id": session.id, "seed": session.seed, "status": session.status,
            "route_strategy": session.engine.route_strategy,
            "route_strategy_reason": session.engine.route_strategy_reason,
            "orders": [_order_json(order) for order in session.scenario.orders],
            "warehouses": [{"id": warehouse.id, "name": warehouse.name} for warehouse in session.scenario.warehouses],
        }

    @app.get("/api/simulations/{simulation_id}")
    def get_simulation(simulation_id: str):
        session = get_session(simulation_id)
        return {
            "id": session.id, "seed": session.seed, "status": session.status,
            "simulated_time_s": session.engine.now,
            "route_strategy": session.engine.route_strategy,
            "route_strategy_reason": session.engine.route_strategy_reason,
        }

    @app.post("/api/simulations/{simulation_id}/start")
    def start_simulation(simulation_id: str):
        session = get_session(simulation_id)
        if session.status == "completed":
            raise HTTPException(status_code=409, detail="simulation is complete")
        try:
            app.state.logistics.start(simulation_id)
        except RuntimeError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return {
            "id": session.id, "status": session.status, "simulated_time_s": session.engine.now,
            "route_strategy": session.engine.route_strategy,
            "route_strategy_reason": session.engine.route_strategy_reason,
        }

    @app.post("/api/simulations/{simulation_id}/pause")
    def pause_simulation(simulation_id: str):
        session = get_session(simulation_id)
        if session.status != "running":
            raise HTTPException(status_code=409, detail="simulation is not running")
        session.status = "paused"
        return {"id": session.id, "status": session.status, "simulated_time_s": session.engine.now}

    @app.post("/api/simulations/{simulation_id}/resume")
    def resume_simulation(simulation_id: str):
        session = get_session(simulation_id)
        if session.status != "paused":
            raise HTTPException(status_code=409, detail="simulation is not paused")
        session.status = "running"
        return {"id": session.id, "status": session.status, "simulated_time_s": session.engine.now}

    @app.post("/api/simulations/{simulation_id}/step")
    def step_simulation(simulation_id: str, request: StepRequest):
        try:
            session = app.state.logistics.advance(simulation_id, request.seconds)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return {"id": session.id, "status": session.status, "simulated_time_s": session.engine.now, "overview": app.state.logistics.overview(simulation_id)}

    @app.post("/api/simulations/{simulation_id}/reset")
    def reset_simulation(simulation_id: str):
        try:
            session = app.state.logistics.reset(simulation_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {
            "id": session.id, "status": session.status, "simulated_time_s": 0,
            "route_strategy": session.engine.route_strategy,
            "route_strategy_reason": session.engine.route_strategy_reason,
        }

    @app.get("/api/orders")
    def list_orders(simulation_id: str | None = Query(default=None)):
        session = get_session(simulation_id)
        return [_order_json(order) for order in (*session.scenario.orders, *session.recovery.additional_orders)]

    @app.get("/api/orders/{order_id}")
    def get_order(order_id: str, simulation_id: str | None = Query(default=None)):
        session = get_session(simulation_id)
        order = next((item for item in (*session.scenario.orders, *session.recovery.additional_orders) if item.id == order_id), None)
        if order is None:
            raise HTTPException(status_code=404, detail=f"unknown order: {order_id}")
        return _order_json(order)

    @app.post("/api/orders", status_code=201)
    def create_order(request: CreateOrderRequest):
        try:
            order = app.state.logistics.add_order(
                request.simulation_id, request.location_id, request.item_id, request.quantity,
                request.weight_kg, request.priority, request.urgent,
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return _order_json(order)

    @app.get("/api/warehouses")
    def list_warehouses(simulation_id: str | None = Query(default=None)):
        return app.state.logistics.overview(simulation_id)["warehouses"]

    @app.get("/api/vehicles")
    def list_vehicles(simulation_id: str | None = Query(default=None)):
        return app.state.logistics.overview(simulation_id)["vehicles"]

    @app.get("/api/routes")
    def list_routes(simulation_id: str | None = Query(default=None)):
        return app.state.logistics.overview(simulation_id)["routes"]

    @app.post("/api/optimization/run")
    def run_optimization(simulation_id: str = Query(...)):
        try:
            return app.state.logistics.optimization_comparison(simulation_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @app.post("/api/incidents", status_code=201)
    def create_incident(request: CreateIncidentRequest):
        try:
            return app.state.logistics.add_incident(request.simulation_id, request)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except RuntimeError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @app.get("/api/incidents")
    def list_incidents(simulation_id: str | None = Query(default=None)):
        return app.state.logistics.overview(simulation_id)["incidents"]

    @app.get("/api/analytics/summary")
    def analytics_summary(simulation_id: str | None = Query(default=None)):
        overview_data = app.state.logistics.overview(simulation_id)
        return {"orders": overview_data["orders"], "metrics": overview_data["metrics"], "delivery_timeline": overview_data["delivery_timeline"]}

    @app.get("/api/analytics/comparison")
    def analytics_comparison(simulation_id: str = Query(...)):
        try:
            return app.state.logistics.optimization_comparison(simulation_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @app.get("/api/forecasts")
    @app.post("/api/forecasts/train")
    def forecast(simulation_id: str | None = Query(default=None)):
        session = app.state.logistics.get_session(simulation_id)
        seed = session.seed if session else 7
        result = evaluate_forecasts(generate_demand_history(seed, 56, ("north", "central", "south")), seed=seed)
        return {
            "source": "deterministic_synthetic_history", "seed": seed,
            "train_through_period": result.train_through_period, "test_periods": result.test_periods,
            "baseline_mae": result.moving_average.mae, "baseline_rmse": result.moving_average.rmse,
            "random_forest_mae": result.random_forest.mae, "random_forest_rmse": result.random_forest.rmse,
        }

    @app.post("/api/rl/train")
    def train_rl(request: TrainingRequest):
        model = train_policy(request.seed, request.timesteps)
        evaluation = evaluate_policy(model, request.seed, episode_count=request.episodes)
        app.state.logistics._policy = model
        app.state.logistics._policy_evaluation = {
            "episode_count": evaluation.episode_count,
            "accepted_recommendations": evaluation.accepted_recommendations,
            "rejected_recommendations": evaluation.rejected_recommendations,
            "policy_mean_cost_on_accepted": evaluation.policy_mean_cost,
            "baseline_mean_cost_same_episodes": evaluation.baseline_mean_cost,
        }
        return app.state.logistics._policy_evaluation

    @app.get("/api/rl/evaluation")
    def rl_evaluation():
        return app.state.logistics._policy_evaluation or {"status": "not_trained"}

    @app.post("/api/assistant/query")
    async def assistant_query(request: AssistantQuery):
        if not app.state.logistics.integrations()["ollama"]:
            raise HTTPException(status_code=503, detail="Ollama assistant is disabled; configure ENABLE_LLM=true and OLLAMA_MODEL to enable it")
        overview_data = app.state.logistics.overview(request.simulation_id)
        summary = {"simulation": overview_data["simulation"], "orders": overview_data["orders"], "metrics": overview_data["metrics"], "incidents": overview_data["incidents"]}
        prompt = (
            "You are a read-only logistics operations explainer. Explain current data and answer the user's question. "
            "Never request credentials, claim an action was performed, or provide executable instructions as if they were applied. "
            f"Current operational summary JSON: {summary}\nQuestion: {request.question}"
        )
        url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/") + "/api/chat"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, json={"model": os.getenv("OLLAMA_MODEL", "llama3.1:8b"), "stream": False, "messages": [{"role": "user", "content": prompt}]})
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise HTTPException(status_code=502, detail="Ollama request failed; verify local Ollama availability and model setup") from error
        return {"answer": data.get("message", {}).get("content", ""), "mode": "read_only"}

    return app


app = create_app()
