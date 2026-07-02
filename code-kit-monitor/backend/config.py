"""code-kit-monitor 后端配置."""
import os

SPECS_DIR: str = os.environ.get("SPECS_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".specs"))
HOST: str = os.environ.get("HOST", "127.0.0.1")
PORT: int = int(os.environ.get("PORT", "8000"))
SCAN_INTERVAL: int = int(os.environ.get("SCAN_INTERVAL", "5"))
CORS_ORIGIN: str = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
