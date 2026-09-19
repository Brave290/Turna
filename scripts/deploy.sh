#!/bin/bash
TOKEN="vca_7x3tAayjwRoLiHt070kju9qVtHGdjrUBPwETlFGMduLKBrtBo10hQDot"
TEAM="team_4Oip2T1V6tsEwPsLAOZqHpsN"

for i in 1 2 3 4 5; do
  result=$(curl -s --connect-timeout 20 --max-time 60 \
    -X POST "https://api.vercel.com/v13/deployments?teamId=$TEAM" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"turna","gitSource":{"type":"github","ref":"main","repoId":"1377275810"},"projectSettings":{"framework":"nextjs"}}' 2>&1)
  echo "$result" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Deployment ID: {d.get(\"id\",\"FAILED\")}')
print(f'Status: {d.get(\"readyState\",\"?\")}')
" 2>/dev/null && break
  echo "Attempt $i failed, retrying..."
  sleep 5
done