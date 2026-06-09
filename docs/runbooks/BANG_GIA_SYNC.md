# Bảng Giá (`/bang-gia`) — Google Sheet Live Sync

## Source of truth

| Item | Value |
|------|--------|
| Google Sheet ID | `19YZB-SgpqvI3-hu93xOk0OCDWtUPxrAAfR6CiFpU4GY` |
| URL | https://docs.google.com/spreadsheets/d/19YZB-SgpqvI3-hu93xOk0OCDWtUPxrAAfR6CiFpU4GY/edit |
| Legacy reference | `ctv2checkin/modules/pricing_sync.py` |

Edit the sheet → NK3 API sync worker pulls changes → writes `pricing.json` + `index.html` → CTV `/bang-gia` page reloads every 30s and shows new prices.

## How it works

1. **API worker** (`api/src/services/pricingSyncWorker.js`) runs when `PRICING_SYNC_ENABLED=true`.
2. Default interval: **30 seconds** (`PRICING_SYNC_INTERVAL_MS=30000`).
3. Each cycle: Google Sheets API → parse rows → write:
   - `website/public/bang-gia/data/pricing.json` (source prices)
   - `website/public/bang-gia/index.html` (rendered page; optional display discount from `pricing_discount.json`)
4. **Browser** (`pricing.js`): full page reload every 30s to pick up new static files.
5. **Status endpoint** (no auth): `GET /api/public/bang-gia/status`

## Environment

```bash
PRICING_SYNC_ENABLED=true
PRICING_SYNC_INTERVAL_MS=30000
PRICING_SHEET_ID=19YZB-SgpqvI3-hu93xOk0OCDWtUPxrAAfR6CiFpU4GY
GOOGLE_CREDENTIALS_FILE=/secrets/google_credentials.json
BANG_GIA_OUTPUT_DIR=/bang-gia-output   # NK3 Docker volume → website/public/bang-gia on host
```

Credentials: same Google **service account** as legacy `ctv2checkin` (`google_credentials.json`). The sheet must be shared with the service account email (Editor or Viewer).

## NK3 Docker volumes

See `runtime/docker-compose.nk3.yml`:

- **API** writes to `/bang-gia-output` (host: `/opt/tgroup-nk3/app/website/public/bang-gia`)
- **Web** mounts the same path read-only over `/usr/share/nginx/html/bang-gia`

No web rebuild needed for price updates after initial deploy.

## Manual one-off sync (local)

```bash
cd api
PRICING_SYNC_ENABLED=true \
GOOGLE_CREDENTIALS_FILE=../path/to/google_credentials.json \
node -e "require('./src/services/pricingSyncWorker').runPricingSyncOnce().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})"
```

Or bake from existing JSON only (no Google):

```bash
node website/scripts/generate-bang-gia.mjs
```

## Verification

```bash
curl -s https://tmv.2checkin.com/api/public/bang-gia/status | jq
curl -s https://tmv.2checkin.com/bang-gia/data/pricing.json | jq '.updated_at,.categories|length'
```

Expect `lastSuccessAt` advancing every ~30s and `categoryCount` = 16 when healthy.