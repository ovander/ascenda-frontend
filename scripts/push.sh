#!/bin/bash
set -euo pipefail

# ==============================
# CONFIG
# ==============================
SSH_USER="olivier"
SSH_HOST="vandermoten.eu"
SSH_PORT="2222"
REMOTE="${SSH_USER}@${SSH_HOST}"

APP_NAME="ascenda"

VERSION="${1:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

LOCAL_DIST="dist"
REMOTE_TMP_DIR="/tmp/ascenda-frontend"

# ==============================
# GUARD: prevent dirty release
# ==============================
if [[ "${VERSION}" == *"-dirty"* ]]; then
  echo "❌ Working tree is dirty. Commit your changes before deploying."
  exit 1
fi

# ==============================
# BUILD
# ==============================
echo "=============================="
echo "🔨 Building ${APP_NAME} frontend"
echo "Version:  ${VERSION}"
echo "Commit:   ${COMMIT}"
echo "Time:     ${BUILD_TIME}"
echo "=============================="

npm run build

# ==============================
# VALIDATION
# ==============================
echo "🔍 Validating build output..."

if [ ! -d "${LOCAL_DIST}" ]; then
  echo "❌ Build failed — dist/ directory not found"
  exit 1
fi

if [ ! -f "${LOCAL_DIST}/index.html" ]; then
  echo "❌ Build failed — dist/index.html not found"
  exit 1
fi

ASSET_COUNT=$(find "${LOCAL_DIST}" -type f | wc -l | tr -d ' ')
echo "✔ Build output: ${ASSET_COUNT} files in ${LOCAL_DIST}/"

# ==============================
# CHECKSUM
# ==============================
echo "🔐 Generating checksum..."
CHECKSUM=$(shasum -a 256 "${LOCAL_DIST}/index.html" | awk '{print $1}')
echo "Checksum (index.html): ${CHECKSUM}"

# ==============================
# UPLOAD
# ==============================
echo "📁 Preparing remote tmp..."
ssh -p ${SSH_PORT} ${REMOTE} "rm -rf ${REMOTE_TMP_DIR} && mkdir -p ${REMOTE_TMP_DIR}"

echo "📤 Uploading dist/ → ${REMOTE}:${REMOTE_TMP_DIR}/ ..."
rsync -az --delete \
  --exclude='.DS_Store' \
  -e "ssh -p ${SSH_PORT}" \
  "${LOCAL_DIST}/" "${REMOTE}:${REMOTE_TMP_DIR}/"

# ==============================
# VERIFY REMOTE
# ==============================
echo "🔍 Verifying remote upload..."
ssh -p ${SSH_PORT} ${REMOTE} "
  REMOTE_COUNT=\$(find ${REMOTE_TMP_DIR} -type f | wc -l | tr -d ' ')
  echo \"Remote files: \${REMOTE_COUNT}\"
  ls -lh ${REMOTE_TMP_DIR}/index.html
"

# ==============================
# FINAL INSTRUCTIONS
# ==============================
echo ""
echo "=============================="
echo "✅ PUSH COMPLETE"
echo "=============================="
echo ""
echo "➡️  Next steps on VPS:"
echo ""
echo "    ssh -p ${SSH_PORT} ${REMOTE}"
echo ""
echo "    sudo /opt/apps/${APP_NAME}/deploy-frontend.sh ${VERSION}"
echo ""
echo "=============================="
