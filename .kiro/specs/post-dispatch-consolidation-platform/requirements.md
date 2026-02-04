# Requirements Document

## Introduction

The Post-Dispatch Consolidation Platform (PDCP) is a B2B SaaS platform for last-mile logistics operations in India that reduces cost and carbon emissions by conservatively absorbing late demand into vehicles already on the road. The system uses a blockchain-backed custody ledger to ensure trust and accountability between logistics partners.

## Glossary

- **PDCP**: Post-Dispatch Consolidation Platform - the complete system
- **Decision_Engine**: Core algorithm that evaluates late/overflow parcels against vehicles already on road
- **Dispatcher**: Operations personnel who manage vehicle assignments and routes
- **Driver**: Personnel operating delivery vehicles (2W or 4W)
- **Parcel**: Individual package/shipment requiring delivery
- **Vehicle**: Delivery vehicle (2-wheeler or 4-wheeler) with capacity constraints
- **SLA**: Service Level Agreement - delivery time commitments
- **Custody_Ledger**: Blockchain-based tamper-proof record of parcel custody transfers
- **Shadow_Mode**: Pilot testing mode where decisions are logged but not executed
- **Hard_Constraint**: Non-negotiable requirement (capacity, SLA safety) that cannot be violated
- **Soft_Constraint**: Preference that can be compromised for optimization
- **Eligibility_Model**: Trust system based on operational criteria rather than ratings
- **Manual_Override**: Human decision to bypass automated recommendations with audit trail

## Requirements

### Requirement 1: Post-Dispatch Decision Engine

**User Story:** As a logistics coordinator, I want the system to automatically evaluate late/overflow parcels against vehicles already on road, so that I can reduce vehicle dispatches and operational costs.

#### Acceptance Criteria

1. WHEN a late or overflow parcel is received, THE Decision_Engine SHALL evaluate it against all eligible vehicles currently on road
2. WHEN evaluating parcel assignments, THE Decision_Engine SHALL enforce hard constraints for vehicle capacity and SLA safety margins
3. WHEN multiple vehicles are eligible, THE Decision_Engine SHALL rank them using weighted scoring based on route efficiency, capacity utilization, and delivery time impact
4. WHEN no eligible vehicles exist, THE Decision_Engine SHALL recommend new vehicle dispatch
5. WHERE shadow mode is enabled, THE Decision_Engine SHALL log all decisions without executing assignments

### Requirement 2: Real-Time Vehicle Tracking and Capacity Management

**User Story:** As a dispatcher, I want to track vehicle locations and capacity in real-time, so that I can make informed consolidation decisions.

#### Acceptance Criteria

1. THE Vehicle_Tracker SHALL update vehicle locations every 30 seconds using GPS coordinates
2. WHEN a parcel is assigned to a vehicle, THE Capacity_Manager SHALL update available capacity immediately
3. WHEN a delivery is completed, THE Capacity_Manager SHALL recalculate available capacity based on remaining parcels
4. THE System SHALL distinguish between 2-wheeler and 4-wheeler vehicles with different capacity models
5. WHEN vehicle capacity reaches 90% threshold, THE System SHALL flag the vehicle as near-full

### Requirement 3: Blockchain Custody Tracking

**User Story:** As a logistics partner, I want tamper-proof custody records, so that I can ensure accountability and trust in parcel handling.

#### Acceptance Criteria

1. WHEN a parcel custody transfer occurs, THE Custody_Ledger SHALL record the transfer with timestamp, parties, and digital signatures
2. THE Custody_Ledger SHALL be immutable and cryptographically verifiable
3. WHEN queried, THE Custody_Ledger SHALL provide complete custody chain for any parcel
4. THE System SHALL support both Hyperledger Fabric and Polygon Edge blockchain implementations
5. WHEN blockchain is unavailable, THE System SHALL queue custody records for later synchronization

### Requirement 4: Dispatcher Dashboard Operations

**User Story:** As a dispatcher, I want a comprehensive dashboard with live operations map, so that I can monitor and manage consolidation activities.

#### Acceptance Criteria

1. THE Dashboard SHALL display real-time vehicle locations on an interactive map using Google Maps API
2. WHEN parcels are pending assignment, THE Dashboard SHALL show them in a prioritized queue
3. THE Dashboard SHALL provide manual override capabilities with mandatory justification fields
4. WHEN decisions are made, THE Dashboard SHALL display decision explanations and scoring details
5. THE Dashboard SHALL show live metrics including vehicles avoided, utilization rates, and emissions saved

### Requirement 5: Driver Mobile Application

**User Story:** As a driver, I want a mobile app to manage my route and parcel assignments, so that I can efficiently complete deliveries.

#### Acceptance Criteria

1. THE Driver_App SHALL display current route with optimized delivery sequence
2. WHEN new parcels are assigned, THE Driver_App SHALL update the route and notify the driver
3. THE Driver_App SHALL support offline operation for areas with poor connectivity
4. WHEN a delivery is completed, THE Driver_App SHALL update parcel status and trigger capacity recalculation
5. THE Driver_App SHALL provide navigation integration with Google Maps

### Requirement 6: SLA Safety and Compliance

**User Story:** As a logistics manager, I want SLA safety checks, so that consolidation decisions don't compromise delivery commitments.

#### Acceptance Criteria

1. WHEN evaluating parcel assignments, THE System SHALL calculate delivery time impact including route deviation
2. THE System SHALL reject assignments that would cause SLA violations with configured safety margins
3. WHEN SLA risk is detected, THE System SHALL alert dispatchers with risk assessment details
4. THE System SHALL maintain SLA adherence metrics and generate compliance reports
5. WHERE manual overrides bypass SLA safety, THE System SHALL require additional authorization levels

### Requirement 7: Audit Logging and Explainability

**User Story:** As a compliance officer, I want comprehensive audit logs with decision explanations, so that I can ensure operational transparency and accountability.

#### Acceptance Criteria

1. THE Audit_Logger SHALL record all decision engine evaluations with input parameters and scoring details
2. WHEN manual overrides occur, THE Audit_Logger SHALL capture justification, user identity, and timestamp
3. THE System SHALL provide decision explanations showing why specific assignments were recommended or rejected
4. THE Audit_Logger SHALL maintain immutable logs with cryptographic integrity verification
5. WHEN queried, THE System SHALL generate audit reports for specified time periods and operations

### Requirement 8: Impact Measurement and Analytics

**User Story:** As a business analyst, I want to measure consolidation impact, so that I can quantify cost savings and environmental benefits.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL track primary metrics including vehicle dispatches avoided and utilization improvement
2. THE Analytics_Engine SHALL calculate secondary metrics including fuel savings, emissions per parcel, and SLA adherence rates
3. WHEN consolidation occurs, THE System SHALL estimate carbon emissions saved based on vehicle type and distance
4. THE System SHALL generate periodic impact reports with trend analysis and benchmarking
5. THE Analytics_Engine SHALL support custom metric definitions and reporting periods

### Requirement 9: Authentication and Authorization

**User Story:** As a system administrator, I want secure authentication and role-based access control, so that I can ensure system security and proper access management.

#### Acceptance Criteria

1. THE Auth_System SHALL support Firebase Auth or Auth0 for user authentication
2. THE System SHALL implement role-based access control with dispatcher, driver, and admin roles
3. WHEN users access sensitive operations, THE System SHALL require additional authentication factors
4. THE Auth_System SHALL maintain session security with automatic timeout and refresh mechanisms
5. WHEN authorization fails, THE System SHALL log security events and alert administrators

### Requirement 10: System Integration and APIs

**User Story:** As a system integrator, I want well-defined APIs, so that I can integrate PDCP with existing logistics systems.

#### Acceptance Criteria

1. THE API_Gateway SHALL provide RESTful APIs for all core operations with OpenAPI documentation
2. THE System SHALL support WebSocket connections for real-time updates to connected clients
3. WHEN external systems query parcel status, THE API SHALL provide real-time information from the custody ledger
4. THE System SHALL implement rate limiting and API key management for external integrations
5. THE API SHALL support webhook notifications for critical events like SLA risks and custody transfers