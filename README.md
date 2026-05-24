# EquiProfile — Professional Horse Management Platform

![EquiProfile](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

> A comprehensive, modern web application for equestrian professionals to manage horses' health records, training schedules, feeding plans, and more.

---

## 📚 Documentation

**Full project documentation lives in one place:**

👉 **[docs/PROJECT_DOCUMENTATION.md](./docs/PROJECT_DOCUMENTATION.md)**

It covers:

- Architecture overview
- Frontend & backend structure
- Database models
- API routes (REST + tRPC)
- Environment variables
- Feature flags (Stripe, Uploads)
- Deployment instructions
- Testing instructions
- Troubleshooting
- Security
- Performance optimization

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/amarktainetwork-blip/Equiprofile.online.git
cd Equiprofile.online

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, ADMIN_UNLOCK_PASSWORD at minimum

# 4. Database
npm run db:push

# 5. Develop
npm run dev
```

Visit **http://localhost:3000**

---

## 🚀 Production Deployment

```bash
npm run build
# Then start with systemd / PM2 — see docs/PROJECT_DOCUMENTATION.md#9-deployment-instructions
```

---

## 🧪 Tests

```bash
npm run test       # Run all tests (Vitest)
npm run preflight  # Validate routes and dependencies
```

---

## 🔑 Key Environment Variables

| Variable                | Required | Description                         |
| ----------------------- | -------- | ----------------------------------- |
| `DATABASE_URL`          | ✅       | MySQL connection string             |
| `JWT_SECRET`            | ✅       | Min 32-char random string           |
| `ADMIN_UNLOCK_PASSWORD` | ✅       | Admin section password              |
| `ENABLE_STRIPE`         | Optional | Set `true` to activate billing      |
| `ENABLE_UPLOADS`        | Optional | Set `true` to activate file uploads |
| `GENX_API_KEY`          | Optional | Primary AI orchestration features   |

See [docs/PROJECT_DOCUMENTATION.md](./docs/PROJECT_DOCUMENTATION.md#7-environment-variables) for the complete list.

---

## 🐴 Features

- **Horse Management** — profiles, photos, pedigree
- **Health Records** — vaccinations, vet visits, treatments, X-rays
- **Training Log** — sessions, templates, competition results
- **Calendar & Appointments** — fully connected scheduling
- **Stable Management** — multi-user stables (up to 5 members)
- **Messages** — stable member messaging threads
- **Nutrition** — feeding plans and cost tracking
- **Documents** — secure document vault
- **AI Assistant** — GenX-orchestrated equestrian advisor
- **Weather** — location-based riding conditions
- **Billing** — Stripe subscription management
- **Admin Panel** — user management, analytics, settings

---

© 2026 [EquiProfile.online](https://equiprofile.online) · Part of [AmarktAI Network](https://amarktai.com)
