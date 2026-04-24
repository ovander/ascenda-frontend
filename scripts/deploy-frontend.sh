#!/bin/bash

set -euo pipefail

echo "=============================="
echo "🚀 Ascenda Frontend Deployment START"
echo "Date: $(date -u)"
echo "=============================="

# -----------------------------
# CONFIG
# -----------------------------
APP_DIR="/opt/apps/ascenda"
RELEASES_DIR="$APP_DIR/releases/frontend"
FRONTEND_LINK="$APP_DIR/frontend"

TMP_DIR="/tmp/ascenda-frontend"

USER="olivier"
SITE_URL="https://ascenda.vandermoten.eu"

VERSION="${1:-unknown}"
RELEASE_DIR="$RELEASES_DIR/$VERSION"

# -----------------------------
# ROLLBACK
# -----------------------------
rollback() {
    echo "❌ Deployment failed — rolling back..."

    if [ -n "${PREVIOUS:-}" ] && [ -e "$PREVIOUS" ]; then
        sudo ln -sfn "$PREVIOUS" "$FRONTEND_LINK"
        echo "✔ Rolled back to: $PREVIOUS"
    else
        echo "⚠️ No previous release to roll back to"
    fi

    exit 1
}

trap rollback ERR

# -----------------------------
# PRECHECKS
# -----------------------------
echo "🔍 Pre-checks..."

[ -d "$TMP_DIR" ]            || { echo "❌ Missing upload in $TMP_DIR — run push.sh first"; exit 1; }
[ -f "$TMP_DIR/index.html" ] || { echo "❌ Missing index.html in $TMP_DIR"; exit 1; }

echo "✔ Pre-checks OK"

# -----------------------------
# CREATE RELEASE
# -----------------------------
echo "📁 Creating release $VERSION..."

sudo mkdir -p "$RELEASE_DIR"
sudo cp -r "$TMP_DIR/." "$RELEASE_DIR/"
sudo chown -R $USER:$USER "$RELEASE_DIR"
sudo find "$RELEASE_DIR" -type d -exec chmod 755 {} \;
sudo find "$RELEASE_DIR" -type f -exec chmod 644 {} \;

ASSET_COUNT=$(find "$RELEASE_DIR" -type f | wc -l | tr -d ' ')
echo "✔ Release created: $RELEASE_DIR ($ASSET_COUNT files)"

# -----------------------------
# SWITCH RELEASE
# -----------------------------
echo "🔁 Switching release..."

# Capture previous target for rollback
PREVIOUS="$(readlink -f $FRONTEND_LINK 2>/dev/null || echo "")"

# First deploy: if frontend is a plain directory, back it up
if [ -d "$FRONTEND_LINK" ] && [ ! -L "$FRONTEND_LINK" ]; then
    echo "⚠️  $FRONTEND_LINK is a plain directory — backing up and converting to symlink..."
    sudo mv "$FRONTEND_LINK" "${FRONTEND_LINK}.bak"
fi

sudo ln -sfn "$RELEASE_DIR" "$FRONTEND_LINK"
echo "✔ $FRONTEND_LINK → $RELEASE_DIR"

# -----------------------------
# HEALTHCHECK
# -----------------------------
echo "🌐 Checking site..."

for i in {1..10}; do
    STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITE_URL" || true)
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
        echo "✔ Site healthy (HTTP $STATUS)"
        break
    fi
    echo "  Attempt $i/10 — HTTP $STATUS, retrying..."
    sleep 2
done

STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITE_URL" || true)
if [ "$STATUS" != "200" ] && [ "$STATUS" != "301" ] && [ "$STATUS" != "302" ]; then
    echo "❌ Healthcheck failed (HTTP $STATUS)"
    rollback
fi

# -----------------------------
# CLEANUP TMP
# -----------------------------
echo "🧹 Cleaning upload temp..."
rm -rf "$TMP_DIR"

# -----------------------------
# CLEAN OLD RELEASES (keep last 5)
# -----------------------------
echo "🧹 Cleaning old releases (keep last 5)..."

cd "$RELEASES_DIR"
KEPT=$(ls -dt */ 2>/dev/null | head -5 | tr '\n' ' ')
ls -dt */ 2>/dev/null | tail -n +6 | xargs -r sudo rm -rf

echo "✔ Releases kept: $KEPT"

# -----------------------------
# DONE
# -----------------------------
echo ""
echo "=============================="
echo "✅ Deployment SUCCESS"
echo "Version: $VERSION"
echo "URL:     $SITE_URL"
echo "=============================="
