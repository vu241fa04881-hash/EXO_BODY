"""Unit Tests for HTTP Multi-User Session Routing
SIH 2026 | PS SIH26113 | Team: BERSERK TECHIES | Team ID: TEAM-147
"""

import unittest
import json
import time
import urllib.request
from threading import Thread

from backend.server import create_server, SessionManager


class TestServerSessionHTTP(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        try:
            cls.session_mgr = SessionManager(timeout_s=30.0, max_sessions=5)
            # Use an ephemeral free port by passing port 0
            cls.server = create_server(host="127.0.0.1", port=0, session_manager=cls.session_mgr)
            cls.port = cls.server.server_address[1]
            cls.server_thread = Thread(target=cls.server.serve_forever, daemon=True)
            cls.server_thread.start()
        except OSError as e:
            raise unittest.SkipTest(f"Socket binding restricted in sandbox environment: {e}")

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "server"):
            cls.server.shutdown()
            cls.server.server_close()
        if hasattr(cls, "session_mgr"):
            cls.session_mgr.stop_all()

    def test_http_sessions_isolated(self):
        base_url = f"http://127.0.0.1:{self.port}"

        # 1. User 1 changes mode to RUN via POST with session_id in query
        req1 = urllib.request.Request(
            f"{base_url}/api/kinematics/mode?session_id=user1",
            data=json.dumps({"mode": "RUN", "jog_angle_deg": 30.0}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req1) as resp1:
                data1 = json.loads(resp1.read().decode("utf-8"))
                self.assertEqual(data1["mode"], "RUN")
        except OSError as e:
            self.skipTest(f"Socket connection blocked in sandbox: {e}")

        time.sleep(0.02)

        # 2. User 2 checks mode via GET with session_id=user2
        req2 = urllib.request.Request(f"{base_url}/api/state?session_id=user2")
        with urllib.request.urlopen(req2) as resp2:
            data2 = json.loads(resp2.read().decode("utf-8"))
            # User 2 must NOT be RUN; user 2 should still be in default WALK
            self.assertEqual(data2["kinematics"]["mode"], "WALK")

        # 3. User 1 checks mode via GET with session_id=user1
        req1_get = urllib.request.Request(f"{base_url}/api/state?session_id=user1")
        with urllib.request.urlopen(req1_get) as resp1_get:
            data1_get = json.loads(resp1_get.read().decode("utf-8"))
            self.assertEqual(data1_get["kinematics"]["mode"], "RUN")


if __name__ == "__main__":
    unittest.main()
