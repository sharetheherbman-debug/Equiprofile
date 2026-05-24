# Production Deployment Guide for VPS

## Overview

This guide covers deploying the EquiProfile application to your VPS with all Phase 0-2 updates including real-time functionality.

## Prerequisites

- Ubuntu 20.04+ VPS with root access
- Node.js 18+ installed
- MySQL 8.0+ installed and running
- Nginx installed
- systemd available
- Domain pointed to VPS IP

## Quick Deployment Steps

### 1. Pull Latest Changes

```bash
cd /var/equiprofile
git fetch origin
git checkout copilot/add-admin-only-system-keys
git pull origin copilot/add-admin-only-system-keys
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Build Application

```bash
npm run build
```

Expected output:

- Client build: `dist/public/` directory
- Server build: `dist/index.js` file
- Build time: ~20-30 seconds

### 4. Database Migrations

The new features added these database tables:

- `tasks` - Task management system
- `contacts` - Contact management
- `accountFeatures` - Feature flags system

Run migrations:

```bash
npm run db:push
```

Or manually apply schema changes from `drizzle/schema.ts`.

### 5. Restart Service

```bash
sudo systemctl restart equiprofile
```

### 6. Verify Deployment

```bash
# Check service status
sudo systemctl status equiprofile

# Check logs
sudo journalctl -u equiprofile -n 50 -f

# Run smoke tests
bash scripts/smoke-test.sh
```

## New Features Enabled

### Real-time Updates (SSE)

- Endpoint: `/api/realtime/events`
- 8 modules now have instant updates without page refresh
- Modules: Horses, Health, Training, Tasks, Contacts, Breeding, Feeding, Documents

### New Pages Added

1. **/tasks** - Complete task management system
2. **/contacts** - Contact management (vets, farriers, trainers, etc.)

### Updated Pages

- Dashboard sidebar now includes Tasks and Contacts
- Admin page renamed "API Keys" to "System Secrets"
- Lessons page navigation fixed

## Environment Variables

### Required (Already Set)

```bash
DATABASE_URL=mysql://...
JWT_SECRET=...
NODE_ENV=production
PORT=3000
```

### Optional (For Full Functionality)

```bash
# Real-time monitoring (optional)
REALTIME_HEARTBEAT_INTERVAL=30000  # 30 seconds (default)

# GenX + Hugging Face for AI features (optional)
GENX_API_KEY=genx-...
HUGGINGFACE_API_KEY=hf_...

# Email notifications (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# File uploads (optional, defaults to S3)
ENABLE_UPLOADS=true
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

## Configuration Files

### Nginx Configuration

Location: `/etc/nginx/sites-available/equiprofile`

Ensure these sections exist:

```nginx
# Real-time SSE endpoint
location /api/realtime {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection '';
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    proxy_read_timeout 86400s;
}

# API endpoints (existing)
location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Static files (existing)
location / {
    root /var/equiprofile/dist/public;
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Systemd Service

Location: `/etc/systemd/system/equiprofile.service`

Should already be configured. If not:

```ini
[Unit]
Description=EquiProfile Node Server
After=network.target mysql.service

[Service]
Type=simple
User=equiprofile
WorkingDirectory=/var/equiprofile
Environment="NODE_ENV=production"
EnvironmentFile=/var/equiprofile/.env
ExecStart=/usr/bin/node /var/equiprofile/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=equiprofile

[Install]
WantedBy=multi-user.target
```

Reload if changed:

```bash
sudo systemctl daemon-reload
sudo systemctl restart equiprofile
sudo systemctl enable equiprofile
```

## Smoke Tests

Run automated tests:

```bash
cd /var/equiprofile
bash scripts/smoke-test.sh
```

Expected output:

- ✅ Service is running
- ✅ Health endpoint responds
- ✅ Static files load
- ✅ API endpoints accessible
- ✅ Real-time SSE endpoint connects

## Rollback Procedure

If issues occur:

### Quick Rollback

```bash
cd /var/equiprofile
git checkout main  # or previous stable branch
npm install --legacy-peer-deps
npm run build
sudo systemctl restart equiprofile
```

### Database Rollback

If migrations cause issues:

```bash
# Restore from backup
mysql -u root -p equiprofile < /var/backups/equiprofile_YYYYMMDD.sql
```

## Monitoring

### Check Service Health

```bash
# Service status
sudo systemctl status equiprofile

# View logs (last 100 lines)
sudo journalctl -u equiprofile -n 100

# Follow logs in real-time
sudo journalctl -u equiprofile -f

# Check real-time connections (admin only)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourdomain.com/api/realtime/stats
```

### Performance Metrics

```bash
# CPU and memory usage
top -p $(pgrep -f "node.*dist/index.js")

# Active connections
ss -tn | grep :3000 | wc -l

# Database connections
mysql -e "SHOW PROCESSLIST;"
```

## Troubleshooting

### Build Fails

```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Service Won't Start

```bash
# Check logs
sudo journalctl -u equiprofile -n 100

# Common issues:
# 1. Database not accessible - check DATABASE_URL
# 2. Port 3000 in use - check for other processes
# 3. Permission issues - check file ownership
sudo chown -R equiprofile:equiprofile /var/equiprofile
```

### Real-time Not Working

```bash
# Check Nginx configuration
sudo nginx -t

# Verify SSE endpoint
curl -H "Authorization: Bearer TOKEN" \
  https://yourdomain.com/api/realtime/events

# Should return: data: {"type":"connected","payload":...}
```

### Database Connection Issues

```bash
# Test database connection
mysql -h HOST -u USER -p DATABASE

# Check .env file
cat /var/equiprofile/.env | grep DATABASE_URL
```

## Post-Deployment Verification

### 1. Test User Login

- Visit https://yourdomain.com
- Log in with existing account
- Verify dashboard loads

### 2. Test New Features

- Navigate to Tasks page (/tasks)
- Create a new task
- Verify it appears instantly without refresh
- Navigate to Contacts page (/contacts)
- Add a new contact
- Verify real-time update

### 3. Test Real-time Sync

- Open dashboard in two browser tabs
- Create a horse in tab 1
- Verify it appears in tab 2 without refresh

### 4. Test Admin Features

- Access admin panel (if admin)
- Verify "System Secrets" tab (renamed from "API Keys")
- Check environment health page

## Security Checklist

- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Database not publicly accessible
- [ ] JWT_SECRET is strong and unique
- [ ] File permissions correct (644 for files, 755 for dirs)
- [ ] Service running as non-root user
- [ ] Nginx security headers configured
- [ ] Regular backups enabled

## Backup Recommendations

### Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p equiprofile > /var/backups/equiprofile_$DATE.sql
find /var/backups -name "equiprofile_*.sql" -mtime +7 -delete
```

### Application Backup

```bash
# Backup before deployment
cd /var/equiprofile
tar -czf /var/backups/equiprofile_app_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  .
```

## Support

For issues:

1. Check logs: `sudo journalctl -u equiprofile -n 100`
2. Run smoke tests: `bash scripts/smoke-test.sh`
3. Review MODULE_MATRIX.md for feature status
4. Check REALTIME_ARCH.md for real-time troubleshooting

## Summary of Changes

### Phase 0

- Complete repository audit (docs/audit/REPO_AUDIT.md)
- Identified all working/broken features

### Phase 1

- Fixed admin hints, navigation bugs, logout redirect
- Added deployment and smoke test documentation

### Phase 2

- Implemented real-time SSE infrastructure
- Added Tasks module (complete)
- Added Contacts module (complete)
- Wired real-time to 8 modules
- Feature flags schema ready
- Comprehensive documentation

**Total Changes**: 11 commits, 8 modules with real-time, 2 new complete modules
**Deployment Time**: ~10-15 minutes
**Downtime**: ~30 seconds (service restart only)
