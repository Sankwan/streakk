"""Serve the prebuilt Streak integration locally without downloading anything."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import webbrowser
root = Path(__file__).resolve().parent / "dist"
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
try:
    server = ThreadingHTTPServer(("127.0.0.1", 8768), handler)
except OSError as exc:
    raise SystemExit(f"Could not use port 8768: {exc}. Close the other Streak server and try again.")
print("Streak: http://127.0.0.1:8768/ — Ctrl+C to stop", flush=True)
webbrowser.open("http://127.0.0.1:8768/")
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
