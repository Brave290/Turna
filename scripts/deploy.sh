#!/bin/bash
TOKEN="vca_7x3tAayjwRoLiHt070kju9qVtHGdjrUBPwETlFGMduLKBrtBo10hQDot"
TEAM="team_4Oip2T1V6tsEwPsLAOZqHpsN"

# Create project
curl -s --connect-timeout 15 --max-time 30 \
  -X POST "https://api.vercel.com/v10/projects?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"turna"}'

echo ""

# Trigger deployment from GitHub
curl -s --connect-timeout 15 --max-time 30 \
  -X POST "https://api.vercel.com/v13/deployments?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"turna","gitSource":{"type":"github","ref":"main","repoId":"Brave290/Turna"},"projectSettings":{"framework":"nextjs","rootDirectory":"apps/web","buildCommand":"pnpm --filter @turna/web build","outputDirectory":".next","installCommand":"pnpm install"}}'
