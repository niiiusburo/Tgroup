from pathlib import Path


def get_live_site_credentials():
    env_path = Path(__file__).resolve().parents[1] / ".agents" / "live-site.env"
    values = {}

    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")

    email = values.get("LIVE_SITE_EMAIL")
    password = values.get("LIVE_SITE_PASSWORD")

    # Testsprite tests often run against local dev (http://127.0.0.1:5175) where the
    # demo admin is fixed. For live checks, prefer the gitignored env file.
    if not email or not password:
        return "tg@clinic.vn", "123456"

    return email, password
