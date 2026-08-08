#!/bin/sh
set -eu

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install

echo "Building the Next.js project..."
pnpm next build

echo "Compiling custom server..."
mkdir -p dist
npx tsc --project tsconfig.server.json 2>/dev/null || npx esbuild src/server.ts --bundle --platform=node --target=node20 --outfile=dist/server.js --external:next --external:react --external:react-dom

echo "Build completed successfully!"
