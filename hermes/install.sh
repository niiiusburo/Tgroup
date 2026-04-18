#!/bin/bash
set -euo pipefail

# ============================================================
# Hermes — Install Script
# Sets up: Python venv, Chromium, systemd timer, test account
# ============================================================

HERMES_DIR="/opt/hermes"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Installing Hermes Synthetic Monitor..."
echo "   Target: $HERMES_DIR"
echo ""

# 1. Create directory
echo "📁 Setting up directory..."
mkdir -p "$HERMES_DIR/screenshots"
cp -r "$REPO_DIR"/* "$HERMES_DIR/" 2>/dev/null || true
cd "$HERMES_DIR"

# 2. Install Python + venv
echo "🐍 Setting up Python..."
if ! command -v python3 &> /dev/null; then
    apt update && apt install -y python3 python3-venv python3-pip
fi

python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
echo "📦 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Install Chromium for browser-use
echo "🌐 Installing Chromium (headless)..."
.venv/bin/python -m playwright install chromium
.venv/bin/python -m playwright install-deps chromium 2>/dev/null || apt install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 2>/dev/null || true

# 5. Create hermes@clinic.vn account via API
echo "👤 Creating test account (hermes@clinic.vn)..."
echo "   NOTE: You will need to set the password in hermes-map.yaml"
echo "   and ensure the account exists in the database."
echo ""

# 6. Configure
echo "⚙️  Configuration needed:"
echo "   1. Edit $HERMES_DIR/hermes-map.yaml"
echo "      - Set site.password for hermes@clinic.vn"
echo "      - Set telegram.bot_token and chat_id"
echo "      - Set model_api_keys"
echo ""

# 7. Install systemd units
echo "⏰ Installing systemd timer..."
cp "$HERMES_DIR/hermes.service" /etc/systemd/system/
cp "$HERMES_DIR/hermes.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable hermes.timer

echo ""
echo "✅ Hermes installed!"
echo ""
echo "Next steps:"
echo "  1. Edit config:  vi $HERMES_DIR/hermes-map.yaml"
echo "  2. Test models:  $HERMES_DIR/.venv/bin/python hermes.py --test-models"
echo "  3. Run baseline: $HERMES_DIR/.venv/bin/python hermes.py --baseline"
echo "  4. Start timer:  systemctl start hermes.timer"
echo "  5. Check status: systemctl status hermes.timer"
echo "  6. View logs:    tail -f $HERMES_DIR/hermes.log"
echo ""
