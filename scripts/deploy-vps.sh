#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/home/somarnix/htdocs/somarnix.com}"
APP_NAME="${APP_NAME:-somarnix}"
BRANCH="${BRANCH:-main}"

echo "Deploying ${APP_NAME} from ${APP_DIR} on branch ${BRANCH}"

cd "${APP_DIR}"

git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"
npm install
npm run build

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  pm2 start ecosystem.config.cjs --only "${APP_NAME}" --update-env
fi

pm2 save
pm2 status "${APP_NAME}"
