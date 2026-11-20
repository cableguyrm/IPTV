#!/data/data/com.termux/files/usr/bin/bash
# One-step Jarvis installer for Termux (Android).
set -e
BRANCH="ccr-e7fc0a39-01yh0k"
REPO="https://github.com/cableguyrm/IPTV"
DIR="$HOME/jarvis-app"

echo "==> Installing git and python…"
pkg update -y >/dev/null 2>&1 || true
pkg install -y git python >/dev/null

if [ -d "$DIR/.git" ]; then
  echo "==> Updating Jarvis…"
  git -C "$DIR" pull --ff-only
else
  echo "==> Downloading Jarvis…"
  git clone --depth 1 -b "$BRANCH" "$REPO" "$DIR"
fi

echo "==> Creating the 'jarvis' command…"
cat > "$PREFIX/bin/jarvis" <<EOS
#!/data/data/com.termux/files/usr/bin/bash
cd "$DIR/jarvis"
termux-wake-lock 2>/dev/null || true
(sleep 2; termux-open-url http://localhost:8080 2>/dev/null) &
exec python "$DIR/jarvis/serve.py" 8080
EOS
chmod +x "$PREFIX/bin/jarvis"

echo
echo "✅ Installed. Starting Jarvis now (next time just type: jarvis)"
exec jarvis
