"""Unit Tests for Multi-User Session Isolation
SIH 2026 | PS SIH26113 | Team: BERSERK TECHIES | Team ID: TEAM-147
"""

import unittest
from backend.server import SessionManager


class TestSessionIsolation(unittest.TestCase):

    def setUp(self):
        self.manager = SessionManager(timeout_s=60.0, max_sessions=10)

    def tearDown(self):
        self.manager.stop_all()

    def test_different_sessions_have_isolated_engines(self):
        """Verify that user session A and user session B have completely distinct SimulationEngines."""
        engine_a = self.manager.get_engine("session_user_alice")
        engine_b = self.manager.get_engine("session_user_bob")

        self.assertIsNotNone(engine_a)
        self.assertIsNotNone(engine_b)
        self.assertIsNot(engine_a, engine_b, "Engines must be distinct instances across sessions")

    def test_actions_in_session_a_do_not_affect_session_b(self):
        """Verify that state changes in session A do not alter session B."""
        engine_a = self.manager.get_engine("user_device_1")
        engine_b = self.manager.get_engine("user_device_2")

        # Initial modes should be WALK
        self.assertEqual(engine_a.kinematic_mode, "WALK")
        self.assertEqual(engine_b.kinematic_mode, "WALK")

        # User 1 changes mode to RUN and jogs knee to 45.0 degrees
        engine_a.set_kinematic_mode(mode="RUN", jog_angle_deg=45.0)

        self.assertEqual(engine_a.kinematic_mode, "RUN")
        # User 2 must remain in WALK mode with unadjusted jog
        self.assertEqual(engine_b.kinematic_mode, "WALK")
        self.assertEqual(engine_b.manual_jog_angle_deg, 0.0)

        # User 2 changes to SIT_STAND
        engine_b.set_kinematic_mode(mode="SIT_STAND")
        self.assertEqual(engine_b.kinematic_mode, "SIT_STAND")
        self.assertEqual(engine_a.kinematic_mode, "RUN")

    def test_default_fallback_session(self):
        """Verify that None, empty string, or 'default' maps to the shared default engine."""
        def_engine_1 = self.manager.get_engine(None)
        def_engine_2 = self.manager.get_engine("")
        def_engine_3 = self.manager.get_engine("default")

        self.assertIs(def_engine_1, def_engine_2)
        self.assertIs(def_engine_2, def_engine_3)


if __name__ == "__main__":
    unittest.main()

