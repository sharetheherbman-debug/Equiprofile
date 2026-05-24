# EquiProfile Deployment Guide

**Version**: 2.0  
**Last Updated**: 2026-01-09  
**Target Environment**: Ubuntu VPS with Nginx + Systemd

---

## Prerequisites

- Ubuntu 20.04+ VPS
- Node.js 18+ installed
- npm or pnpm package manager
- MySQL 8+ database
- Nginx web server
- Systemd for process management
- Git for code deployment

---

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure all required environment variables are set in `/var/equiprofile/.env`:

**Critical (must be set)**:

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secure random string for JWT signing
- `ADMIN_UNLOCK_PASSWORD` - Admin password (change from default!)
- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)

**Optional but recommended**:

- `STRIPE_SECRET_KEY` - If billing enabled
- `STRIPE_WEBHOOK_SECRET` - If billing enabled
- `GENX_API_KEY` - If AI orchestration features enabled
- `HUGGINGFACE_API_KEY` - If AI task/media execution features enabled
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - If email enabled

See `.env.example` for complete list.

### 2. Database

Ensure database is:

- Created and accessible
- Migrations applied (run `npm run db:push`)
- Backed up before major changes

### 3. Storage

Ensure directories exist with correct permissions:

```bash
sudo mkdir -p /var/equiprofile/storage/users
sudo chown -R equiprofile:equiprofile /var/equiprofile/storage
sudo chmod -R 755 /var/equiprofile/storage
```

---

## Deployment Steps

### Step 1: Pull Latest Code

```bash
cd /var/equiprofile
git fetch origin
git checkout main  # or your target branch
git pull origin main
```

### Step 2: Install Dependencies

```bash
npm install --production
```

### Step 3: Run Database Migrations

```bash
npm run db:push
```

**Important**: Review migrations before applying in production!

### Step 4: Build Application

```bash
npm run build
```

This will:

1. Update service worker version
2. Build client (Vite) → `dist/`
3. Build server (esbuild) → `dist/index.js`

**Expected output**:

- No TypeScript errors
- `dist/` directory populated
- `dist/index.js` exists

### Step 5: Restart Service

```bash
sudo systemctl restart equiprofile
```

### Step 6: Verify Service Status

```bash
sudo systemctl status equiprofile
```

**Expected**: `active (running)` status

### Step 7: Check Logs

```bash
sudo journalctl -u equiprofile -n 50 -f
```

Look for:

- `Server running on http://localhost:3000/`
- No error messages
- Database connection success

### Step 8: Run Smoke Tests

```bash
./scripts/smoke-test.sh
```

See [SMOKE_TESTS.md](./SMOKE_TESTS.md) for details.

---

## Post-Deployment Verification

After deployment, verify:

1. ✅ Health endpoint: `curl http://localhost:3000/healthz`
2. ✅ Build info: `curl http://localhost:3000/build`
3. ✅ Landing page: `curl http://localhost:3000/`
4. ✅ Login page: `curl http://localhost:3000/login`
5. ✅ API health: `curl http://localhost:3000/api/health`

Expected responses:

- All return 200 status
- No 404 or 500 errors
- JSON responses valid
- HTML pages render

---

## Rollback Procedure

If deployment fails:

1. Check Git history: `git log --oneline -10`
2. Revert to previous version: `git checkout <previous-commit-hash>`
3. Rebuild and restart: `npm install --production && npm run build && sudo systemctl restart equiprofile`
4. Verify rollback: `./scripts/smoke-test.sh`

---

**End of Deployment Guide**

See also: [SMOKE_TESTS.md](./SMOKE_TESTS.md), [IMAGES.md](./IMAGES.md)
