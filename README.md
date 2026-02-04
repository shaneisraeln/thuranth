# Post-Dispatch Consolidation Platform (PDCP)

A B2B SaaS platform for last-mile logistics operations in India that reduces cost and carbon emissions by conservatively absorbing late demand into vehicles already on the road.

## Architecture

The PDCP system follows a microservices architecture with the following services:

- **Decision Engine Service** (Port 3001): Core consolidation logic and scoring algorithms
- **Vehicle Tracking Service** (Port 3002): Real-time location and capacity management
- **Parcel Management Service** (Port 3003): Parcel lifecycle and assignment management
- **Custody Service** (Port 3004): Blockchain integration for tamper-proof custody records
- **Analytics Service** (Port 3005): Impact measurement and reporting
- **Audit Service** (Port 3006): Comprehensive logging and compliance tracking

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd post-dispatch-consolidation-platform
   npm install
   ```

2. **Start infrastructure services:**
   ```bash
   npm run docker:up
   ```
   This starts PostgreSQL and Redis containers.

3. **Build all services:**
   ```bash
   npm run build
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

## Development

### Project Structure

```
├── apps/                    # Microservices
│   ├── decision-engine/     # Decision Engine Service
│   ├── vehicle-tracking/    # Vehicle Tracking Service
│   ├── parcel-management/   # Parcel Management Service
│   ├── custody-service/     # Custody Service
│   ├── analytics-service/   # Analytics Service
│   └── audit-service/       # Audit Service
├── packages/                # Shared packages
│   ├── types/              # TypeScript type definitions
│   └── shared/             # Shared utilities and configurations
├── docker/                 # Docker configurations
└── scripts/                # Build and deployment scripts
```

### Available Scripts

- `npm run build` - Build all services
- `npm run dev` - Start all services in development mode
- `npm run test` - Run tests for all services
- `npm run lint` - Lint all services
- `npm run clean` - Clean build artifacts
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

### Environment Configuration

Copy `.env.example` to `.env` and configure the following:

- Database connection settings
- Redis connection settings
- External API keys (Google Maps, Firebase)
- Blockchain configuration
- Security settings

### Database Setup

The PostgreSQL database is automatically initialized with:
- Required extensions (uuid-ossp, postgis)
- Service-specific schemas
- Basic enum types
- User permissions

### API Documentation

Each service provides Swagger documentation at `/api/docs`:

- Decision Engine: http://localhost:3001/api/docs
- Vehicle Tracking: http://localhost:3002/api/docs
- Parcel Management: http://localhost:3003/api/docs
- Custody Service: http://localhost:3004/api/docs
- Analytics Service: http://localhost:3005/api/docs
- Audit Service: http://localhost:3006/api/docs

## Testing

The project uses a dual testing approach:

### Unit Tests
```bash
npm run test
```

### Property-Based Tests
Property-based tests validate universal correctness properties using `fast-check`.

## Deployment

### Docker Deployment

1. **Build services:**
   ```bash
   docker-compose build
   ```

2. **Start all services:**
   ```bash
   docker-compose --profile services up -d
   ```

### Production Considerations

- Configure proper environment variables
- Set up SSL/TLS certificates
- Configure monitoring and logging
- Set up backup strategies for PostgreSQL
- Configure Redis persistence
- Set up blockchain network connectivity

## Contributing

1. Follow the established code style and patterns
2. Write comprehensive tests for new features
3. Update documentation as needed
4. Ensure all services build and tests pass

## License

[License information]