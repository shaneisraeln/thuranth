# Parcel Management Service

## Overview

The Parcel Management Service is a core component of the Post-Dispatch Consolidation Platform (PDCP) that handles the complete lifecycle of parcels from creation to delivery, along with comprehensive SLA monitoring and validation.

## Features Implemented

### 1. Parcel Lifecycle Management (Task 4.1)

#### Core Functionality
- **Parcel Creation**: Create new parcels with comprehensive validation
- **Status Tracking**: Track parcel status through the complete lifecycle
- **Assignment Management**: Assign parcels to vehicles with validation
- **Delivery Completion**: Complete deliveries with location tracking

#### API Endpoints
- `POST /parcels` - Create a new parcel
- `GET /parcels` - Get parcels with pagination and filtering
- `GET /parcels/pending` - Get pending parcels ordered by priority
- `GET /parcels/vehicle/:vehicleId` - Get parcels assigned to a vehicle
- `GET /parcels/:id` - Get parcel by ID
- `GET /parcels/tracking/:trackingNumber` - Get parcel by tracking number
- `PATCH /parcels/:id/status` - Update parcel status
- `PUT /parcels/:id/assign/:vehicleId` - Assign parcel to vehicle
- `PUT /parcels/:id/deliver` - Complete parcel delivery

#### Status Transitions
- `PENDING` → `ASSIGNED` → `IN_TRANSIT` → `DELIVERED`
- `PENDING` → `FAILED` (for failed assignments)
- `ASSIGNED` → `PENDING` (for reassignments)
- `IN_TRANSIT` → `FAILED` (for delivery failures)
- `FAILED` → `PENDING` (for retries)

### 2. SLA Monitoring and Validation (Task 4.2)

#### Core Functionality
- **SLA Deadline Calculation**: Calculate deadlines based on service levels
- **SLA Validation**: Validate assignments against SLA requirements
- **Risk Detection**: Identify parcels at risk of SLA violations
- **Delivery Time Impact**: Calculate impact of route changes
- **Compliance Reporting**: Generate SLA compliance reports

#### API Endpoints
- `POST /sla/validate` - Validate SLA compliance for parcel assignment
- `POST /sla/delivery-impact` - Calculate delivery time impact
- `GET /sla/at-risk` - Get parcels at risk of SLA violation
- `GET /sla/compliance-report` - Generate SLA compliance report
- `POST /sla/calculate-deadline` - Calculate SLA deadline
- `GET /sla/parcel/:id/risk-assessment` - Get risk assessment for parcel

#### Service Levels
- **STANDARD**: Next day by 6 PM
- **EXPRESS**: 4 hours from pickup
- **SAME_DAY**: End of same day (11:59 PM)

#### Risk Levels
- **LOW**: Adequate safety margin
- **MEDIUM**: Limited safety margin
- **HIGH**: Very tight delivery window
- **CRITICAL**: Estimated delivery exceeds deadline

## Data Models

### Parcel Entity
```typescript
interface Parcel {
  id: string;
  trackingNumber: string;
  sender: ContactInfo;
  recipient: ContactInfo;
  pickupLocation: GeoCoordinate;
  deliveryLocation: GeoCoordinate;
  slaDeadline: Date;
  weight: number;
  dimensions: Dimensions;
  value: number;
  priority: Priority;
  status: ParcelStatus;
  assignedVehicleId?: string;
  assignedAt?: Date;
  custodyChain: CustodyRecord[];
  createdAt: Date;
  updatedAt: Date;
}
```

### SLA Validation Result
```typescript
interface SLAValidationResult {
  isValid: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeToDeadline: number; // minutes
  estimatedDeliveryTime: number; // minutes
  safetyMargin: number; // minutes
  riskFactors: string[];
}
```

## Requirements Satisfied

### Requirement 1.1 (Post-Dispatch Decision Engine)
- ✅ Parcel evaluation and assignment logic
- ✅ Status tracking for decision execution

### Requirement 5.4 (Driver Mobile Application)
- ✅ Delivery completion workflow
- ✅ Status update triggers

### Requirement 6.1 (SLA Safety and Compliance)
- ✅ Delivery time impact calculation including route deviation

### Requirement 6.2 (SLA Safety and Compliance)
- ✅ SLA safety margin enforcement
- ✅ Assignment rejection for SLA violations

### Requirement 6.3 (SLA Safety and Compliance)
- ✅ SLA risk detection and alerting
- ✅ Risk assessment with detailed factors

### Requirement 6.4 (SLA Safety and Compliance)
- ✅ SLA adherence metrics
- ✅ Compliance report generation

## Testing

### Unit Tests
- `parcel.service.spec.ts` - Tests for parcel lifecycle management
- `sla.service.spec.ts` - Tests for SLA monitoring and validation

### Integration Tests
- `integration.test.ts` - End-to-end workflow testing
- Complete parcel lifecycle validation
- SLA risk detection scenarios
- Compliance reporting verification

## Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Service port (default: 3000)

### Safety Margins
- Default safety margin: 60 minutes
- Traffic buffer multiplier: 1.3 (30% buffer)
- Average delivery speed: 25 km/h
- Pickup time: 15 minutes
- Delivery time: 10 minutes

## Usage Examples

### Create a Parcel
```typescript
const parcel = await parcelService.createParcel({
  trackingNumber: 'PDCP-001',
  sender: { /* sender info */ },
  recipient: { /* recipient info */ },
  pickupLocation: { latitude: 19.0760, longitude: 72.8777 },
  deliveryLocation: { latitude: 28.6139, longitude: 77.2090 },
  slaDeadline: '2024-12-31T18:00:00Z',
  weight: 2.5,
  dimensions: { length: 30, width: 20, height: 15 },
  value: 1000,
  priority: 'HIGH'
});
```

### Validate SLA
```typescript
const validation = await slaService.validateSLA(
  parcelId,
  currentLocation,
  estimatedDistance,
  safetyMarginMinutes
);

if (!validation.isValid) {
  console.log('SLA violation risk:', validation.riskLevel);
  console.log('Risk factors:', validation.riskFactors);
}
```

### Get At-Risk Parcels
```typescript
const atRiskParcels = await slaService.getAtRiskParcels(120); // 2-hour threshold
atRiskParcels.forEach(alert => {
  console.log(`Parcel ${alert.trackingNumber} at ${alert.riskLevel} risk`);
  console.log('Recommended actions:', alert.recommendedActions);
});
```

## Next Steps

1. **Integration with Decision Engine**: Connect parcel assignments with decision engine
2. **Real-time Updates**: Implement WebSocket notifications for status changes
3. **Route Optimization**: Integrate with Google Maps API for accurate routing
4. **Blockchain Integration**: Connect with custody service for tamper-proof records
5. **Performance Optimization**: Add caching and database query optimization

## Architecture

The service follows NestJS architecture patterns:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and data operations
- **Entities**: Define database schema and relationships
- **DTOs**: Validate input data and define API contracts

The service integrates with:
- PostgreSQL for persistent data storage
- Redis for caching and session management
- External APIs for routing and geocoding (future)
- Blockchain networks for custody tracking (future)