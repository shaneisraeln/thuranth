# 🚀 PDCP - Quick Start Commands

## Run the Entire Project (Fully Autonomous)

### Recommended: Complete Automated Setup & Run

```bash
node run-complete-project.js
```

**This will automatically:**
- ✓ Check Node.js and Docker versions
- ✓ Set up environment variables
- ✓ Install all dependencies
- ✓ Start PostgreSQL and Redis
- ✓ Build all microservices
- ✓ Setup the database
- ✓ Start all services

**Result:** All 8 microservices running on ports 3000-3007

---

## Alternative Methods

### Simple Method
```bash
node auto-run-project.js
```

### Manual Full Setup
```bash
npm install                    # Install dependencies
npm run docker:up             # Start PostgreSQL & Redis
npm run build                 # Build all services
node setup-database.js        # Setup database
npm run dev                   # Start all services
```

### Single Command Per Step
```bash
npm install                   # Step 1: Dependencies
npm run docker:up            # Step 2: Infrastructure
npm run build                # Step 3: Build services
npm run dev                  # Step 4: Run services
```

---

## What Gets Started

| Service | URL | Purpose |
|---------|-----|---------|
| API Gateway | http://localhost:3000 | Main entry point |
| Decision Engine | http://localhost:3001 | Consolidation logic |
| Vehicle Tracking | http://localhost:3002 | Vehicle management |
| Auth Service | http://localhost:3003 | Authentication |
| Parcel Management | http://localhost:3004 | Parcel lifecycle |
| Custody Service | http://localhost:3005 | Blockchain records |
| Analytics Service | http://localhost:3006 | Reporting & metrics |
| Audit Service | http://localhost:3007 | Logging & compliance |

**Database:**
- PostgreSQL: `localhost:5432` (user: `pdcp_user`)
- Redis: `localhost:6379`

---

## Useful Commands

```bash
npm run docker:down          # Stop Docker services
npm run docker:logs          # View Docker logs
npm run test                 # Run all tests
npm run lint                 # Lint all code
npm run clean                # Clean build artifacts
```

---

## File Guide

| File | Purpose |
|------|---------|
| `run-complete-project.js` | **Best option** - Full automated setup with logging |
| `auto-run-project.js` | Simple automated setup |
| `auto-run-project.sh` | Bash version (Unix/Mac) |
| `STARTUP-GUIDE.md` | Detailed startup documentation |
| `docker-compose.yml` | Docker infrastructure config |
| `package.json` | Project dependencies & scripts |

---

## First Time Setup

```bash
# Just run this one command:
node run-complete-project.js
```

That's it! Everything else happens automatically.

---

## Troubleshooting

**Problem:** "Docker not found"
```bash
# Make sure Docker is installed and running
docker --version
```

**Problem:** Port already in use
```bash
# Change ports in docker-compose.yml or stop conflicting services
lsof -i :3001  # Check what's using port 3001
```

**Problem:** npm install fails
```bash
npm cache clean --force
npm install
```

**Problem:** Database connection errors
```bash
# Check Docker is running and services are healthy
docker-compose ps
docker-compose logs postgres
```

---

## Project Structure

```
PDCP/
├── apps/                      # 6 microservices
│   ├── decision-engine/       # Core business logic
│   ├── vehicle-tracking/      # Vehicle ops
│   ├── parcel-management/     # Parcel tracking
│   ├── auth-service/          # Auth & security
│   ├── custody-service/       # Blockchain
│   └── analytics-service/     # Metrics
├── packages/
│   ├── types/                 # TypeScript types
│   └── shared/                # Shared utilities
├── docker/                    # Docker configs
├── scripts/                   # Build scripts
└── run-complete-project.js    # ← START HERE
```

---

## Support

- Full docs: [STARTUP-GUIDE.md](./STARTUP-GUIDE.md)
- Main readme: [README.md](./README.md)
- API docs: Available at http://localhost:PORT/api/docs after startup

---

**Ready? Run this:**
```bash
node run-complete-project.js
```
