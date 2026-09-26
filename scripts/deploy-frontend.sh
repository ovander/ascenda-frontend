#!/bin/bash
# =============================================================================
# deploy-frontend.sh  —  Ascenda frontend deployment, run on the VPS
#
# Lives at: /opt/apps/ascenda/deploy-frontend.sh
# Install:  scp -P 2222 scripts/deploy-frontend.sh olivier@vandermoten.eu:/tmp/deploy-frontend.sh
#           ssh -t -p 2222 olivier@vandermoten.eu \
#               "sudo install -m 755 /tmp/deploy-frontend.sh /opt/apps/ascenda/deploy-frontend.sh"
#
# Usage:    sudo /opt/apps/ascenda/deploy-frontend.sh [version]
#           Normally run by scripts/push.sh, which uploads the build (with a
#           VERSION file) to /tmp/ascenda-frontend first. Without an argument
#           the version is read from that file.
# =============================================================================

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

# -----------------------------
# VERSION
# -----------------------------
# The argument and the uploaded VERSION file (written by push.sh, which builds
# the same version into the bundle) must agree, or the release directory would
# be named after a build it does not hold. Without a VERSION file there is
# nothing to compare, and the argument stands.
PUSHED_VERSION="$(cat "$TMP_DIR/VERSION" 2>/dev/null || echo "")"
VERSION="${1:-$PUSHED_VERSION}"

if [ -z "$VERSION" ]; then
    echo "❌ Usage: $0 <version>   (or run push.sh first; it writes $TMP_DIR/VERSION)"
    exit 1
fi
if [ -n "$PUSHED_VERSION" ] && [ "$VERSION" != "$PUSHED_VERSION" ]; then
    echo "❌ Refusing to deploy: the version you named is not the version that was pushed."
    echo "     argument   $VERSION"
    echo "     pushed     $PUSHED_VERSION   ($TMP_DIR/VERSION)"
    echo "   → deploy what was pushed:   sudo $0 $PUSHED_VERSION"
    echo "   → or push what you meant:   ./scripts/push.sh $VERSION"
    exit 1
fi

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

# Ensure caddy (running as 'caddy' user, group 'olivier') can traverse the path
sudo chmod o+x "$APP_DIR" "$APP_DIR/releases" "$RELEASES_DIR"

ASSET_COUNT=$(find "$RELEASE_DIR" -type f | wc -l | tr -d ' ')
echo "✔ Release created: $RELEASE_DIR ($ASSET_COUNT files)"

# -----------------------------
# SWITCH RELEASE
# -----------------------------
echo "🔁 Switching release..."

# Capture previous target for rollback.
# Only set PREVIOUS if current frontend is already a symlink —
# avoids a circular symlink if this is the first deploy.
if [ -L "$FRONTEND_LINK" ]; then
    PREVIOUS="$(readlink -f $FRONTEND_LINK 2>/dev/null || echo "")"
else
    PREVIOUS=""
fi

# First deploy: if frontend is a plain directory, remove it (was empty)
if [ -d "$FRONTEND_LINK" ] && [ ! -L "$FRONTEND_LINK" ]; then
    echo "⚠️  $FRONTEND_LINK is a plain directory — removing and converting to symlink..."
    sudo rm -rf "$FRONTEND_LINK"
fi

sudo ln -sfn "$RELEASE_DIR" "$FRONTEND_LINK"
echo "✔ $FRONTEND_LINK → $RELEASE_DIR"

# -----------------------------
# HEALTHCHECK
# -----------------------------
# The site must answer, and — when the build carries a VERSION file — serve
# this version's file, which shows the switch reached the web server. The
# query string keeps any cache in between from answering for it.
echo "🌐 Checking site..."

site_ok() {
    SERVED=""
    STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITE_URL" || true)
    case "$STATUS" in 200|301|302) ;; *) return 1 ;; esac
    [ -f "$RELEASE_DIR/VERSION" ] || return 0
    SERVED=$(curl -fs "$SITE_URL/VERSION?deploy=$(date +%s)" || true)
    [ "$SERVED" = "$VERSION" ]
}

HEALTHY=false
for i in {1..10}; do
    if site_ok; then
        HEALTHY=true
        echo "✔ Site healthy (HTTP $STATUS${SERVED:+, serving $SERVED})"
        break
    fi
    echo "  Attempt $i/10 — HTTP $STATUS${SERVED:+, serving ${SERVED:0:40}}, retrying..."
    sleep 2
done

if [ "$HEALTHY" = false ]; then
    echo "❌ Healthcheck failed (HTTP $STATUS${SERVED:+, serving ${SERVED:0:40}} — expected $VERSION)"
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
