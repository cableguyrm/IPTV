#!/data/data/com.termux/files/usr/bin/env sh
# Serve Jarvis from the phone itself (Termux). localhost counts as a secure
# origin, so voice, WebGPU, install and offline mode all work.
cd "$(dirname "$0")"
PORT="${1:-8080}"
exec python serve.py "$PORT"
