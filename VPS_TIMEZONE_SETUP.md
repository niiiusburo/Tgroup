# VPS Timezone Setup for TG Clinic

## Problem
The Overview page was not displaying appointments because the VPS was using UTC timezone while the application expects Vietnam timezone (Asia/Ho_Chi_Minh, UTC+7).

When the server is in UTC and the client/browser is in Vietnam:
- UTC time might be 2025-01-15 17:00 (5 PM)
- Vietnam time would be 2025-01-16 00:00 (midnight next day)

This causes date mismatches when filtering appointments.

## Solution Applied

### 1. Frontend Changes (website/src/)
Created `lib/dateUtils.ts` with Vietnam timezone-aware date functions:
- `getTodayVietnam()` - Returns YYYY-MM-DD in Vietnam timezone
- `getNowVietnamISO()` - Returns ISO datetime in Vietnam timezone
- `formatToVietnamDate()` - Formats any date to Vietnam timezone
- `isSameDayVietnam()` - Compares two dates in Vietnam timezone

Updated `hooks/useOverviewAppointments.ts` to use Vietnam timezone for fetching today's appointments.

### 2. VPS Timezone Configuration

SSH into your VPS and run these commands:

```bash
# Check current timezone
date
timedatectl

# List available timezones
timedatectl list-timezones | grep Ho_Chi

# Set timezone to Vietnam
timedatectl set-timezone Asia/Ho_Chi_Minh

# Verify the change
date
timedatectl

# Restart the backend API to pick up the new timezone
pm2 restart tgclinic-api  # or however you manage the process
```

### 3. Docker Configuration (if using Docker)

If running the backend in Docker, add this to your docker-compose.yml:

```yaml
services:
  api:
    environment:
      - TZ=Asia/Ho_Chi_Minh
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
```

Or in Dockerfile:

```dockerfile
ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

### 4. Node.js Timezone (Alternative)

If you can't change the system timezone, start the Node.js backend with:

```bash
TZ=Asia/Ho_Chi_Minh node src/server.js
```

Or in your process manager (PM2):

```bash
pm2 start src/server.js --name tgclinic-api --env TZ=Asia/Ho_Chi_Minh
```

## Verification

After making changes:

1. SSH to VPS and check: `date` should show ICT (Indochina Time)
2. Visit the Overview page
3. Today's appointments should now display correctly

## Files Changed

- `website/src/lib/dateUtils.ts` (new file)
- `website/src/hooks/useOverviewAppointments.ts` (updated to use Vietnam timezone)

## Deploy to VPS

```bash
cd /path/to/your/project
git pull origin main
npm run build
# Restart your frontend server
```
