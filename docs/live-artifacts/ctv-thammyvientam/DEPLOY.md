# Deploy: ctv.thammyvientam.com landing + NK3 forward

## Goal
Keep `https://ctv.thammyvientam.com/` as the public landing page, serve its `/static/` assets directly from nginx, and redirect every other path to NK3 at `https://tmv.2checkin.com`.

## Files Changed
- `docs/live-artifacts/ctv-thammyvientam/ctv-canonical.conf` - active nginx server block for `ctv.thammyvientam.com`

## VPS Deploy Steps

### 1. SSH to VPS
```bash
ssh root@76.13.16.68
```

### 2. Backup current active nginx config
```bash
backup="/etc/nginx/sites-available/ctv-canonical.conf.bak-$(date -u +%Y%m%dT%H%M%SZ)"
cp /etc/nginx/sites-available/ctv-canonical.conf "$backup"
echo "$backup"
```

### 3. Install static landing files
```bash
mkdir -p /var/www/ctv-thammyvientam-landing/static/images
install -m 0644 /tmp/ctv-root.html /var/www/ctv-thammyvientam-landing/index.html
install -m 0644 /tmp/ctv-logo.png /var/www/ctv-thammyvientam-landing/static/images/tam-logo-group.png
install -m 0644 /tmp/ctv-favicon.png /var/www/ctv-thammyvientam-landing/static/images/favicon.png
install -m 0644 /tmp/ctv-favicon.ico /var/www/ctv-thammyvientam-landing/static/images/favicon.ico
```

### 4. Install nginx config
```bash
cp /opt/tgroup/docs/live-artifacts/ctv-thammyvientam/ctv-canonical.conf \
   /etc/nginx/sites-available/ctv-canonical.conf

nginx -t
systemctl reload nginx
```

`/etc/nginx/sites-enabled/ctv-canonical.conf` is already the active symlink on the VPS. Do not enable the older `/etc/nginx/sites-available/ctv.thammyvientam.com` file; it is not the live vhost.

### 5. Ensure SSL cert exists
If Let's Encrypt cert for `ctv.thammyvientam.com` does not yet exist:
```bash
certbot --nginx -d ctv.thammyvientam.com
```

### 6. Verify
```bash
# Root remains on ctv.thammyvientam.com.
curl --http1.1 -s -o /dev/null -w "%{http_code} %{url_effective}\n" \
  https://ctv.thammyvientam.com/

# Static landing assets remain on ctv.thammyvientam.com.
curl --http1.1 -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  "https://ctv.thammyvientam.com/static/images/tam-logo-group.png?v=1778133986"

# Non-root routes forward to NK3 with path/query preserved.
curl --http1.1 -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "https://ctv.thammyvientam.com/booking?source=verify"
curl --http1.1 -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  https://ctv.thammyvientam.com/ctv/portal
```

### 7. Browser check
Open these and capture screenshots:

- `https://ctv.thammyvientam.com/` - landing page still visible.
- `https://ctv.thammyvientam.com/booking?source=verify` - lands on `https://tmv.2checkin.com/booking?source=verify`.
- `https://ctv.thammyvientam.com/ctv/portal` - lands on `https://tmv.2checkin.com/ctv/portal`.

## Rollback

```bash
cp "$backup" /etc/nginx/sites-available/ctv-canonical.conf
nginx -t
systemctl reload nginx
```
