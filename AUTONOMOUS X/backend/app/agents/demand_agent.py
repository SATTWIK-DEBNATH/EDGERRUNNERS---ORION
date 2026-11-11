"""Historical demand signal proposal; forecasting models arrive in M5."""

from app.agents.contracts import DemandProposal


class DemandAgent:
    def propose(self, region: str, historical_counts: tuple[int, ...] = ()) -> DemandProposal:
        if any(count < 0 for count in historical_counts):
            raise ValueError("historical demand counts cannot be negative")
        average = sum(historical_counts) / len(historical_counts) if historical_counts else 0.0
        return DemandProposal(region, average, len(historical_counts))
