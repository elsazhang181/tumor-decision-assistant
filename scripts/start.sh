#!/bin/sh
set -eu

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

# 平台（Zeabur / Railway / Vercel 容器）通过 PORT 注入端口；默认 3000
PORT="${PORT:-3000}"
export PORT

echo "Starting HTTP service on port ${PORT}..."

# 优先使用自定义 server（若已构建 dist/server.js）；否则回退到标准 next start
if [ -f "dist/server.js" ]; then
  echo "Using custom server: dist/server.js"
  node dist/server.js
else
  echo "Custom server not found, using standard 'next start'"
  exec npx next start -p "${PORT}" -H 0.0.0.0
fi
