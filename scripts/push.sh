#!/usr/bin/env bash
# =============================================================================
# push.sh  —  Ascenda frontend build, upload & deploy to the VPS
#
# Reference model: vandermoten.eu · Multi-App VPS · April 2026
#
# Usage:
#   ./scripts/push.sh [version]              # build, upload, deploy
#   ./scripts/push.sh [version] --no-deploy  # build and upload only
#
#   version  a vX.Y.Z tag on HEAD; without it, the v* tag on HEAD is used
#            (see scripts/version-guard.sh — it refuses a dirty or untagged tree)
#
# What it does:
#   1. Resolve and check the version (scripts/version-guard.sh)
#   2. npm ci + a clean production build (.env.production), with the version
#      built in (VITE_APP_VERSION) and written to dist/VERSION
#   3. Upload dist/ to /tmp/ascenda-frontend
#   4. Run /opt/apps/ascenda/deploy-frontend.sh <version> on the VPS
#      (sudo may ask for your password): a new release directory, an atomic
#      switch of the frontend link, a check that the site serves the new
#      version, and a rollback if it does not
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SSH_USER="olivier"
SSH_HOST="vandermoten.eu"
SSH_PORT="2222"
REMOTE="${SSH_USER}@${SSH_HOST}"
SSH_OPTS=(-p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new)

REMOTE_TMP_DIR="/tmp/ascenda-frontend"
REMOTE_DEPLOY="/opt/apps/ascenda/deploy-frontend.sh"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${REPO_ROOT}/dist"

# ── Arguments ─────────────────────────────────────────────────────────────────
DEPLOY=true
REQUESTED=""
for arg in "$@"; do
  case "${arg}" in
    --no-deploy) DEPLOY=false ;;
    -h|--help)   sed -n '2,23p' "$0"; exit 0 ;;
    -*)          echo "❌ Unknown option: ${arg}" >&2; exit 1 ;;
    *)           REQUESTED="${arg}" ;;
  esac
done

# ── 1. Version ────────────────────────────────────────────────────────────────
VERSION="$(bash "${REPO_ROOT}/scripts/version-guard.sh" "${REPO_ROOT}" "${REQUESTED}")"
COMMIT="$(git -C "${REPO_ROOT}" rev-parse --short HEAD)"

echo "=============================="
echo "🔨 Building Ascenda frontend ${VERSION}"
echo "Commit:   ${COMMIT}"
echo "Target:   ${REMOTE}"
echo "=============================="

# ── 2. Build ──────────────────────────────────────────────────────────────────
cd "${REPO_ROOT}"
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit --no-fund

# vite.config.ts keeps old files in dist/ (emptyOutDir: false), so start from
# an empty directory: the upload must be this build and nothing else.
rm -rf "${DIST}"
echo "🔨 Building for production (uses .env.production)..."
VITE_APP_VERSION="${VERSION}" npm run build

[ -f "${DIST}/index.html" ] || { echo "❌ Build failed — dist/index.html not found" >&2; exit 1; }
echo "${VERSION}" > "${DIST}/VERSION"
FILE_COUNT="$(find "${DIST}" -type f | wc -l | tr -d ' ')"
echo "✔ Build output: ${FILE_COUNT} files"

# ── 3. Upload ─────────────────────────────────────────────────────────────────
echo "📤 Uploading dist/ → ${REMOTE}:${REMOTE_TMP_DIR}/"
ssh "${SSH_OPTS[@]}" "${REMOTE}" "rm -rf ${REMOTE_TMP_DIR} && mkdir -p ${REMOTE_TMP_DIR}"
rsync -az --exclude='.DS_Store' -e "ssh ${SSH_OPTS[*]}" "${DIST}/" "${REMOTE}:${REMOTE_TMP_DIR}/"

REMOTE_COUNT="$(ssh "${SSH_OPTS[@]}" "${REMOTE}" "find ${REMOTE_TMP_DIR} -type f | wc -l" | tr -d ' ')"
if [ "${REMOTE_COUNT}" != "${FILE_COUNT}" ]; then
  echo "❌ Upload incomplete: ${REMOTE_COUNT} files on the VPS, ${FILE_COUNT} built" >&2
  exit 1
fi
echo "✔ Upload verified (${REMOTE_COUNT} files)"

# The VPS runs its own copy of deploy-frontend.sh; say so when it is not this one.
LOCAL_DEPLOY_SUM="$(shasum -a 256 "${REPO_ROOT}/scripts/deploy-frontend.sh" | awk '{ print $1 }')"
REMOTE_DEPLOY_SUM="$(ssh "${SSH_OPTS[@]}" "${REMOTE}" "sha256sum ${REMOTE_DEPLOY} 2>/dev/null" | awk '{ print $1 }' || true)"
if [ "${LOCAL_DEPLOY_SUM}" != "${REMOTE_DEPLOY_SUM}" ]; then
  echo "⚠️  ${REMOTE_DEPLOY} differs from scripts/deploy-frontend.sh — to install this one:"
  echo "    scp -P ${SSH_PORT} scripts/deploy-frontend.sh ${REMOTE}:/tmp/deploy-frontend.sh"
  echo "    ssh -t -p ${SSH_PORT} ${REMOTE} 'sudo install -m 755 /tmp/deploy-frontend.sh ${REMOTE_DEPLOY}'"
fi

# ── 4. Deploy ─────────────────────────────────────────────────────────────────
if [ "${DEPLOY}" = false ]; then
  echo ""
  echo "=============================="
  echo "✅ ${VERSION} uploaded (not deployed)"
  echo ""
  echo "➡️  To deploy:"
  echo "    ssh -p ${SSH_PORT} ${REMOTE}"
  echo "    sudo ${REMOTE_DEPLOY} ${VERSION}"
  echo "=============================="
  exit 0
fi

echo "🚀 Deploying on the VPS..."
ssh -t "${SSH_OPTS[@]}" "${REMOTE}" "sudo ${REMOTE_DEPLOY} ${VERSION}"
