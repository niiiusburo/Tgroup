#!/bin/bash
# Deploy TGroup to VPS with domain tbot.vn
# Usage: ./deploy-tbot.sh <vps-ip>

set -e

VPS_IP=${1:-""}
DOMAIN="tbot.vn"
PROJECT_DIR="/opt/tgroup"
REQUIRED_ENV="POSTGRES_USER POSTGRES_PASSWORD JWT_SECRET HOSOONLINE_BASE_URL HOSOONLINE_USERNAME HOSOONLINE_PASSWORD"

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./deploy-tbot.sh <vps-ip>"
    echo "Example: ./deploy-tbot.sh 123.456.78.90"
    exit 1
fi

echo "🚀 Deploying TGroup to $DOMAIN on VPS $VPS_IP"
echo "Required runtime env keys in .env: $REQUIRED_ENV"

# SSH and execute deployment
ssh root@$VPS_IP << 'ENDSSH'
set -e

echo "📦 Updating system..."
apt update && apt upgrade -y

echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker

echo "📁 Creating project directory..."
mkdir -p $PROJECT_DIR

echo "🔒 Setting up SSL certificates..."
apt install -y certbot python3-certbot-nginx

# Clone or pull repository (replace with your repo)
# git clone https://github.com/your-repo/tgroup.git $PROJECT_DIR

# Copy nginx config
cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Get SSL certificate
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Reload nginx
systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Visit https://$DOMAIN"

ENDSSH

echo "🎉 Done!"
