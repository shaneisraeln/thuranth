# PDCP Dispatcher Dashboard

A React-based web dashboard for the Post-Dispatch Consolidation Platform (PDCP) that provides real-time operations management for logistics dispatchers.

## Features

### Core Dashboard Features
- **Real-time Vehicle Tracking**: Interactive Google Maps integration showing live vehicle locations and status
- **Parcel Queue Management**: Prioritized queue of pending parcels with SLA monitoring
- **Live Metrics Overview**: Key performance indicators including vehicles avoided, utilization rates, and emissions saved
- **Manual Override System**: Comprehensive override interface with mandatory justification and risk acknowledgment
- **Decision Analysis**: Detailed visualization of automated consolidation decisions with scoring breakdowns

### Analytics & Reporting
- **Live Metrics Dashboard**: Real-time charts and graphs showing system performance
- **Impact Reporting**: Environmental, operational, and financial impact analysis
- **Decision History**: Historical view of all consolidation decisions with filtering and analysis
- **Trend Analysis**: Performance trends and benchmarking over time

### Real-time Features
- **WebSocket Integration**: Live updates for vehicle locations, parcel assignments, and system alerts
- **Notification System**: Real-time alerts for SLA risks, system events, and operational updates
- **Auto-refresh**: Automatic data synchronization with backend services

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: Google Maps API
- **Real-time**: Socket.IO Client
- **Build Tool**: Vite
- **HTTP Client**: Axios

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── GoogleMap.tsx   # Google Maps integration
│   ├── Layout.tsx      # Main layout wrapper
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── Header.tsx      # Top header bar
│   ├── VehicleList.tsx # Vehicle listing component
│   ├── ParcelQueue.tsx # Parcel queue component
│   ├── MetricsOverview.tsx # KPI metrics display
│   ├── ManualOverrideModal.tsx # Override interface
│   ├── DecisionModal.tsx # Decision analysis modal
│   ├── DecisionVisualization.tsx # Decision charts
│   ├── LiveMetricsDashboard.tsx # Real-time metrics
│   ├── ImpactReporting.tsx # Impact analysis
│   └── NotificationContainer.tsx # Alert system
├── pages/              # Route components
│   ├── Dashboard.tsx   # Main operations dashboard
│   ├── Analytics.tsx   # Analytics and reporting
│   ├── DecisionHistory.tsx # Decision history view
│   ├── VehicleManagement.tsx # Vehicle management
│   └── ParcelManagement.tsx # Parcel management
├── store/              # Redux store configuration
│   ├── index.ts        # Store setup
│   └── slices/         # Redux slices
│       ├── vehicleSlice.ts
│       ├── parcelSlice.ts
│       ├── decisionSlice.ts
│       ├── metricsSlice.ts
│       └── uiSlice.ts
├── services/           # API and external services
│   ├── api.ts          # HTTP API client
│   └── websocket.ts    # WebSocket service
├── types/              # TypeScript type definitions
│   └── index.ts
└── styles/             # Global styles
    └── globals.css
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 8+
- Google Maps API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_WEBSOCKET_URL=http://localhost:3000
```

3. Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### Building for Production

```bash
npm run build
```

## Configuration

### Environment Variables
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key for map functionality
- `VITE_WEBSOCKET_URL`: WebSocket server URL for real-time updates

### Google Maps Setup
1. Enable Google Maps JavaScript API in Google Cloud Console
2. Enable Places API for location search
3. Add your domain to API key restrictions
4. Set the API key in environment variables

## Key Components

### Dashboard Layout
The main dashboard provides a three-panel layout:
- **Left Panel**: Active vehicles list with real-time status
- **Center Panel**: Interactive Google Maps with vehicle and parcel markers
- **Right Panel**: Prioritized parcel queue with action buttons

### Manual Override System
Comprehensive override interface featuring:
- Parcel details display
- Vehicle selection dropdown
- Mandatory reason selection
- Detailed justification text area
- Risk acknowledgment checkbox
- Audit trail logging

### Decision Analysis
Advanced decision visualization including:
- Constraint analysis (hard and soft constraints)
- Scoring factor breakdown with radar charts
- Risk assessment display
- Alternative options comparison
- Historical decision tracking

### Real-time Updates
WebSocket integration provides:
- Live vehicle location updates
- Parcel assignment notifications
- System alerts and warnings
- Metrics updates
- Decision notifications

## API Integration

The dashboard integrates with the PDCP backend services:

### Vehicle API
- `GET /vehicles` - Fetch all vehicles
- `PATCH /vehicles/:id/location` - Update vehicle location

### Parcel API
- `GET /parcels` - Fetch all parcels
- `GET /parcels/pending` - Fetch pending parcels
- `POST /parcels/:id/assign` - Assign parcel to vehicle

### Decision API
- `GET /decisions` - Fetch decision history
- `POST /decisions/evaluate` - Request decision for parcel
- `POST /decisions/override` - Submit manual override

### Analytics API
- `GET /analytics/metrics/current` - Current metrics
- `GET /analytics/metrics/historical` - Historical metrics
- `GET /analytics/reports/impact` - Impact reports

## Testing

The dashboard includes comprehensive testing for:
- Component rendering and interactions
- Redux state management
- API integration
- Real-time updates
- User workflows

Run tests:
```bash
npm test
```

## Performance Considerations

- **Lazy Loading**: Route-based code splitting
- **Memoization**: React.memo for expensive components
- **Virtual Scrolling**: For large lists (vehicles, parcels)
- **Debounced Updates**: Rate-limited API calls
- **Optimistic Updates**: Immediate UI feedback

## Security Features

- **Authentication**: JWT token-based authentication
- **Authorization**: Role-based access control
- **Input Validation**: Client-side validation with server verification
- **XSS Protection**: Sanitized user inputs
- **CSRF Protection**: Token-based request validation

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Include unit tests for new components
4. Update documentation for new features
5. Test real-time functionality thoroughly

## License

This project is part of the PDCP system and follows the same licensing terms.