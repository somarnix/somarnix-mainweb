#!/usr/bin/env bash

set -Eeuo pipefail
trap 'status=$?; echo "Deploy failed at line ${LINENO}: ${BASH_COMMAND} (exit ${status})" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_DIR="${APP_DIR:-${REPO_DIR}}"
APP_NAME="${APP_NAME:-somarnix}"
BRANCH="${BRANCH:-main}"

echo "Deploying ${APP_NAME} from ${APP_DIR} on branch ${BRANCH}"

load_node_runtime() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  echo "Loading Node.js runtime"

  if [ -n "${NODE_BIN_DIR:-}" ] && [ -d "${NODE_BIN_DIR}" ]; then
    export PATH="${NODE_BIN_DIR}:$PATH"
  fi

  for node_bin_dir in \
    "$HOME/.npm-global/bin" \
    "$HOME/.local/bin" \
    "$HOME/bin" \
    "/usr/local/bin" \
    "/usr/bin" \
    "/bin" \
    "/opt/cpanel/ea-nodejs22/bin" \
    "/opt/cpanel/ea-nodejs20/bin" \
    "/opt/cpanel/ea-nodejs18/bin" \
    "/opt/alt/alt-nodejs22/root/usr/bin" \
    "/opt/alt/alt-nodejs20/root/usr/bin" \
    "/opt/alt/alt-nodejs18/root/usr/bin"; do
    if [ -d "$node_bin_dir" ]; then
      export PATH="$node_bin_dir:$PATH"
    fi
  done

  if ! command -v npm >/dev/null 2>&1; then
    for npm_path in \
      "$HOME"/.nvm/versions/node/*/bin/npm \
      "/usr/local/nvm/versions/node"/*/bin/npm \
      "$HOME"/nodevenv/*/*/bin/npm \
      "$HOME"/nodevenv/*/bin/npm; do
      if [ -x "$npm_path" ]; then
        export PATH="$(dirname "$npm_path"):$PATH"
        break
      fi
    done
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm was not found in the SSH deploy environment." >&2
    echo "Current PATH: $PATH" >&2
    echo "Install Node.js/npm on the VPS, or set the GitHub secret VPS_NODE_BIN_DIR to the folder containing node and npm." >&2
    exit 127
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "node was not found, even though npm exists at $(command -v npm)." >&2
    echo "Current PATH: $PATH" >&2
    exit 127
  fi

  echo "node path: $(command -v node)"
  echo "npm path: $(command -v npm)"
  echo "Node: $(node --version)"
  echo "npm: $(npm --version)"
}

if [ ! -d "${APP_DIR}" ]; then
  echo "APP_DIR does not exist: ${APP_DIR}" >&2
  echo "Set the GitHub secret VPS_APP_DIR to the folder that contains this repo." >&2
  exit 1
fi

cd "${APP_DIR}"
load_node_runtime

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "APP_DIR is not a git repository: ${APP_DIR}" >&2
  exit 1
fi

git fetch origin "${BRANCH}"
git checkout -B "${BRANCH}" "origin/${BRANCH}"
git pull --ff-only origin "${BRANCH}"

if [ -f package-lock.json ]; then
  npm ci --include=dev
else
  npm install
fi

npm run build

export APP_DIR APP_NAME
if command -v pm2 >/dev/null 2>&1; then
  PM2_CMD=(pm2)
else
  PM2_CMD=(npx --yes pm2)
fi

"${PM2_CMD[@]}" startOrReload ecosystem.config.cjs --only "${APP_NAME}" --update-env
"${PM2_CMD[@]}" save
"${PM2_CMD[@]}" status "${APP_NAME}"
