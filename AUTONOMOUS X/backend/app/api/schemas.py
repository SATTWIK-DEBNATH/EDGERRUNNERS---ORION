"""Validated API request/response schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateSimulationRequest(StrictModel):
    seed: int = 7
    warehouse_count: int = Field(default=3, ge=1, le=10)
    vehicle_count: int = Field(default=10, ge=1, le=100)
    order_count: int = Field(default=20, ge=0, le=500)


class StepRequest(StrictModel):
    seconds: float = Field(default=300, gt=0, le=86_400)


class CreateOrderRequest(StrictModel):
    simulation_id: str
    location_id: str
    item_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(gt=0, le=10_000)
    weight_kg: float = Field(gt=0, le=10_000)
    priority: int = Field(default=3, ge=1, le=5)
    urgent: bool = False


class CreateIncidentRequest(StrictModel):
    simulation_id: str
    kind: Literal["traffic", "road_closure", "vehicle_breakdown", "warehouse_outage"]
    entity_id: str | None = Field(default=None, min_length=1, max_length=100)
    start_node: str | None = Field(default=None, min_length=1, max_length=100)
    end_node: str | None = Field(default=None, min_length=1, max_length=100)
    factor: float = Field(default=1.5, gt=1, le=10)

    @model_validator(mode="after")
    def validate_target(self):
        if self.kind in {"traffic", "road_closure"} and (not self.start_node or not self.end_node):
            raise ValueError("road incidents require start_node and end_node")
        if self.kind in {"vehicle_breakdown", "warehouse_outage"} and not self.entity_id:
            raise ValueError("vehicle and warehouse incidents require entity_id")
        return self


class AssistantQuery(StrictModel):
    simulation_id: str | None = None
    question: str = Field(min_length=1, max_length=500)


class TrainingRequest(StrictModel):
    seed: int = 7
    timesteps: int = Field(default=512, ge=32, le=4096)
    episodes: int = Field(default=32, ge=1, le=256)


class AIDispatchAnalysisRequest(BaseModel):
    origin: str = "Mumbai Port JNPT, India"
    destination: str = "Jaipur Special Economic Zone, India"
    item_name: str = "High-Precision Machine Parts"
    quantity: int = 1
    weight_kg: float = 250.0
    priority: str = "Standard"
    selected_warehouse_id: str | None = None
    api_key: str | None = None
    endpoint_url: str | None = None
    model_name: str | None = None


class TestConnectionRequest(BaseModel):
    endpoint_url: str = "http://localhost:11434"
