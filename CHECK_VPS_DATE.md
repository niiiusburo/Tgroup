# Check VPS Timezone Issue

## Quick Check Command

Run this from your local machine (with your VPS URL):

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website
VPS_URL=http://your-vps-ip-or-domain:port npx playwright test e2e/vps-date-check.spec.ts --workers=1
```

Replace `http://your-vps-ip-or-domain:port` with your actual VPS URL, for example:
- `http://203.0.113.45:5175`
- `https://yourdomain.com`

## What This Test Does

1. Opens your VPS login page
2. Checks the browser's current date/time
3. Compares UTC date vs Vietnam date
4. Reports if they're different (which would cause appointments to not show)

## Expected Output

If working correctly:
```
📅 DATE ANALYSIS:
═══════════════════════════════════════════════════════
UTC Date (YYYY-MM-DD): 2026-04-08
Vietnam Date:          2026-04-08
Status: ✅ Same date
═══════════════════════════════════════════════════════
```

If there's a timezone issue:
```
📅 DATE ANALYSIS:
═══════════════════════════════════════════════════════
UTC Date (YYYY-MM-DD): 2026-04-07  ← Different!
Vietnam Date:          2026-04-08
Status: ⚠️ UTC and Vietnam are different dates!
═══════════════════════════════════════════════════════
```

## Fix the VPS Timezone

If dates are different, SSH into your VPS and run:

```bash
# Check current timezone
date
timedatectl

# Set to Vietnam timezone
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Restart your backend API
pm2 restart tgclinic-api
# or
sudo systemctl restart tgclinic-api

# Verify
date
```

## Alternative: Fix in Docker

If running in Docker, add to your `docker-compose.yml`:

```yaml
services:
  api:
    environment:
      - TZ=Asia/Ho_Chi_Minh
```

Then restart:
```bash
docker-compose up -d
```

## Deploy the Frontend Fix

The frontend now uses Vietnam timezone for dates. Deploy it:

```bash
cd /path/to/Tgroup
git pull origin main
cd website
npm install
npm run build
# Restart your frontend server
```
