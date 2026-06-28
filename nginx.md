# Nginx Configuration

Sample configs for nginx running on the host. The backend runs in Docker on `localhost:3300`, frontend static files are at `/var/www/server-monitor-frontend/`.

---

## Without SSL (HTTP only)

`/etc/nginx/sites-available/server-monitor`:

```nginx
server {
    listen 80;
    server_name monitor.your-domain.com;

    root /var/www/server-monitor-frontend;
    index index.html;

    # Frontend — serve static files, SPA fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets (Vite output is content-hashed, safe to cache aggressively)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Public endpoints (no /api/ prefix — excluded in backend)
    location ~ ^/(ingest|health|agent\.js|install\.sh|agent-info)$ {
        proxy_pass http://localhost:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## With SSL (HTTPS + Let's Encrypt)

`/etc/nginx/sites-available/server-monitor`:

```nginx
server {
    listen 80;
    server_name monitor.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name monitor.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/monitor.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.your-domain.com/privkey.pem;

    root /var/www/server-monitor-frontend;
    index index.html;

    # Frontend — serve static files, SPA fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets (Vite output is content-hashed, safe to cache aggressively)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Public endpoints (no /api/ prefix — excluded in backend)
    location ~ ^/(ingest|health|agent\.js|install\.sh|agent-info)$ {
        proxy_pass http://localhost:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Get SSL certificate

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate (certbot modifies your nginx config automatically)
certbot --nginx -d monitor.your-domain.com

# Verify auto-renewal
certbot renew --dry-run
```

---

## Enable site

```bash
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Enable server-monitor
ln -s /etc/nginx/sites-available/server-monitor /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx
```

## Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Verify

```bash
# Backend health
curl http://localhost:3300/health

# Frontend
curl -I http://monitor.your-domain.com     # without SSL
curl -I https://monitor.your-domain.com    # with SSL
```
