import contextlib
import io
import unittest

from app.cli import main


class CliTests(unittest.TestCase):
    def test_demo_prints_actual_run_counts(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = main(["demo", "--seed", "7", "--orders", "5"])
        self.assertEqual(exit_code, 0)
        self.assertIn('"seed": 7', output.getvalue())
        self.assertIn('"orders_created": 5', output.getvalue())
        self.assertIn('"routing_source": "synthetic_fallback"', output.getvalue())
        self.assertIn('"solver": "Google OR-Tools"', output.getvalue())
        self.assertIn('"agent_assignment_events": 5', output.getvalue())
        self.assertIn('"incident_scheduled": true', output.getvalue())
        self.assertIn('"recovery_events": 1', output.getvalue())


if __name__ == "__main__":
    unittest.main()
