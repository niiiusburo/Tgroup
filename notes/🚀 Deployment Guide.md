# TGroup Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL client (optional)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd Tgroup

# 2. Start the database
docker-compose up -d

# 3. Install frontend dependencies
cd website && npm install

# 4. Install backend dependencies
cd ../api && npm install

# 5. Start development servers
# Terminal 1: Frontend
cd website && npm run dev

# Terminal 2: Backend
cd api && npm run dev
```

### Database Connection
- **Host:** `127.0.0.1`
- **Port:** `55433`
- **Database:** `tdental_demo`
- **User:** `postgres`
- **Password:** `postgres`

```bash
# Connect via CLI
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo
```

## Production Deployment (VPS)

### Server Requirements
- Ubuntu 20.04+ LTS
- Docker 20.10+
- Nginx
- SSL certificates (Let's Encrypt)

### Deployment Steps

1. **SSH to VPS**
```bash
ssh root@<vps-ip>
```

2. **Install Docker**
```bash
curl -fsSL https://get.docker.com | sh
```

3. **Clone/Update Repository**
```bash
cd /opt/tgroup
git pull origin main
```

4. **Build Docker Images**
```bash
docker-compose build
```

5. **Deploy**
```bash
docker-compose up -d
```

6. **Verify**
```bash
docker-compose ps
curl -I https://tdental.example.com
```

## Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: tdental_demo
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "55433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./demo_tdental.sql:/docker-entrypoint-initdb.d/init.sql

  api:
    build:
      context: ./api
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/tdental_demo
    depends_on:
      - postgres

  web:
    build:
      context: ./website
      dockerfile: Dockerfile.web
    ports:
      - "3000:80"
    depends_on:
      - api

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - api

volumes:
  postgres_data:
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name tdental.example.com;

    location / {
        proxy_pass http://web:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://api:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend Build Issues
```bash
cd website
rm -rf node_modules dist
npm install
npm run build
```

### API Issues
```bash
cd api
rm -rf node_modules
npm install
npm run dev
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo
PORT=3001
NODE_ENV=development
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose up -d

# View logs
docker-compose logs -f
```
