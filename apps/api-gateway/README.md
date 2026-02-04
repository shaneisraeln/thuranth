# PDCP API Gateway

The API Gateway serves as the central entry point for the Post-Dispatch Consolidation Platform, providing authentication, rate limiting, request routing, and real-time communication capabilities.

## Features

### 1. API Gateway with Rate Limiting ✅
- **Authentication**: JWT-based authentication with Firebase Auth support
- **Rate Limiting**: Configurable rate limits (short/medium/long term)
- **API Key Management**: External API access with key-based authentication
- **Request Routing**: Intelligent routing to backend microservices
- **OpenAPI Documentation**: Auto-generated Swagger documentation at `/api/docs`

### 2. Webhook and Notification System ✅
- **Webhook Delivery**: Reliable webhook delivery with retry mechanisms
- **Push Notifications**: Firebase Cloud Messaging integration
- **Dead Letter Queue**: Failed delivery handling and retry management
- **Event Types**: Support for critical events (SLA risks, parcel assignments, etc.)

### 3. Google Maps API Integration ✅
- **Geocoding**: Address to coordinates conversion
- **Reverse Geocoding**: Coordinates to address conversion
- **Route Calculation**: Optimized route planning with traffic awareness
- **ETA Calculation**: Real-time arrival time estimates
- **Traffic Information**: Current traffic conditions and delays

### 4. Real-time WebSocket Support
- **Live Updates**: Real-time vehicle and parcel status updates
- **Role-based Subscriptions**: Channel access based on user roles
- **Connection Management**: Automatic reconnection and authentication

## API Endpoints

### Core Routes
- `GET /api/v1/health` - System health check
- `GET /api/docs` - Swagger API documentation

### Service Proxying
- `/api/v1/decision-engine/*` - Decision Engine Service
- `/api/v1/vehicle-tracking/*` - Vehicle Tracking Service
- `/api/v1/auth/*` - Authentication Service (public)
- `/api/v1/parcels/*` - Parcel Management Service
- `/api/v1/custody/*` - Custody Service
- `/api/v1/analytics/*` - Analytics Service
- `/api/v1/audit/*` - Audit Service
- `/api/v1/external/*` - External API endpoints (API key required)

### Notifications
- `POST /api/v1/notifications/push/send` - Send push notification
- `POST /api/v1/notifications/webhooks` - Register webhook
- `GET /api/v1/notifications/webhooks` - List webhooks

### Maps Integration
- `POST /api/v1/maps/geocode` - Convert address to coordinates
- `POST /api/v1/maps/route/calculate` - Calculate route
- `POST /api/v1/maps/eta/calculate` - Calculate ETA

### API Key Management
- `POST /api/v1/api-keys` - Create API key
- `GET /api/v1/api-keys` - List API keys
- `DELETE /api/v1/api-keys/:key` - Revoke API key

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Authentication
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=1h

# Service URLs
DECISION_ENGINE_URL=http://localhost:3001
VEHICLE_TRACKING_URL=http://localhost:3002
AUTH_SERVICE_URL=http://localhost:3003
PARCEL_MANAGEMENT_URL=http://localhost:3004
CUSTODY_SERVICE_URL=http://localhost:3005
ANALYTICS_SERVICE_URL=http://localhost:3006
AUDIT_SERVICE_URL=http://localhost:3007

# External Services
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Default API Keys (JSON array)
DEFAULT_API_KEYS=[{"key":"pdcp_dev_key_123","name":"Development Key","permissions":["read","write"],"rateLimit":{"requests":1000,"windowMs":3600000},"isActive":true,"createdAt":"2024-01-01T00:00:00.000Z"}]
```

## Rate Limiting Configuration

The API Gateway implements three-tier rate limiting:

- **Short-term**: 10 requests per second
- **Medium-term**: 100 requests per minute  
- **Long-term**: 1000 requests per hour

External API endpoints have separate configurable rate limits per API key.

## WebSocket Events

### Client Events
- `subscribe` - Subscribe to channels
- `unsubscribe` - Unsubscribe from channels

### Server Events
- `connected` - Connection confirmation
- `vehicle:update` - Vehicle status updates
- `parcel:update` - Parcel status updates
- `decision:update` - Decision engine updates
- `sla:alert` - SLA risk alerts
- `system:alert` - System alerts

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm run start:prod
```

## Docker Support

```bash
# Build image
docker build -t pdcp-api-gateway .

# Run container
docker run -p 3000:3000 pdcp-api-gateway
```

## Architecture

The API Gateway follows a modular architecture:

- **ProxyModule**: Request routing and service communication
- **AuthModule**: JWT authentication and authorization
- **ApiKeyModule**: External API key management
- **WebSocketModule**: Real-time communication
- **NotificationsModule**: Push notifications and webhooks
- **MapsModule**: Google Maps API integration
- **HealthModule**: System health monitoring

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin request handling
- **Rate Limiting**: DDoS protection
- **JWT Validation**: Secure authentication
- **API Key Management**: External access control
- **Input Validation**: Request sanitization

## Monitoring

- Health check endpoints for Kubernetes probes
- Comprehensive logging with structured format
- Performance metrics collection
- Error tracking and alerting

## Property-Based Testing

The gateway includes property-based tests for:
- Real-time WebSocket updates consistency
- API status accuracy validation
- Rate limiting enforcement
- Webhook event delivery reliability

Note: Some property-based tests may require additional setup for complex integration scenarios.