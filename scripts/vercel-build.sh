#!/usr/bin/env bash
set -euo pipefail

BASE_PATH=/ PORT=3000 pnpm --filter @workspace/landing run build
BASE_PATH=/app/ PORT=3001 pnpm --filter @workspace/ai-flow run build

rm -rf dist
cp -r artifacts/landing/dist/public dist
mkdir -p dist/app
cp -r artifacts/ai-flow/dist/public/. dist/app/
