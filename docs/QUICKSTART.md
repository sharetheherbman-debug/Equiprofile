# EquiProfile Quick Start Guide

Get EquiProfile up and running in minutes!

## Prerequisites

- Node.js 22.x or higher
- pnpm 10.x or higher
- MySQL 8.0 or higher
- AWS S3 account (for file uploads)
- GenX API key (for AI orchestration)
- Hugging Face API key (for AI task execution)

## 5-Minute Setup

### 1. Clone and Install

```bash
git clone https://github.com/amarktainetwork-blip/Equiprofile.online.git
cd Equiprofile.online
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=mysql://user:password@localhost:3306/equiprofile
JWT_SECRET=your_random_32_char_string
```

### 3. Setup Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE equiprofile;"

# Run migrations
pnpm db:push
```

### 4. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:3000 🎉

## Admin Access

### Unlock Admin Mode

1. Navigate to **AI Chat** (`/ai-chat`)
2. Type: `show admin`
3. Enter the `ADMIN_UNLOCK_PASSWORD` (set in your `.env` file)
4. Admin session lasts **30 minutes** (up to **8 hours** for primary admin)
5. Access the admin panel at `/admin`

### Feature Flags

Set these in `.env` to toggle optional features:

| Variable          | Description                      |
| ----------------- | -------------------------------- |
| `ENABLE_STRIPE`   | Set `true` to activate billing   |
| `ENABLE_UPLOADS`  | Set `true` to activate uploads   |
| `ENABLE_PWA`      | Set `true` to enable PWA support |

## Available Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm test       # Run tests
pnpm check      # TypeScript type checking
pnpm format     # Format code with Prettier
pnpm db:push    # Run database migrations
```

## Service Worker Cache Management

EquiProfile uses a service worker to cache static assets for better performance and offline functionality. Understanding how it works can help you debug caching issues.

### How It Works

The service worker automatically:

- Caches hashed static assets (JavaScript, CSS, fonts) with a cache-first strategy
- Uses network-first for HTML and API requests to ensure fresh content
- Updates its cache version on every build to force cache refresh

### Automated Version Control

The cache version is automatically synced with your `package.json` version during builds:

```bash
# The build process runs:
# 1. npm run build:sw  - Updates CACHE_VERSION in service-worker.js
# 2. vite build         - Builds the frontend
# 3. esbuild            - Builds the backend
```

This means when you deploy a new version:

1. The service worker version changes automatically
2. Browsers detect the new version
3. Old caches are cleared
4. Fresh assets are downloaded

### Force Refresh Cache

If you see stale content after deployment, you can manually clear the service worker:

**In Chrome/Edge:**

1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Click "Unregister" next to the service worker
4. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

**In Firefox:**

1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Click "Unregister"
4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Universal Method:**

```javascript
// In browser console:
navigator.serviceWorker
  .getRegistrations()
  .then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  })
  .then(() => location.reload(true));
```

### Troubleshooting Stale Content

**Problem:** "I deployed a new version but users see old content"

**Solution:**

1. Verify the build ran successfully and `CACHE_VERSION` was updated
2. Check `client/public/service-worker.js` - the version should match `package.json`
3. Users may need to close all tabs and reopen to activate the new service worker
4. For immediate update, users can hard refresh (Ctrl+Shift+R)

**Problem:** "Development changes aren't showing up"

**Solution:**

- Use `pnpm dev` which bypasses service worker caching
- Or disable service worker in DevTools during development
- In DevTools: Application → Service Workers → Check "Bypass for network"

### Best Practices

- Always bump the version in `package.json` before production deployments
- Run `pnpm build` to ensure the service worker version is updated
- Test deployments in incognito/private browsing to see fresh cache behavior
- Document version changes in your deployment notes

## Project Structure

```
Equiprofile.online/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
│   └── public/            # Static files
│
├── server/                # Node.js backend
│   ├── _core/            # Core functionality
│   ├── routers.ts        # API routes
│   ├── db.ts             # Database queries
│   └── *.test.ts         # Tests
│
├── drizzle/              # Database
│   ├── schema.ts         # Schema definitions
│   └── migrations/       # Migration files
│
└── docs/                 # Documentation
    ├── README.md
    ├── API.md
    ├── DEPLOYMENT.md
    ├── SECURITY.md
    └── CONTRIBUTING.md
```

## API Endpoints

All endpoints available at `/api/trpc`:

### Public

- `auth.me` - Get current user
- `auth.logout` - Logout

### User (Authenticated)

- `user.getProfile` - Get profile
- `user.updateProfile` - Update profile
- `user.getSubscriptionStatus` - Get subscription

### Horses (Active Subscription)

- `horses.list` - List horses
- `horses.get` - Get horse by ID
- `horses.create` - Create horse
- `horses.update` - Update horse
- `horses.delete` - Delete horse

### Health Records

- `healthRecords.listAll` - List all records
- `healthRecords.create` - Create record
- More endpoints in API.md...

### Training

- `training.listAll` - List sessions
- `training.create` - Create session
- More endpoints in API.md...

### Admin (Admin Role Only)

- `admin.getUsers` - List all users
- `admin.getStats` - System statistics
- `admin.suspendUser` - Suspend user
- More endpoints in API.md...

See [API.md](./API.md) for complete endpoint documentation.

## Configuration

### Required Environment Variables

```env
# Database (Required)
DATABASE_URL=mysql://...

# Authentication (Required)
JWT_SECRET=random_secret_here

# GenX + Hugging Face (Optional)
GENX_API_KEY=genx-...
HUGGINGFACE_API_KEY=hf_...

# AWS S3 for Files (Optional)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=equiprofile-uploads

# Stripe Payments (Optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

See [.env.example](./.env.example) for all options.

## Testing

Run the test suite:

```bash
pnpm test
```

Test coverage includes:

- ✅ 34 passing tests
- ✅ Authentication flows
- ✅ Horse management
- ✅ Health records
- ✅ Training sessions
- ✅ Admin functions

## Production Deployment

### Quick Deploy

```bash
# Build
pnpm build

# Start with PM2
pm2 start dist/index.js --name equiprofile
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide including:

- Nginx configuration
- SSL setup
- Database configuration
- Automated backups
- Monitoring

## Common Issues

### Port Already in Use

Server automatically finds an available port. Check console output for actual port.

### Database Connection Failed

- Verify DATABASE_URL is correct
- Check MySQL is running: `systemctl status mysql`
- Test connection: `mysql -u user -p`

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist .pnpm-store
pnpm install
pnpm build
```

### Tests Failing

```bash
# Make sure database is accessible
# Mock functions should prevent database calls in tests
pnpm test
```

## Getting Help

- 📖 Documentation: See [README.md](./README.md)
- 🔒 Security: See [SECURITY.md](./SECURITY.md)
- 🤝 Contributing: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- 🚀 Deployment: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📡 API: See [API.md](./API.md)
- 🐛 Issues: [GitHub Issues](https://github.com/amarktainetwork-blip/Equiprofile.online/issues)

## Key Features

✅ **Horse Management**

- Complete profiles with photos
- Multiple horses per user
- Detailed information tracking

✅ **Health Records**

- Vaccination tracking
- Vet visit logs
- Medical history
- Document uploads
- Automatic reminders

✅ **Training Scheduler**

- Session planning
- Progress tracking
- Performance notes
- Calendar view

✅ **AI Weather Analysis**

- Real-time conditions
- Riding recommendations
- Safety alerts

✅ **Admin Dashboard**

- User management
- System analytics
- Settings configuration
- Activity monitoring

✅ **Security**

- OAuth authentication
- Role-based access
- Rate limiting
- Input validation
- Session management

## Next Steps

1. ✅ Complete this quick start
2. 📖 Read [API.md](./API.md) for API details
3. 🔒 Review [SECURITY.md](./SECURITY.md) for security
4. 🚀 Deploy using [DEPLOYMENT.md](./DEPLOYMENT.md)
5. 🤝 Contribute via [CONTRIBUTING.md](./CONTRIBUTING.md)

Welcome to EquiProfile! 🐴
