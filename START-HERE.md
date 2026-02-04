# 🚀 PDCP Project - Autonomous Startup Suite

## **⭐ START HERE ⭐**

### The One Command to Run Everything:
```bash
node run-complete-project.js
```

That's it! This single command will:
1. ✓ Check system requirements
2. ✓ Setup environment
3. ✓ Install dependencies
4. ✓ Start PostgreSQL & Redis
5. ✓ Build all 8 microservices
6. ✓ Setup the database
7. ✓ Start all services

**Result:** Complete PDCP system running with all services accessible.

---

## 📁 What's Included

### **Startup Scripts** (Choose One)

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `run-complete-project.js` | **Full automated setup** | 🏆 Recommended for all users |
| `auto-run-project.js` | Simple automated setup | Alternative option |
| `auto-run-project.sh` | Bash version | Unix/Linux/Mac preferred |

### **Documentation**

| File | Contains |
|------|----------|
| `QUICK-START.md` | One-page quick reference |
| `STARTUP-GUIDE.md` | Detailed setup instructions |
| `PROJECT-SETUP-COMPLETE.md` | Complete overview |
| `project-status.js` | System status checker |

---

## 🎯 Services That Will Run

After startup, you'll have these running on localhost:

```
🌐 API Gateway              → http://localhost:3000
⚙️  Decision Engine          → http://localhost:3001
🚗 Vehicle Tracking         → http://localhost:3002
🔐 Auth Service             → http://localhost:3003
📦 Parcel Management        → http://localhost:3004
🔗 Custody Service          → http://localhost:3005
📊 Analytics Service        → http://localhost:3006
📝 Audit Service            → http://localhost:3007

🗄️  PostgreSQL Database      → localhost:5432
💾 Redis Cache              → localhost:6379
```

---

## 🔧 How It Works

### Automatic Process

```
run-complete-project.js
    ↓
1. Check Prerequisites (Node.js, Docker)
    ↓
2. Setup .env.development
    ↓
3. npm install (install dependencies)
    ↓
4. docker-compose up -d (start DB & Redis)
    ↓
5. npm run build (build all services)
    ↓
6. setup-database.js (initialize database)
    ↓
7. npm run dev (start all services)
    ↓
✓ RUNNING - All services online
```

---

## 📋 Quick Reference

### **Start Everything**
```bash
node run-complete-project.js
```

### **Stop Everything**
```bash
npm run docker:down
```

### **View Logs**
```bash
npm run docker:logs
```

### **Manual Steps (if needed)**
```bash
npm install              # Install dependencies
npm run docker:up       # Start PostgreSQL & Redis
npm run build           # Build services
npm run dev             # Start services
```

---

## 🗄️ Database Access

**PostgreSQL (Main Database)**
```
Host: localhost
Port: 5432
User: pdcp_user
Password: pdcp_password
Database: pdcp_db
```

**Redis (Cache/Sessions)**
```
Host: localhost
Port: 6379
No authentication needed
```

---

## ✅ System Requirements

- **Node.js**: 18 or higher
- **npm**: 8 or higher  
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 5GB free space

---

## 🆘 Troubleshooting

### "Docker not found"
```bash
# Install Docker Desktop from docker.com
# Ensure Docker daemon is running
docker --version
```

### "Port 3001 already in use"
```bash
# Stop the conflicting service or use different ports
lsof -i :3001
# Or just restart Docker
npm run docker:down
npm run docker:up
```

### "npm install fails"
```bash
# Clear npm cache
npm cache clean --force
# Try again
npm install
```

### "Database connection fails"
```bash
# Check Docker services
docker-compose ps
# Or restart
npm run docker:down
npm run docker:up
```

---

## 📊 Project Structure

```
pdcp/
├── 🚀 STARTUP SCRIPTS
│   ├── run-complete-project.js       ← START HERE
│   ├── auto-run-project.js
│   ├── auto-run-project.sh
│   └── project-status.js
│
├── 📖 DOCUMENTATION
│   ├── QUICK-START.md
│   ├── STARTUP-GUIDE.md
│   ├── PROJECT-SETUP-COMPLETE.md
│   └── README.md
│
├── 🛠️ MICROSERVICES (apps/)
│   ├── api-gateway/
│   ├── decision-engine/
│   ├── vehicle-tracking/
│   ├── auth-service/
│   ├── parcel-management/
│   ├── custody-service/
│   ├── analytics-service/
│   └── audit-service/
│
├── 📦 SHARED CODE (packages/)
│   ├── types/
│   └── shared/
│
├── 🐳 INFRASTRUCTURE
│   ├── docker-compose.yml
│   ├── docker/
│   └── monitoring/
│
└── 📝 CONFIGURATION
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

---

## 🎬 Getting Started in 3 Steps

### Step 1: Start the Project
```bash
node run-complete-project.js
```

### Step 2: Wait for "Services Running" Message
Takes 2-3 minutes on first run
- Dependencies install
- Docker services start
- Services build
- Database initializes
- All services start

### Step 3: Access the Platform
- Main gateway: http://localhost:3000
- API docs: http://localhost:3001/api/docs
- Other services: http://localhost:300X/api/docs

---

## 🎮 Available Commands

| Command | What It Does |
|---------|-------------|
| `node run-complete-project.js` | Full automated setup & run |
| `npm install` | Install dependencies |
| `npm run build` | Build all services |
| `npm run dev` | Start all services |
| `npm run test` | Run all tests |
| `npm run lint` | Check code quality |
| `npm run clean` | Clean build artifacts |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:logs` | View Docker logs |

---

## 📞 Support

- **Full Documentation**: See [STARTUP-GUIDE.md](./STARTUP-GUIDE.md)
- **Quick Reference**: See [QUICK-START.md](./QUICK-START.md)
- **Project Overview**: See [README.md](./README.md)
- **Detailed Setup Info**: See [PROJECT-SETUP-COMPLETE.md](./PROJECT-SETUP-COMPLETE.md)

---

## ⚡ Performance Notes

### First Time Startup
- ~2-3 minutes total
- Dependencies install
- Services build
- Database initialization

### Subsequent Startups  
- ~30-45 seconds
- Services just start

### Resource Usage
- CPU: Minimal when idle
- Memory: ~800MB-1GB
- Disk: ~2GB for Docker images + node_modules

---

## 🔐 Security

- All default credentials are for **development only**
- Change `.env` variables before production deployment
- Ensure firewall blocks external access to localhost ports
- Never commit `.env.development` with real secrets

---

## 📝 Environment Variables

Key variables in `.env.example`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=pdcp_user
DB_PASSWORD=pdcp_password
DB_NAME=pdcp_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

---

## 🚀 Ready to Launch?

```bash
node run-complete-project.js
```

**Enjoy the PDCP Platform!** 🎉

---

**Last Updated:** February 4, 2026  
**Status:** ✅ Production Ready  
**Automation Level:** Full  

For detailed information, see the individual documentation files.
