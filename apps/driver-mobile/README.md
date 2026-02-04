# PDCP Driver Mobile Application

React Native mobile application for drivers in the Post-Dispatch Consolidation Platform (PDCP).

## Features

- **Authentication**: Secure login with JWT tokens
- **Real-time Location Tracking**: GPS-based location updates every 30 seconds
- **Route Management**: Optimized delivery routes with dynamic updates
- **Delivery Management**: Complete delivery workflow with proof of delivery
- **Offline Support**: Continue operations during poor connectivity
- **Push Notifications**: Real-time updates for new assignments and route changes

## Prerequisites

- Node.js >= 18.0.0
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)
- Firebase project configured

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Install iOS dependencies (iOS only):
```bash
cd ios && pod install
```

## Development

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Start Metro bundler
```bash
npm start
```

## Configuration

### Firebase Setup
1. Create a Firebase project
2. Add Android/iOS apps to the project
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Place configuration files in appropriate directories
5. Configure push notifications

### Google Maps Setup
1. Enable Google Maps SDK for Android/iOS
2. Enable Directions API and Places API
3. Add API key to environment variables

## Architecture

### State Management
- **Redux Toolkit**: Centralized state management
- **Redux Persist**: Offline data persistence
- **AsyncStorage**: Local storage for offline capabilities

### Navigation
- **React Navigation**: Stack and tab navigation
- **Deep Linking**: Handle notification-based navigation

### Services
- **LocationService**: GPS tracking and location updates
- **NotificationService**: Push notification handling
- **OfflineService**: Offline operation and data synchronization

### Key Features Implementation

#### Real-time Location Tracking
- GPS updates every 30 seconds
- Automatic location sharing with backend
- Offline location queuing

#### Offline Support
- Local data persistence
- Action queuing for offline operations
- Automatic synchronization when online

#### Push Notifications
- Firebase Cloud Messaging integration
- Notification handling for different event types
- Background and foreground message processing

## Testing

```bash
npm test
```

## Building

### Android Release
```bash
npm run build:android
```

### iOS Release
```bash
npm run build:ios
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
│   ├── auth/           # Authentication screens
│   ├── route/          # Route management screens
│   ├── delivery/       # Delivery management screens
│   └── profile/        # Profile screens
├── services/           # Business logic services
├── store/              # Redux store and slices
├── types/              # TypeScript type definitions
├── theme/              # UI theme configuration
└── utils/              # Utility functions
```

## Requirements Addressed

- **Requirement 5.3**: Offline operation support with data synchronization
- **Push Notifications**: Firebase Cloud Messaging for real-time updates
- **Location Tracking**: GPS-based tracking with 30-second intervals
- **State Management**: Redux with persistence for offline capabilities