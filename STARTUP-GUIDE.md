# PDCP Autonomous Startup Guide

This guide explains how to run the entire Post-Dispatch Consolidation Platform (PDCP) project autonomously.

## Quick Start (Recommended)

### Option 1: Using the Automated Node.js Script (Best)

Run this single command from the project root:

```bash
node auto-run-project.js
```

This script will automatically:
- ✅ Check Node.js version (requires 18+)
- ✅ Set up environment variables from `.env.example`
- ✅ Install all npm dependencies
- ✅ Start Docker services (PostgreSQL & Redis)
- ✅ Build all microservices
- ✅ Setup the database
- ✅ Start all services in development mode

### Option 2: Using the Bash Script

```bash
chmod +x auto-run-project.sh
./auto-run-project.sh
```

## Manual Step-by-Step Setup

If you prefer to run commands manually:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Infrastructure (PostgreSQL & Redis)
```bash
npm run docker:up
```

Wait 10-15 seconds for services to be healthy.

### 3. Setup Environment (Optional)
```bash
cp .env.example .env.development
```

### 4. Build All Services
```bash
npm run build
```

### 5. Setup Database (Optional)
```bash
node setup-database.js
```

### 6. Start Development Servers
```bash
npm run dev
```

## Available Services

Once running, access these services:

| Service | URL | Documentation |
|---------|-----|----------------|
| API Gateway | http://localhost:3000 | - |
| Decision Engine | http://localhost:3001 | http://localhost:3001/api/docs |
| Vehicle Tracking | http://localhost:3002 | http://localhost:3002/api/docs |
| Auth Service | http://localhost:3003 | http://localhost:3003/api/docs |
| Parcel Management | http://localhost:3004 | http://localhost:3004/api/docs |
| Custody Service | http://localhost:3005 | http://localhost:3005/api/docs |
| Analytics Service | http://localhost:3006 | http://localhost:3006/api/docs |
| Audit Service | http://localhost:3007 | http://localhost:3007/api/docs |

## Database Access

**PostgreSQL:**
- Host: `localhost`
- Port: `5432`
- Username: `pdcp_user`
- Password: `pdcp_password`
- Database: `pdcp_db`

**Redis:**
- Host: `localhost`
- Port: `6379`

## Other Useful Commands

```bash
# Stop Docker services
npm run docker:down

# View Docker logs
npm run docker:logs

# Run tests
npm run test

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

## Troubleshooting

### Issue: Docker services won't start
**Solution:** Make sure Docker is running:
```bash
docker ps
```

### Issue: Port already in use
**Solution:** Stop other services or change ports in `docker-compose.yml` and individual service configurations.

### Issue: npm install fails
**Solution:** Clear npm cache and try again:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Database connection fails
**Solution:** Ensure PostgreSQL container is running:
```bash
docker-compose ps
docker-compose logs postgres
```

## Project Architecture

```
PDCP/
├── apps/                    # Microservices
│   ├── api-gateway/         # Main API entry point
│   ├── decision-engine/      # Core consolidation logic
│   ├── vehicle-tracking/     # Vehicle management
│   ├── auth-service/         # Authentication
│   ├── parcel-management/    # Parcel lifecycle
│   ├── custody-service/      # Blockchain integration
│   ├── analytics-service/    # Reporting
│   └── audit-service/        # Logging & compliance
├── packages/                # Shared code
│   ├── types/               # TypeScript definitions
│   └── shared/              # Utilities & configs
├── docker/                  # Docker configs
├── monitoring/              # Monitoring setup
└── scripts/                 # Build & setup scripts
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `NODE_ENV`: development/production
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `GOOGLE_MAPS_API_KEY`: Google Maps integration
- `FIREBASE_PROJECT_ID`: Firebase authentication
- `JWT_SECRET`: Security key

## Support

For issues or questions about the project, refer to:
- [README.md](./README.md) - Main project documentation
- [API Gateway README](./apps/api-gateway/README.md) - API documentation
- `.kiro/specs/` - Detailed specifications

---

**Ready to run the entire project?**

Execute this command now:
```bash
node auto-run-project.js
```
