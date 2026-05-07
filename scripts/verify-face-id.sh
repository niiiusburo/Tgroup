#!/bin/bash
set -e

echo "=== Face ID V1 Local Verification ==="

# 1. Build and start face-service
echo "[1/5] Building face-service container..."
cd face-service
docker build -t face-service-verify . > /dev/null 2>&1
cd ..

echo "[2/5] Starting face-service on port 8000..."
docker run --rm -d -p 18000:8000 --name face-service-verify face-service-verify > /dev/null
sleep 5

# Verify face-service health
echo "[3/5] Checking face-service health..."
curl -s http://localhost:18000/health | grep -q '"status":"ok"' && echo "✅ Face service healthy" || (echo "❌ Face service unhealthy"; exit 1)

# 4. Start API with face-service URL
echo "[4/5] Starting API server..."
cd api
FACE_SERVICE_URL=http://localhost:18000 node src/server.js &
API_PID=$!
cd ..
sleep 3

# Verify API health
curl -s http://localhost:3002/api/health | grep -q '"status":"healthy"' && echo "✅ API healthy" || (echo "❌ API unhealthy"; kill $API_PID 2>/dev/null; docker stop face-service-verify > /dev/null; exit 1)

# 5. Test recognition with blank image
echo "[5/5] Testing /api/face/recognize with blank image..."
node -e "
const buf = Buffer.from([0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xFF,0xD9]);
require('fs').writeFileSync('/tmp/blank.jpg', buf);
"

# Note: This will fail auth, but we can at least verify the endpoint responds
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3002/api/face/recognize -F "image=@/tmp/blank.jpg" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Recognition endpoint responds (HTTP $HTTP_CODE)"
else
  echo "⚠️ Recognition endpoint returned HTTP $HTTP_CODE (expected 401 or 200)"
fi

# Cleanup
echo "Cleaning up..."
kill $API_PID 2>/dev/null
docker stop face-service-verify > /dev/null 2>&1

echo "=== Verification Complete ==="
