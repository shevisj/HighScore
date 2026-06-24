#!/usr/bin/env bash
# Bootstrap the HighScore workspace after the dev container is created.
set -euo pipefail

echo "==> Installing npm dependencies"
npm install

# Seed a local .env from the example if one does not already exist, pointing the
# database at the bundled mongo service.
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  sed -i 's#^HIGHSCORE_DB_URL=.*#HIGHSCORE_DB_URL=mongodb://mongo:27017/highscore#' .env
else
  echo "==> .env already exists, leaving it untouched"
fi

echo "==> Done. Run 'npm run start' to launch the API on http://localhost:8081"
