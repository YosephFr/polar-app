#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p logs tmp

exec 9>tmp/deploy.lock
if ! flock -n 9; then
  exit 0
fi

git pull --ff-only origin main
export GIT_SHA
GIT_SHA="$(git rev-parse HEAD)"
export NEXT_PUBLIC_BUILD_ID="$GIT_SHA"

npm ci
npm run check
mkdir -p .next/standalone/.next
cp -R public .next/standalone/
cp -R .next/static .next/standalone/.next/
touch tmp/restart.txt
