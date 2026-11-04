"""High-Performance Real-Time Telemetry & HTTP Server
SIH 2026 | PS SIH26113 | Team: BERSERK TECHIES | Team ID: TEAM-147
"""

import os
import json
import time
import datetime
import threading
import mimetypes
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("model/gltf+json", ".gltf")
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Optional, Dict, Any

from backend.config import DEFAULT_SIM
from backend.simulation.loop import SimulationEngine

# Locate frontend directory relative to backend/
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))


class SessionManager:
    """Manages independent SimulationEngine instances per client session.
    Provides session tracking, timeout harvesting, and multi-user isolation.
    """

    def __init__(self,
                 default_engine: Optional[SimulationEngine] = None,
                 dt: float = DEFAULT_SIM.dt,
                 timeout_s: float = 600.0,
                 max_sessions: int = 50):
        self.default_dt = dt
        self.timeout_s = timeout_s
        self.max_sessions = max_sessions
        self._lock = threading.Lock()

        # Initialize default fallback session
        if default_engine is None:
            default_engine = SimulationEngine(dt=self.default_dt)
            default_engine.start_background_loop()

        self.default_engine = default_engine
        self._sessions: Dict[str, Dict[str, Any]] = {
            "default": {
                "engine": default_engine,
                "created_at": time.time(),
                "last_active": time.time()
            }
        }

        # Background thread to reap inactive sessions
        self._reaper = threading.Thread(target=self._reaper_loop, daemon=True)
        self._reaper.start()

    def get_engine(self, session_id: Optional[str]) -> SimulationEngine:
        sid = (session_id or "default").strip()
        if not sid:
            sid = "default"

        with self._lock:
            now = time.time()
            if sid in self._sessions:
                self._sessions[sid]["last_active"] = now
                return self._sessions[sid]["engine"]

            # If capacity reached, remove the oldest non-default session
            if len(self._sessions) >= self.max_sessions:
                self._evict_oldest_locked()

            # Create an isolated simulation engine for this user session
            new_engine = SimulationEngine(dt=self.default_dt)
            new_engine.start_background_loop()
            self._sessions[sid] = {
                "engine": new_engine,
                "created_at": now,
                "last_active": now
            }
            return new_engine

    def touch(self, session_id: Optional[str]) -> None:
        sid = (session_id or "default").strip()
        with self._lock:
            if sid in self._sessions:
                self._sessions[sid]["last_active"] = time.time()

    def _evict_oldest_locked(self) -> None:
        oldest_sid = None
        oldest_time = float("inf")
        for sid, info in self._sessions.items():
            if sid == "default":
                continue
            if info["last_active"] < oldest_time:
                oldest_time = info["last_active"]
                oldest_sid = sid
        if oldest_sid:
            info = self._sessions.pop(oldest_sid, None)
            if info:
                try:
                    info["engine"].stop_background_loop()
                except Exception:
                    pass

    def _reaper_loop(self) -> None:
        while True:
            time.sleep(30.0)
            now = time.time()
            to_remove = []
            with self._lock:
                for sid, info in self._sessions.items():
                    if sid == "default":
                        continue
                    if now - info["last_active"] > self.timeout_s:
                        to_remove.append(sid)
                for sid in to_remove:
                    info = self._sessions.pop(sid, None)
                    if info:
                        try:
                            info["engine"].stop_background_loop()
                        except Exception:
                            pass

    def stop_all(self) -> None:
        with self._lock:
            for sid, info in self._sessions.items():
                try:
                    info["engine"].stop_background_loop()
                except Exception:
                    pass
            self._sessions.clear()


class MoveAssistRequestHandler(BaseHTTPRequestHandler):
    """Handles static web asset delivery, REST control endpoints,
    and high-speed Server-Sent Events (SSE) telemetry streaming with multi-user isolation.
    """

    session_manager: Optional[SessionManager] = None
    engine: Optional[SimulationEngine] = None  # Default/fallback instance

    def log_message(self, format, *args):
        # Suppress routine 200 HTTP streaming logs to keep console clean
        pass

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Session-ID")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Session-ID")
        self.end_headers()

    def _extract_session_id(self, post_data: Optional[dict] = None) -> str:
        """Extracts unique session identifier from query params, headers, cookies, or body."""
        try:
            parsed = urlparse(self.path)
            qs = parse_qs(parsed.query)
            if "session_id" in qs and qs["session_id"]:
                sid = qs["session_id"][0].strip()
                if sid:
                    return sid
        except Exception:
            pass

        try:
            header_sid = self.headers.get("X-Session-ID")
            if header_sid and header_sid.strip():
                return header_sid.strip()
        except Exception:
            pass

        try:
            cookie_header = self.headers.get("Cookie")
            if cookie_header:
                for item in cookie_header.split(";"):
                    if "=" in item:
                        k, v = item.strip().split("=", 1)
                        if k in ("moveassist_session_id", "session_id") and v.strip():
                            return v.strip()
        except Exception:
            pass

        if post_data and isinstance(post_data, dict):
            body_sid = post_data.get("session_id")
            if body_sid and str(body_sid).strip():
                return str(body_sid).strip()

        return "default"

    def _get_engine(self, post_data: Optional[dict] = None) -> SimulationEngine:
        """Retrieves session-isolated SimulationEngine for this request."""
        sid = self._extract_session_id(post_data)
        if getattr(self, "session_manager", None) is not None:
            return self.session_manager.get_engine(sid)
        if getattr(self, "engine", None) is not None:
            return self.engine
        return SimulationEngine()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. Real-time Telemetry Stream via SSE (~60 Hz)
        if path == "/api/stream":
            sid = self._extract_session_id()
            engine = self._get_engine()

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            try:
                # Stream frames at ~60 Hz (every 16 ms)
                while True:
                    if getattr(self, "session_manager", None):
                        self.session_manager.touch(sid)
                    telemetry = engine.latest_telemetry
                    if telemetry:
                        payload = f"data: {json.dumps(telemetry)}\n\n".encode("utf-8")
                        self.wfile.write(payload)
                        self.wfile.flush()
                    time.sleep(0.016)
            except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError, OSError):
                # Client disconnected normally
                return
            except Exception:
                return
            return

        # 2. REST Snapshot Endpoint
        if path == "/api/state":
            engine = self._get_engine()
            self._send_json(engine.latest_telemetry or engine.step())
            return

        # 3. Report Status Endpoint
        if path == "/api/report/status":
            engine = self._get_engine()
            self._send_json(engine.recorder.get_status())
            return

        # 4. Excel Report Download (.xlsx)
        if path == "/api/report/download":
            try:
                engine = self._get_engine()
                excel_bytes = engine.generate_excel_report()
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"MoveAssist_Clinical_Report_{timestamp}.xlsx"

                self.send_response(200)
                self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(len(excel_bytes)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(excel_bytes)
            except Exception as e:
                self.send_error(500, f"Error generating Excel report: {str(e)}")
            return

        # 5. CSV Report Download
        if path == "/api/report/csv":
            try:
                engine = self._get_engine()
                csv_text = engine.generate_csv_report()
                csv_bytes = csv_text.encode("utf-8")
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"MoveAssist_Clinical_Report_{timestamp}.csv"

                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(len(csv_bytes)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(csv_bytes)
            except Exception as e:
                self.send_error(500, f"Error generating CSV report: {str(e)}")
            return

        # 6. Static File Serving from frontend/
        if path == "/" or path == "":
            rel_path = "index.html"
        else:
            rel_path = path.lstrip("/")

        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        assets_dir = os.path.abspath(os.path.join(repo_root, "assets"))
        file_path = os.path.abspath(os.path.join(FRONTEND_DIR, rel_path))

        # Check root assets directory if not found in FRONTEND_DIR
        if (not os.path.exists(file_path) or os.path.isdir(file_path)) and (rel_path.startswith("assets") or rel_path.startswith("assets/")):
            alt_path = os.path.abspath(os.path.join(repo_root, rel_path))
            if alt_path.startswith(assets_dir) and os.path.exists(alt_path) and not os.path.isdir(alt_path):
                file_path = alt_path

        # Security check: prevent directory traversal outside FRONTEND_DIR or assets_dir
        allowed_roots = (FRONTEND_DIR, assets_dir)
        if not any(file_path.startswith(r) for r in allowed_roots) or not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_error(404, "File Not Found")
            return

        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error reading file: {str(e)}")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Read JSON body
        content_len = int(self.headers.get("Content-Length", 0))
        post_data = {}
        if content_len > 0:
            try:
                post_data = json.loads(self.rfile.read(content_len).decode("utf-8"))
            except Exception:
                post_data = {}

        engine = self._get_engine(post_data)

        # Route endpoints
        if path == "/api/demo/start":
            engine.start_demo()
            self._send_json({"status": "success", "message": "Clinical demonstration started"})
        elif path == "/api/demo/stop":
            engine.stop_demo()
            self._send_json({"status": "success", "message": "Clinical demonstration stopped"})
        elif path == "/api/safety/estop":
            engine.trigger_estop()
            self._send_json({"status": "success", "message": "Emergency Stop engaged"})
        elif path == "/api/safety/soft_stop":
            duration = float(post_data.get("duration_s", 90.0))
            reason = post_data.get("reason", "MANUAL_CONTROLLED_SOFT_STOP")
            if engine.safety.soft_stop_active:
                engine.update_soft_stop_duration(duration_s=duration, reason=reason)
                self._send_json({"status": "success", "message": f"Controlled soft stop timer updated to {duration}s"})
            else:
                engine.trigger_controlled_soft_stop(duration_s=duration, reason=reason)
                self._send_json({"status": "success", "message": f"Controlled soft stop initiated over {duration}s"})
        elif path == "/api/safety/reset":
            engine.reset_soft_stop()
            success = engine.reset_estop()
            self._send_json({"status": "success" if success else "failed", "e_stop_latched": not success})
        elif path == "/api/fault/inject":
            sensor_type = post_data.get("sensor", "ALL")
            engine.inject_sensor_fault(sensor_type)
            self._send_json({"status": "success", "message": f"Fault injected: {sensor_type}"})
        elif path == "/api/fault/clear":
            engine.clear_sensor_faults()
            self._send_json({"status": "success", "message": "All sensor faults cleared"})
        elif path == "/api/control":
            strength = post_data.get("strength")
            fatigue = post_data.get("fatigue")
            engine.set_user_parameters(strength=strength, fatigue=fatigue)
            self._send_json({"status": "success", "message": "User parameters updated"})
        elif path == "/api/anthropometrics":
            h = float(post_data.get("height_m", 1.75))
            m = float(post_data.get("mass_kg", 72.0))
            engine.update_anthropometrics(h, m)
            self._send_json({"status": "success", "anthropometry": engine.anthro.get_summary()})
        elif path == "/api/calibrate":
            engine.start_calibration()
            self._send_json({"status": "success", "message": "Calibration routine initiated"})
        elif path == "/api/kinematics/mode":
            mode = str(post_data.get("mode", "WALK"))
            jog_angle = float(post_data.get("jog_angle_deg", 0.0))
            hip_jog = float(post_data.get("hip_jog_deg", 0.0))
            shoulder_jog = float(post_data.get("shoulder_jog_deg", 0.0))
            ankle_jog = float(post_data.get("ankle_jog_deg", 0.0))
            elbow_jog = float(post_data.get("elbow_jog_deg", 0.0))
            engine.set_kinematic_mode(
                mode=mode,
                jog_angle_deg=jog_angle,
                hip_jog_deg=hip_jog,
                shoulder_jog_deg=shoulder_jog,
                ankle_jog_deg=ankle_jog,
                elbow_jog_deg=elbow_jog
            )
            self._send_json({
                "status": "success",
                "mode": engine.kinematic_mode,
                "jog_angle_deg": engine.manual_jog_angle_deg,
                "hip_jog_deg": engine.manual_hip_jog_deg,
                "shoulder_jog_deg": engine.manual_shoulder_jog_deg,
                "ankle_jog_deg": engine.manual_ankle_jog_deg,
                "elbow_jog_deg": engine.manual_elbow_jog_deg
            })
        elif path == "/api/simulation/start":
            engine.start_background_loop()
            self._send_json({"status": "success", "running": True})
        elif path == "/api/simulation/stop":
            engine.stop_background_loop()
            self._send_json({"status": "success", "running": False})
        elif path == "/api/simulation/toggle":
            if engine._is_running:
                engine.stop_background_loop()
                running = False
            else:
                engine.start_background_loop()
                running = True
            self._send_json({"status": "success", "running": running})
        else:
            self.send_error(404, "Endpoint Not Found")


def create_server(host: str = DEFAULT_SIM.server_host,
                  port: int = DEFAULT_SIM.server_port,
                  engine: Optional[SimulationEngine] = None,
                  session_manager: Optional[SessionManager] = None) -> ThreadingHTTPServer:
    """Instantiates and configures the MoveAssist server with multi-user isolation."""
    if session_manager is None:
        session_manager = SessionManager(default_engine=engine, dt=DEFAULT_SIM.dt)

    default_engine = session_manager.get_engine("default")
    MoveAssistRequestHandler.session_manager = session_manager
    MoveAssistRequestHandler.engine = default_engine

    server = ThreadingHTTPServer((host, port), MoveAssistRequestHandler)
    return server
