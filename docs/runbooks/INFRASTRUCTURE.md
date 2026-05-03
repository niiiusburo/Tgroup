# INFRASTRUCTURE.md

> Infrastructure map for TGClinic.

## Runtime Components

- `nginx`: TLS termination, static web serving, `/api` proxy.
- `tgroup-web`: built Vite frontend.
- `tgroup-api`: Express API.
- `tgroup-db`: PostgreSQL 16 with `dbo` schema.
- Optional Compreface services for face recognition.
- External Hosoonline service for health-checkup images.

## Configuration

Real env files are local/prod secrets and must not be tracked. Use `.env.example` as the documented shape and keep real values in local/VPS secret storage.

Important env groups:

- PostgreSQL connection values.
- JWT secret.
- Google Places key.
- Compreface URL/API key.
- Hosoonline base URL, API key, username, password.
- Allowed origins / frontend URLs.

## Nginx

`nginx.conf` and `nginx.docker.conf` must stay aligned for API proxy behavior and upload/static paths.

Large exports require longer proxy timeouts than the default 60s behavior. Any production nginx config serving `/api/Exports/:type/download` should keep API proxy read/send timeouts at 300s or higher, then verify a services/payments export from the live site after deploy.

When an infra worker changes nginx source files, keep these directives aligned for the `/api` proxy in both nginx configs:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
send_timeout 300s;
```

## Docker

For compose-level changes:

```bash
docker compose config
bash -n scripts/deploy-tbot.sh
```

Do not mix infra changes with unrelated UI/API feature work in the same commit unless the infra change is required for that feature and documented.
