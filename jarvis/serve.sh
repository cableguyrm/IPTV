#!/data/data/com.termux/files/usr/bin/env sh
# Serve Jarvis from the phone itself (Termux). localhost counts as a secure
# origin, so voice, WebGPU, install and offline mode all work.
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Jarvis running at http://localhost:$PORT  (open it in Chrome, then ⋮ → Install app)"
exec python -m http.server "$PORT" --bind 127.0.0.1
