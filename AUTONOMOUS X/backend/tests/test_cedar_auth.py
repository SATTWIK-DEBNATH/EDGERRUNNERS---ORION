"""Unit tests for Cedar Policy Enforcement Point and delegation verification."""

import unittest

from app.auth.cedar import CedarPolicyEngine, CedarRequest


class TestCedarAuth(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = CedarPolicyEngine()

    def test_forbidden_system_action_is_unconditionally_denied(self) -> None:
        request = CedarRequest(
            principal="Agent::Coordinator",
            action="Action::cancel_all_regional_orders",
            resource="Region::bengaluru",
        )
        decision = self.engine.evaluate(request)
        self.assertEqual(decision.decision, "DENY")
        self.assertIn("violates core safety invariant", decision.reason)
        self.assertEqual(decision.policy_matched, "forbid_dangerous_system_actions")

    def test_delegation_scope_attenuation(self) -> None:
        # Parent gives only ["Action::deliver_order"] to child
        delegation_token = {
            "delegator": "Agent::Coordinator",
            "delegatee": "Agent::Delivery_veh-1",
            "authorized_actions": ["Action::deliver_order"],
        }
        # Child attempts "Action::reallocate_inventory"
        request = CedarRequest(
            principal="Agent::Delivery_veh-1",
            action="Action::reallocate_inventory",
            resource="Warehouse::wh-1",
            delegation_token=delegation_token,
        )
        decision = self.engine.evaluate(request)
        self.assertEqual(decision.decision, "DENY")
        self.assertIn("scope attenuation failure", decision.reason)

    def test_vehicle_h3_zone_enforcement(self) -> None:
        # Vehicle only authorized in cell-A
        request = CedarRequest(
            principal="Agent::Delivery_veh-2",
            action="Action::bid_on_order",
            resource="Order::ord-5",
            context={
                "order_h3_cell": "8860145b4bfffff",
                "authorized_h3_cells": ["8860145b41fffff"],
            },
        )
        decision = self.engine.evaluate(request)
        self.assertEqual(decision.decision, "DENY")
        self.assertIn("outside vehicle's authorized operational zone", decision.reason)

    def test_permitted_operational_action(self) -> None:
        request = CedarRequest(
            principal="Agent::Coordinator",
            action="Action::assign_route",
            resource="Route::rt-1",
            context={"threat_level": "low"},
        )
        decision = self.engine.evaluate(request)
        self.assertEqual(decision.decision, "ALLOW")
        self.assertEqual(decision.policy_matched, "permit_standard_operations")
        # Sub-millisecond evaluation
        self.assertLess(decision.latency_microseconds, 1000.0)

    def test_audit_log_recording(self) -> None:
        request = CedarRequest(
            principal="Agent::Warehouse_wh-1",
            action="Action::reserve_stock",
            resource="Warehouse::wh-1",
        )
        self.engine.evaluate(request)
        self.assertGreater(len(self.engine.audit_log), 0)
        entry = self.engine.audit_log[-1]
        self.assertEqual(entry["action"], "Action::reserve_stock")
        self.assertEqual(entry["decision"], "ALLOW")


if __name__ == "__main__":
    unittest.main()

