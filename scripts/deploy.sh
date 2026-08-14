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

npm ci --include=dev
npm run lint
npm run typecheck
npm test
rm -rf .next.previous
if [[ -d .next ]]; then
  mv .next .next.previous
fi

restore_previous_build() {
  if [[ ! -d .next/standalone && -d .next.previous ]]; then
    rm -rf .next
    mv .next.previous .next
  fi
}

trap restore_previous_build EXIT
npm run build
mkdir -p .next/standalone/.next
cp -R public .next/standalone/
cp -R .next/static .next/standalone/.next/
rm -rf .next.previous
trap - EXIT
touch tmp/restart.txt
